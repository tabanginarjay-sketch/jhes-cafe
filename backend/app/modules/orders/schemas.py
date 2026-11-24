"""Orders and Order Items domain schemas."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator

ALLOWED_ORDER_STATUSES = {"pending", "confirmed", "preparing", "ready", "completed", "cancelled"}
ALLOWED_PAYMENT_STATUSES = {"unpaid", "pending", "cod_pending", "paid", "failed", "refunded"}
ALLOWED_PAYMENT_METHODS = {"gcash", "maya", "card", "cash", "cod"}
ALLOWED_DINING_OPTIONS = {"Dine-in", "Takeaway", "Delivery"}


class DeliveryAddressInput(BaseModel):
    recipient_name: str = Field(..., min_length=2, max_length=100)
    contact_number: str = Field(..., min_length=7, max_length=32)
    house_number: str = Field(..., min_length=1, max_length=60)
    street: str = Field(..., min_length=2, max_length=120)
    barangay: str = Field(..., min_length=2, max_length=80)
    city: str = Field(..., min_length=2, max_length=80)
    landmark: Optional[str] = Field(default="", max_length=120)
    delivery_instructions: Optional[str] = Field(default="", max_length=240)
    schedule_type: str = Field(default="asap", pattern="^(asap|scheduled)$")
    scheduled_window: Optional[str] = Field(default=None, max_length=60)
    save_address: bool = Field(default=False)
    address_label: Optional[str] = Field(default="Home", max_length=40)


# ==================== ORDER ITEM SCHEMAS ====================

class OrderItemBase(BaseModel):
    order_id: Optional[str] = Field(default=None, description="Parent Order Airtable Record ID")
    product_name: str = Field(..., description="Product name at purchase")
    product_id: Optional[str] = Field(default=None, description="Product Airtable Record ID")
    size: Optional[str] = Field(default=None, description="Drink cup size (omitted for food/bakery)")
    temperature: Optional[str] = Field(default=None, description="Hot or Iced (omitted for food/bakery)")
    milk_type: Optional[str] = Field(default=None, description="Milk option (omitted for food/bakery)")
    sweetness: Optional[int] = Field(default=None, ge=0, le=100, description="Sweetness percentage (drinks only)")
    add_ons: Optional[str] = Field(default=None, description="Comma-separated add-ons")
    quantity: int = Field(default=1, ge=1, le=20, description="Quantity ordered")
    unit_price: float = Field(..., gt=0, description="Unit price in PHP")
    subtotal: float = Field(..., gt=0, description="Subtotal amount in PHP")


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    subtotal: Optional[float] = None


class OrderItemResponse(OrderItemBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None


# ==================== ORDER SCHEMAS ====================

class OrderBase(BaseModel):
    order_number: str = Field(..., description="Unique human-friendly code e.g. JHE-2026-10240")
    customer_name: str = Field(..., description="Customer full name")
    customer_phone: Optional[str] = Field(default=None, description="Customer phone number")
    customer_email: Optional[str] = Field(default=None, description="Customer email")
    dining_option: str = Field(default="Dine-in", description="Dine-in or Takeaway")
    status: str = Field(
        default="pending",
        description="Order status: pending, confirmed, preparing, ready, completed, cancelled",
    )
    total_amount: float = Field(..., gt=0, description="Total amount in PHP")
    payment_status: str = Field(
        default="pending",
        description="Payment status: unpaid, pending, paid, failed, refunded",
    )
    payment_method: str = Field(default="gcash", description="Payment method: gcash, maya, card, cash")
    special_notes: Optional[str] = Field(default=None, description="Barista preparation notes")

    @field_validator("customer_phone", mode="before")
    @classmethod
    def coerce_phone(cls, v: Any) -> Optional[str]:
        if v is None or v == "":
            return None
        return str(v)


class OrderCreate(BaseModel):
    order_number: Optional[str] = None
    idempotency_key: Optional[str] = Field(default=None, max_length=128)
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    dining_option: str = "Dine-in"
    table_number: Optional[str] = Field(default=None, max_length=20)
    seating_zone: Optional[str] = Field(default=None, max_length=60)
    pickup_time_preference: Optional[str] = Field(default=None, max_length=60)
    delivery_address: Optional[DeliveryAddressInput] = None
    payment_method: str = "gcash"
    promo_code: Optional[str] = Field(default=None, max_length=32)
    special_notes: Optional[str] = Field(default=None, max_length=200)
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Ordered drink/food items")


class OrderUpdateStatus(BaseModel):
    status: Optional[str] = Field(
        default=None,
        description="New order status: pending, confirmed, preparing, ready, completed, cancelled",
    )
    payment_status: Optional[str] = Field(
        default=None,
        description="New payment status: unpaid, pending, paid, failed, refunded",
    )


class OrderResponse(OrderBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None
    items: List[OrderItemResponse] = Field(default_factory=list, description="Order line items")
