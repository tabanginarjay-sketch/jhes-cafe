"""
Role-Based Access Control (RBAC) and Row-Level Security (RLS) dependencies.

Enforces:
1. Authentication: verifies caller identity via session/header.
2. Authorization: verifies caller role (customer, staff, admin).
3. Row-Level Security: prevents customers from accessing or modifying records
   belonging to other users.
"""

from typing import Optional
from fastapi import Header, HTTPException, status
from pydantic import BaseModel


class CurrentUser(BaseModel):
    user_id: str
    email: str
    role: str = "customer"  # 'customer', 'staff', 'admin'
    full_name: Optional[str] = None

    @property
    def is_admin(self) -> bool:
        return self.role.lower() == "admin"

    @property
    def is_staff_or_admin(self) -> bool:
        return self.role.lower() in ("staff", "admin")


def get_current_user(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(default="customer", alias="X-User-Role"),
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
) -> Optional[CurrentUser]:
    """
    Extracts authenticated user context from request headers.
    Returns None if caller is an unauthenticated guest.
    """
    if not x_user_id and not x_user_email:
        return None

    return CurrentUser(
        user_id=x_user_id or "guest",
        email=x_user_email or "guest@jhescafe.com",
        role=x_user_role or "customer",
    )


def require_auth(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(default="customer", alias="X-User-Role"),
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
) -> CurrentUser:
    """
    Dependency that mandates caller must be authenticated.
    Raises 401 Unauthorized if missing user identification.
    """
    user = get_current_user(x_user_id, x_user_role, x_user_email)
    if not user or user.user_id == "guest":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to Jhe's Cafe'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(default="customer", alias="X-User-Role"),
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
) -> CurrentUser:
    """
    Dependency mandating admin privilege.
    Raises 403 Forbidden if caller is not an administrator.
    """
    user = require_auth(x_user_id, x_user_role, x_user_email)
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required.",
        )
    return user


def enforce_row_level_security(target_owner_id: str, user: CurrentUser) -> None:
    """
    Row-Level Security check:
    Ensures a customer cannot view or modify data belonging to another user.
    Admins bypass this restriction.
    """
    if user.is_admin:
        return

    if user.user_id != target_owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to access or modify this record.",
        )
