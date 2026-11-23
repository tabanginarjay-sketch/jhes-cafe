"""Reservations schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class ReservationCreate(BaseModel):
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    time_slot: str = Field(..., description="Selected time slot label")
    zone: str = Field(..., description="Seating area zone name")
    guests: int = Field(default=2, ge=1, le=12, description="Party guest count")
    customer_name: str = Field(..., description="Customer full name")
    customer_email: str = Field(..., description="Customer email address")
    customer_phone: Optional[str] = Field(default=None, description="Contact phone")
    special_requests: Optional[str] = Field(default=None, description="Special requests or dietary notes")


class ReservationResponse(ReservationCreate):
    id: str = Field(..., description="Reservation record ID")
    reservation_code: str = Field(..., description="Human friendly confirmation code e.g. RES-JHE-1082")
    status: str = Field(default="confirmed", description="Reservation status")
    created_at: Optional[str] = None
