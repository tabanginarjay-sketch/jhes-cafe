"""
Unit & Integration Tests for Jhe's Cafe' Authentication & Security System.
Tests Argon2 password hashing, JWT sessions, HttpOnly cookies, Google verification, and auth routes.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.modules.auth.security import (
    create_session_token,
    decode_session_token,
    hash_password,
    verify_password,
)


@pytest.mark.asyncio
async def test_argon2_password_hashing():
    """Verify that password hashing uses secure Argon2id and validates correctly."""
    pw = "SecretCoffee2026!"
    hashed = hash_password(pw)
    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, pw) is True
    assert verify_password(hashed, "WrongPassword") is False
    assert verify_password("", pw) is False


@pytest.mark.asyncio
async def test_jwt_session_lifecycle():
    """Verify that JWT session tokens are created, signed, and validated."""
    token = create_session_token(
        user_id="recTestUser123",
        email="guest@jhescafe.ph",
        role="customer",
        name="Guest Customer",
    )
    claims = decode_session_token(token)
    assert claims is not None
    assert claims["sub"] == "recTestUser123"
    assert claims["email"] == "guest@jhescafe.ph"
    assert claims["role"] == "customer"
    assert claims["name"] == "Guest Customer"

    # Test invalid token
    assert decode_session_token("invalid.jwt.token") is None


@pytest.mark.asyncio
async def test_email_register_and_login_flow():
    """Test full customer registration and login with Argon2 and HttpOnly session cookie."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Mock Airtable calls to be independent of network
        with patch("app.modules.auth.router.user_repo.get_raw_by_email", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.auth.router.user_repo.create_raw", new_callable=AsyncMock) as mock_create:

            # 1. Registration - New user
            mock_get.return_value = None
            mock_create.return_value = {
                "id": "recNewCust001",
                "fields": {
                    "full_name": "Clara Reyes",
                    "email": "clara@example.com",
                    "role": "customer",
                    "loyalty_points": 25,
                    "auth_provider": "email",
                },
                "createdTime": "2026-11-23T12:00:00Z",
            }

            reg_resp = await ac.post(
                "/api/v1/auth/register",
                json={
                    "full_name": "Clara Reyes",
                    "email": "clara@example.com",
                    "password": "ArtisanBrew2026!",
                    "phone": "+639171234567",
                },
            )

            assert reg_resp.status_code == 201
            data = reg_resp.json()
            assert data["user"]["email"] == "clara@example.com"
            assert data["user"]["role"] == "customer"
            assert data["user"]["loyalty_points"] == 25
            assert "jhes_session" in reg_resp.cookies

            # 2. Duplicate registration protection
            mock_get.return_value = {"id": "recNewCust001", "email": "clara@example.com"}
            dup_resp = await ac.post(
                "/api/v1/auth/register",
                json={
                    "full_name": "Clara Reyes",
                    "email": "clara@example.com",
                    "password": "AnotherPassword",
                },
            )
            assert dup_resp.status_code == 409

            # 3. Successful Login
            hashed_pw = hash_password("ArtisanBrew2026!")
            mock_get.return_value = {
                "id": "recNewCust001",
                "full_name": "Clara Reyes",
                "email": "clara@example.com",
                "role": "customer",
                "loyalty_points": 25,
                "auth_provider": "email",
                "password_hash": hashed_pw,
            }

            login_resp = await ac.post(
                "/api/v1/auth/login",
                json={
                    "email": "clara@example.com",
                    "password": "ArtisanBrew2026!",
                },
            )
            assert login_resp.status_code == 200
            token = login_resp.json()["access_token"]
            assert "jhes_session" in login_resp.cookies

            # 4. Failed Login - Wrong Password
            bad_login = await ac.post(
                "/api/v1/auth/login",
                json={
                    "email": "clara@example.com",
                    "password": "WrongPassword123",
                },
            )
            assert bad_login.status_code == 401

            # 5. Session Verification /me with Bearer Token
            me_resp = await ac.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert me_resp.status_code == 200
            assert me_resp.json()["email"] == "clara@example.com"

            # 6. Session Verification /me with Cookie
            cookie_val = login_resp.cookies["jhes_session"]
            me_cookie_resp = await ac.get(
                "/api/v1/auth/me",
                cookies={"jhes_session": cookie_val},
            )
            assert me_cookie_resp.status_code == 200

            # 7. Logout
            logout_resp = await ac.post("/api/v1/auth/logout")
            assert logout_resp.status_code == 200


@pytest.mark.asyncio
async def test_google_auth_verification():
    """Verify Google token server-side verification and customer account binding."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Mock Google token verification
        with patch("app.modules.auth.router.verify_google_id_token", new_callable=AsyncMock) as mock_verify, \
             patch("app.modules.auth.router.user_repo.get_by_provider_sub", new_callable=AsyncMock) as mock_sub, \
             patch("app.modules.auth.router.user_repo.get_raw_by_email", new_callable=AsyncMock) as mock_email, \
             patch("app.modules.auth.router.user_repo.create_raw", new_callable=AsyncMock) as mock_create:

            # Valid Google token
            mock_verify.return_value = {
                "iss": "https://accounts.google.com",
                "sub": "google-sub-987654321",
                "email": "verified.customer@gmail.com",
                "name": "Verified Google Customer",
                "picture": "https://lh3.googleusercontent.com/photo.jpg",
                "email_verified": True,
            }
            mock_sub.return_value = None
            mock_email.return_value = None
            mock_create.return_value = {
                "id": "recGoogleCust1",
                "fields": {
                    "full_name": "Verified Google Customer",
                    "email": "verified.customer@gmail.com",
                    "role": "customer",
                    "loyalty_points": 25,
                    "auth_provider": "google",
                    "provider_sub_id": "google-sub-987654321",
                    "avatar_url": "https://lh3.googleusercontent.com/photo.jpg",
                },
            }

            resp = await ac.post(
                "/api/v1/auth/google",
                json={"id_token": "valid_mock_google_id_token"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["user"]["email"] == "verified.customer@gmail.com"
            assert data["user"]["auth_provider"] == "google"
            assert data["user"]["loyalty_points"] == 25
            assert "jhes_session" in resp.cookies

            # Invalid Google token
            mock_verify.side_effect = ValueError("Invalid or expired Google credential.")
            bad_resp = await ac.post(
                "/api/v1/auth/google",
                json={"id_token": "fraudulent_token"},
            )
            assert bad_resp.status_code == 401


@pytest.mark.asyncio
async def test_facebook_auth_verification():
    """Verify Facebook Login endpoint rejects invalid tokens (401) and signs in valid Graph profiles."""
    from unittest.mock import AsyncMock, MagicMock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Invalid / unverified access token must be rejected with 401
        mock_bad_resp = MagicMock()
        mock_bad_resp.status_code = 400
        mock_bad_resp.text = '{"error":{"message":"Invalid OAuth access token"}}'

        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = False
        mock_client.get.return_value = mock_bad_resp

        with patch("app.modules.auth.router.httpx.AsyncClient", return_value=mock_client):
            bad_resp = await ac.post(
                "/api/v1/auth/facebook",
                json={"access_token": "invalid_fb_token"},
            )
            assert bad_resp.status_code == 401

        # 2. Verified Graph API profile issues customer session cookie (never admin)
        mock_ok_resp = MagicMock()
        mock_ok_resp.status_code = 200
        mock_ok_resp.json.return_value = {
            "id": "102299887766",
            "name": "Jhe Facebook Guest",
            "picture": {"data": {"url": "https://graph.facebook.com/pic.jpg"}},
        }
        mock_client.get.return_value = mock_ok_resp

        with (
            patch("app.modules.auth.router.httpx.AsyncClient", return_value=mock_client),
            patch("app.modules.auth.router.user_repo.get_by_provider_sub", new_callable=AsyncMock) as mock_sub,
            patch("app.modules.auth.router.user_repo.get_raw_by_email", new_callable=AsyncMock) as mock_email,
            patch("app.modules.auth.router.user_repo.create_raw", new_callable=AsyncMock) as mock_create,
        ):
            mock_sub.return_value = None
            mock_email.return_value = None
            mock_create.return_value = {
                "id": "recFB001",
                "full_name": "Jhe Facebook Guest",
                "email": "fb_102299887766@jhescafe.ph",
                "role": "customer",
                "loyalty_points": 25,
            }

            ok_resp = await ac.post(
                "/api/v1/auth/facebook",
                json={"access_token": "valid_fb_token"},
            )
            assert ok_resp.status_code == 200
            data = ok_resp.json()
            assert data["user"]["role"] == "customer"
            assert data["user"]["auth_provider"] == "facebook"
            assert "jhes_session" in ok_resp.cookies


@pytest.mark.asyncio
async def test_forgot_password():
    """Verify forgot password flow provides clean user feedback."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/auth/forgot-password",
            json={"email": "customer@jhescafe.ph"},
        )
        assert resp.status_code == 200
        assert "message" in resp.json()
