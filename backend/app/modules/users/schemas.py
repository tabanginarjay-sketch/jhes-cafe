"""Users (Customers) and Staff domain schemas."""

from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ==================== CUSTOMER / USER SCHEMAS ====================

class UserBase(BaseModel):
    full_name: str = Field(..., description="Customer full name")
    email: EmailStr = Field(..., description="Customer email address")
    phone: Optional[str] = Field(default=None, description="Mobile contact number")
    role: str = Field(default="customer", description="Role: customer, vip")
    loyalty_points: int = Field(default=0, ge=0, description="Earned coffee bean points")

    @field_validator("phone", mode="before")
    @classmethod
    def coerce_phone(cls, v: Any) -> Optional[str]:
        if v is None or v == "":
            return None
        return str(v)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    loyalty_points: Optional[int] = None

    @field_validator("phone", mode="before")
    @classmethod
    def coerce_phone(cls, v: Any) -> Optional[str]:
        if v is None or v == "":
            return None
        return str(v)


class UserResponse(UserBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None


# ==================== STAFF SCHEMAS ====================

class StaffBase(BaseModel):
    staff_id: str = Field(..., description="Staff badge ID (e.g. BARISTA-01)")
    full_name: str = Field(..., description="Staff member full name")
    email: EmailStr = Field(..., description="Staff work email")
    role: str = Field(default="barista", description="Role: barista, shift_supervisor, manager, cashier")
    shift: Optional[str] = Field(default="Morning", description="Current scheduled shift")
    is_active: bool = Field(default=True, description="Active employment status")


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    shift: Optional[str] = None
    is_active: Optional[bool] = None


class StaffResponse(StaffBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None
