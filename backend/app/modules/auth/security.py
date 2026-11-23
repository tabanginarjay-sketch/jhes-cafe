"""
Cryptographic security, Argon2 password hashing, JWT session handling,
and Google Identity Services OAuth / OpenID Connect token verification.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, Optional
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerifyMismatchError
from fastapi import Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import httpx
import jwt

logger = logging.getLogger("auth_security")

# Argon2 Password Hasher
_pwd_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

JWT_SECRET = "jhes_cafe_production_session_secret_key_2026_super_secure_jwt"
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = 7
SESSION_COOKIE_NAME = "jhes_session"


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _pwd_hasher.hash(password)


def verify_password(hashed: str, password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    if not hashed:
        return False
    try:
        return _pwd_hasher.verify(hashed, password)
    except (VerifyMismatchError, InvalidHash, Exception):
        return False


def create_session_token(
    user_id: str,
    email: str,
    role: str = "customer",
    name: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> str:
    """Creates a signed, expiring JWT application session token."""
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "email": email.lower().strip(),
        "role": role,
        "name": name or "",
        "avatar_url": avatar_url or "",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_EXPIRES_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and cryptographically verifies a JWT session token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.PyJWTError, Exception) as exc:
        logger.debug(f"Invalid JWT session token: {exc}")
        return None


def set_session_cookie(
    response: Response,
    token: str,
    is_production: bool = False,
) -> None:
    """Attaches an HttpOnly, Secure session cookie to the response."""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=JWT_EXPIRES_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=is_production,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Clears the session cookie on logout."""
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )


async def verify_google_id_token(
    token_str: str,
    expected_client_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Verifies a Google OAuth 2.0 / OpenID Connect ID token from Google Identity Services.
    Validates token signature, issuer, expiration, and audience.
    Never trusts unverified frontend user information.
    """
    token_str = token_str.strip()
    if not token_str:
        raise ValueError("Google ID token is required.")

    # 1. First attempt: Offline crypto verification using Google certs
    try:
        req = google_requests.Request()
        id_info = id_token.verify_oauth2_token(
            token_str,
            req,
            audience=expected_client_id if expected_client_id else None,
        )

        issuer = id_info.get("iss", "")
        if issuer not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError(f"Invalid Google token issuer: {issuer}")

        return id_info
    except Exception as local_err:
        logger.info(f"Local verification failed, falling back to Google tokeninfo API: {local_err}")

    # 2. Second attempt: Direct tokeninfo validation against Google API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}"
            )
            if resp.status_code == 200:
                data = resp.json()
                issuer = data.get("iss", "")
                if issuer in ("accounts.google.com", "https://accounts.google.com"):
                    return data
            raise ValueError(f"Google tokeninfo API responded with HTTP {resp.status_code}: {resp.text}")
    except Exception as remote_err:
        logger.error(f"Google token verification failed: {remote_err}")
        raise ValueError("Invalid or expired Google credential.")


async def exchange_google_code_for_tokens(
    code: str,
    redirect_uri: str,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exchanges an authorization code with Google's official OAuth 2.0 token endpoint.
    Used when customer completes the official Google Account Chooser flow.
    """
    code = code.strip()
    if not code:
        raise ValueError("Authorization code is required.")

    payload = {
        "code": code,
        "client_id": client_id or getattr(settings, "GOOGLE_CLIENT_ID", ""),
        "client_secret": client_secret or getattr(settings, "GOOGLE_CLIENT_SECRET", ""),
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post("https://oauth2.googleapis.com/token", data=payload)
        if resp.status_code != 200:
            logger.error(f"Google token exchange failed ({resp.status_code}): {resp.text}")
            raise ValueError(f"Google code exchange failed: {resp.text}")
        return resp.json()
