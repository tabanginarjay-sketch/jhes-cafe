"""Payments and Loyalty Ledger domain schemas with immutability enforcement."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class PaymentAuditEntry(BaseModel):
    at: str
    action: str
    status: str
    by: str
    role: Optional[str] = None
    ref: Optional[str] = None
    reason: Optional[str] = None
    amount: Optional[float] = None
    is_simulated: Optional[bool] = None


class LinkedRefundRecord(BaseModel):
    id: str
    refund_ref: str
    original_payment_id: str
    original_payment_ref: str
    order_id: str
    order_number: str
    amount: float
    currency: str = "PHP"
    provider: str
    reason: str
    refunded_by: str
    refunded_role: Optional[str] = None
    refunded_at: str


class PaymentBase(BaseModel):
    payment_ref: str = Field(..., description="Unique payment reference e.g. PAY-2026-0012")
    order_id: str = Field(..., description="Associated Order record ID")
    order_number: str = Field(..., description="Human order number e.g. JHE-2026-1024")
    amount: float = Field(..., gt=0, description="Payment amount in PHP")
    provider: str = Field(default="gcash", description="Provider: gcash, maya, card, cash")
    status: str = Field(default="pending", description="Status: pending, completed, failed, refunded")
    transaction_id: Optional[str] = Field(default=None, description="External gateway transaction ID")


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    action: Optional[str] = Field(
        default=None,
        description="Workflow action: confirm_cash, verify_demo, mark_failed, refund",
    )
    status: Optional[str] = None
    reason: Optional[str] = None
    failure_reason: Optional[str] = None
    refund_reason: Optional[str] = None
    refund_amount: Optional[float] = None
    verification_reference: Optional[str] = None
    receipt_reference: Optional[str] = None
    demo_acknowledgement: Optional[bool] = None
    note: Optional[str] = None
    # Explicitly tracked immutable fields so API can reject tampering attempts with 403
    amount: Optional[float] = None
    provider: Optional[str] = None
    payment_method: Optional[str] = None
    payment_ref: Optional[str] = None
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    transaction_id: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    currency: str = "PHP"
    payment_method: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_status: Optional[str] = None
    is_simulated: bool = False
    verification_mode: str = "unverified"
    provider_transaction_ref: Optional[str] = None
    failure_reason: Optional[str] = None
    refund: Optional[LinkedRefundRecord] = None
    verification_history: List[PaymentAuditEntry] = Field(default_factory=list)


class LoyaltyTransactionResponse(BaseModel):
    id: str
    transaction_ref: str
    customer_id: str
    customer_name: str
    customer_email: Optional[str] = None
    transaction_type: str
    points: int
    signed_points: int
    unit: str = "Bean Points"
    order_reference: Optional[str] = None
    idempotency_key: str
    description: str
    created_at: Optional[str] = None
