"""Payments domain schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class PaymentBase(BaseModel):
    payment_ref: str = Field(..., description="Unique payment reference e.g. PAY-2026-0012")
    order_id: str = Field(..., description="Associated Order record ID")
    order_number: str = Field(..., description="Human order number e.g. ORD-1024")
    amount: float = Field(..., gt=0, description="Payment amount in PHP")
    provider: str = Field(default="gcash", description="Provider: gcash, maya, card, cash")
    status: str = Field(default="pending", description="Status: unpaid, pending, paid, completed, failed, refunded")
    transaction_id: Optional[str] = Field(default=None, description="External gateway transaction ID")


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    transaction_id: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None
