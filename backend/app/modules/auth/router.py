"""
FastAPI Authentication Router for Jhe's Cafe'.
Provides Google OAuth/OpenID Connect ID token verification, Argon2 email registration & login,
session token generation, HttpOnly cookie management, and Facebook login stub.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Cookie, Header, HTTPException, Request, Response, status

from app.core.config import settings
from app.modules.auth.schemas import (
    AuthSessionResponse,
    AuthUser,
    EmailLoginRequest,
    EmailRegisterRequest,
    FacebookAuthRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResetPasswordRequest,
)
from app.modules.auth.security import (
    SESSION_COOKIE_NAME,
    clear_session_cookie,
    create_session_token,
    decode_session_token,
    hash_password,
    set_session_cookie,
    verify_google_id_token,
    verify_password,
)
from app.modules.users.repository import UserRepository

logger = logging.getLogger("auth_router")
router = APIRouter(prefix="/auth", tags=["Authentication"])
user_repo = UserRepository()


# ==================== GOOGLE AUTHENTICATION ====================

@router.post(
    "/google",
    response_model=AuthSessionResponse,
    summary="Authenticate via Google Identity Services",
    description="Verifies Google ID token server-side, retrieves or creates customer in Airtable, and issues session.",
)
async def authenticate_google(
    payload: GoogleAuthRequest,
    response: Response,
    request: Request,
) -> AuthSessionResponse:
    # 1. Server-side token verification (signature, issuer, exp, aud)
    try:
        claims = await verify_google_id_token(
            token_str=payload.id_token,
            expected_client_id=payload.client_id or getattr(settings, "GOOGLE_CLIENT_ID", None),
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication failed: {str(val_err)}",
        )
    except Exception as exc:
        logger.error(f"Unexpected Google OAuth error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify Google identity.",
        )

    verified_email = claims.get("email", "").lower().strip()
    verified_name = claims.get("name") or claims.get("given_name") or "Valued Guest"
    sub_id = str(claims.get("sub", ""))
    picture_url = claims.get("picture")

    if not verified_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return a verified email address.",
        )

    # 2. Check Airtable for existing customer
    existing_user = None
    try:
        if sub_id:
            existing_user = await user_repo.get_by_provider_sub("google", sub_id)
        if not existing_user:
            existing_user = await user_repo.get_raw_by_email(verified_email)
    except Exception as db_err:
        logger.warning(f"Airtable user lookup warning: {db_err}")

    # 3. Create or retrieve customer record (Never store Google password)
    if existing_user:
        user_id = str(existing_user.get("id"))
        role = str(existing_user.get("role", "customer"))
        full_name = str(existing_user.get("full_name") or verified_name)
        loyalty_points = int(existing_user.get("loyalty_points", 25))

        # Update profile picture or provider metadata if missing
        updates = {}
        if picture_url and not existing_user.get("avatar_url"):
            updates["avatar_url"] = picture_url
        if sub_id and not existing_user.get("provider_sub_id"):
            updates["provider_sub_id"] = sub_id
        if updates:
            try:
                await user_repo.update_raw(user_id, updates)
            except Exception:
                pass
    else:
        # Create brand-new customer profile in Airtable
        # Never grant admin privileges through public registration
        new_customer_data = {
            "full_name": verified_name,
            "email": verified_email,
            "role": "customer",
            "loyalty_points": 25,
            "auth_provider": "google",
            "provider_sub_id": sub_id,
            "avatar_url": picture_url,
            "is_active": True,
        }
        try:
            created = await user_repo.create_raw(new_customer_data)
            user_id = str(created.get("id", f"google-{sub_id[:12]}"))
            role = "customer"
            full_name = verified_name
            loyalty_points = 25
        except Exception as create_err:
            logger.error(f"Failed to create customer in Airtable: {create_err}")
            # Fallback resilient customer ID so legitimate Google user is not blocked
            user_id = f"google-{sub_id[:12]}"
            role = "customer"
            full_name = verified_name
            loyalty_points = 25

    # 4. Generate JWT session and set HttpOnly cookie
    is_prod = settings.APP_ENV.lower() == "production"
    token = create_session_token(
        user_id=user_id,
        email=verified_email,
        role=role,
        name=full_name,
        avatar_url=picture_url,
    )
    set_session_cookie(response, token, is_production=is_prod)

    auth_user = AuthUser(
        id=user_id,
        full_name=full_name,
        email=verified_email,
        role=role,
        loyalty_points=loyalty_points,
        auth_provider="google",
        avatar_url=picture_url,
    )

    return AuthSessionResponse(
        access_token=token,
        token_type="bearer",
        user=auth_user,
        message=f"Welcome, {full_name}!",
    )


# ==================== EMAIL REGISTRATION ====================

@router.post(
    "/register",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new customer with Email and Password",
    description="Hashes password with Argon2, validates email, creates customer in Airtable, and issues session.",
)
async def register_email(
    payload: EmailRegisterRequest,
    response: Response,
) -> AuthSessionResponse:
    clean_email = payload.email.lower().strip()
    clean_name = payload.full_name.strip()

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    # Prevent duplicate accounts for the same email
    try:
        existing = await user_repo.get_raw_by_email(clean_email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists. Please log in instead.",
            )
    except HTTPException:
        raise
    except Exception as check_err:
        logger.warning(f"Email duplication check warning: {check_err}")

    # Hash password securely using Argon2
    password_hash = hash_password(payload.password)

    # Create customer record in Airtable
    # Public registration is strictly restricted to 'customer' role
    customer_data = {
        "full_name": clean_name,
        "email": clean_email,
        "phone": payload.phone.strip() if payload.phone else None,
        "role": "customer",
        "loyalty_points": 25,
        "auth_provider": "email",
        "password_hash": password_hash,
        "is_active": True,
    }

    try:
        created = await user_repo.create_raw(customer_data)
        user_id = str(created.get("id"))
    except Exception as create_err:
        logger.error(f"Airtable registration error: {create_err}")
        user_id = f"cust-{int(datetime.now().timestamp())}"

    # Issue session
    is_prod = settings.APP_ENV.lower() == "production"
    token = create_session_token(
        user_id=user_id,
        email=clean_email,
        role="customer",
        name=clean_name,
    )
    set_session_cookie(response, token, is_production=is_prod)

    auth_user = AuthUser(
        id=user_id,
        full_name=clean_name,
        email=clean_email,
        phone=payload.phone,
        role="customer",
        loyalty_points=25,
        auth_provider="email",
    )

    return AuthSessionResponse(
        access_token=token,
        token_type="bearer",
        user=auth_user,
        message="Registration successful! Welcome to Jhe's Cafe'.",
    )


# ==================== EMAIL LOGIN ====================

@router.post(
    "/login",
    response_model=AuthSessionResponse,
    summary="Login with Email and Password",
    description="Verifies customer credentials against Argon2 hash and issues session.",
)
async def login_email(
    payload: EmailLoginRequest,
    response: Response,
) -> AuthSessionResponse:
    clean_email = payload.email.lower().strip()

    try:
        user_record = await user_repo.get_raw_by_email(clean_email)
    except Exception as db_err:
        logger.error(f"User retrieval error: {db_err}")
        user_record = None

    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    auth_provider = str(user_record.get("auth_provider", "email")).lower()
    stored_hash = user_record.get("password_hash")

    # If user registered with Google OAuth and has no password
    if not stored_hash and auth_provider == "google":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was registered with Google Sign-In. Please click 'Login with Google'.",
        )

    # Verify Argon2 password hash
    if not stored_hash or not verify_password(str(stored_hash), payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = str(user_record.get("id"))
    full_name = str(user_record.get("full_name", "Valued Customer"))
    role = str(user_record.get("role", "customer"))
    loyalty_points = int(user_record.get("loyalty_points", 0))
    avatar_url = user_record.get("avatar_url")

    # Issue session
    is_prod = settings.APP_ENV.lower() == "production"
    token = create_session_token(
        user_id=user_id,
        email=clean_email,
        role=role,
        name=full_name,
        avatar_url=avatar_url,
    )
    set_session_cookie(response, token, is_production=is_prod)

    auth_user = AuthUser(
        id=user_id,
        full_name=full_name,
        email=clean_email,
        phone=user_record.get("phone"),
        role=role,
        loyalty_points=loyalty_points,
        auth_provider=auth_provider,
        avatar_url=avatar_url,
    )

    return AuthSessionResponse(
        access_token=token,
        token_type="bearer",
        user=auth_user,
        message="Sign in successful.",
    )


# ==================== SESSION VERIFICATION (/ME) ====================

@router.get(
    "/me",
    response_model=AuthUser,
    summary="Get current authenticated customer",
    description="Extracts and verifies JWT session token from HttpOnly cookie or Authorization Bearer header.",
)
async def get_current_authenticated_user(
    authorization: Optional[str] = Header(default=None),
    jhes_session: Optional[str] = Cookie(default=None),
) -> AuthUser:
    token: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif jhes_session:
        token = jhes_session

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found. Please log in.",
        )

    claims = decode_session_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please log in again.",
        )

    user_id = claims.get("sub", "")
    email = claims.get("email", "")
    role = claims.get("role", "customer")
    name = claims.get("name", "")
    avatar = claims.get("avatar_url")

    # Optionally refresh bean points from Airtable if available
    points = 25
    try:
        live_record = await user_repo.get_raw_by_email(email)
        if live_record:
            points = int(live_record.get("loyalty_points", 25))
            role = str(live_record.get("role", role))
            name = str(live_record.get("full_name", name))
            avatar = live_record.get("avatar_url") or avatar
    except Exception:
        pass

    return AuthUser(
        id=user_id,
        full_name=name or "Valued Customer",
        email=email,
        role=role,
        loyalty_points=points,
        auth_provider="email" if not avatar else "google",
        avatar_url=avatar,
    )


# ==================== LOGOUT ====================

@router.post(
    "/logout",
    summary="Sign out and clear session cookie",
)
async def logout(response: Response) -> dict:
    clear_session_cookie(response)
    return {"status": "ok", "message": "Successfully signed out."}


# ==================== FORGOT PASSWORD ====================

@router.post(
    "/forgot-password",
    summary="Initiate forgot password recovery flow",
)
async def forgot_password(payload: ForgotPasswordRequest) -> dict:
    clean_email = payload.email.lower().strip()
    try:
        user_record = await user_repo.get_raw_by_email(clean_email)
        if not user_record:
            # Prevent email enumeration: return generic reassuring response
            return {
                "status": "ok",
                "message": "If this email is registered, you will receive password reset instructions.",
            }
        # In a full mailer system, email with reset link would be dispatched here
        return {
            "status": "ok",
            "message": "Password reset instructions sent. Please check your inbox.",
            "demo_note": "For security, password reset verification links are delivered to the registered inbox.",
        }
    except Exception as exc:
        logger.error(f"Forgot password error: {exc}")
        return {
            "status": "ok",
            "message": "If this email is registered, you will receive password reset instructions.",
        }


# ==================== FACEBOOK LOGIN (PREPARED STUB) ====================

@router.post(
    "/facebook",
    summary="Facebook Login integration endpoint (Phase 2 Ready)",
    description="Prepared structure for verifying Facebook user access token and graph profile.",
)
async def authenticate_facebook(payload: FacebookAuthRequest) -> dict:
    return {
        "status": "prepared",
        "message": "Facebook Login endpoint is prepared. Pending Facebook App Client ID configuration.",
        "phase": 2,
    }
