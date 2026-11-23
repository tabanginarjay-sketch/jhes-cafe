"""Pydantic schemas for authentication requests and responses."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = Field(default=None, description="Google ID Token from Google Identity Services")
    code: Optional[str] = Field(default=None, description="Google Authorization Code from OAuth 2.0 flow")
    redirect_uri: Optional[str] = Field(default=None, description="Redirect URI used in OAuth 2.0 flow")
    client_id: Optional[str] = Field(default=None, description="Optional Client ID for audience verification")


class FacebookAuthRequest(BaseModel):
    access_token: Optional[str] = Field(default=None, description="User access token from Facebook Login")
    code: Optional[str] = Field(default=None, description="Facebook OAuth authorization code")
    redirect_uri: Optional[str] = Field(default=None, description="Redirect URI used for code exchange")
    user_id: Optional[str] = Field(default=None, description="Facebook user ID")


class EmailRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Customer full name")
    email: EmailStr = Field(..., description="Valid customer email address")
    password: str = Field(..., min_length=6, max_length=128, description="Secure customer password")
    phone: Optional[str] = Field(default=None, description="Optional phone number")


class EmailLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered customer email")
    password: str = Field(..., min_length=1, description="Customer password")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered customer email for reset instructions")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Password reset verification token")
    new_password: str = Field(..., min_length=6, max_length=128, description="New secure password")


class AuthUser(BaseModel):
    id: str = Field(..., description="Customer ID")
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str = "customer"
    loyalty_points: int = 25
    auth_provider: str = "email"
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


class AuthSessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser
    message: str = "Authentication successful"
