"""Orders and Order Items domain schemas."""

from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


# ==================== ORDER ITEM SCHEMAS ====================

class OrderItemBase(BaseModel):
    order_id: Optional[str] = Field(default=None, description="Parent Order Airtable Record ID")
    product_name: str = Field(..., description="Product name at purchase")
    product_id: Optional[str] = Field(default=None, description="Product Airtable Record ID")
    size: str = Field(default="Regular", description="Drink cup size: 12oz, 16oz Regular, 20oz Grande")
    temperature: str = Field(default="Hot", description="Hot or Iced")
    milk_type: Optional[str] = Field(default="Whole Milk", description="Milk option")
    sweetness: int = Field(default=100, ge=0, le=100, description="Sweetness percentage")
    add_ons: Optional[str] = Field(default=None, description="Comma-separated add-ons")
    quantity: int = Field(default=1, ge=1, description="Quantity ordered")
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
    order_number: str = Field(..., description="Unique human-friendly code e.g. ORD-1024")
    customer_name: str = Field(..., description="Customer full name")
    customer_phone: Optional[str] = Field(default=None, description="Customer phone number")
    customer_email: Optional[str] = Field(default=None, description="Customer email")
    dining_option: str = Field(default="Dine-in", description="Dine-in, Takeaway, or Delivery")
    status: str = Field(default="pending", description="Status: pending, preparing, ready, completed, cancelled")
    total_amount: float = Field(..., gt=0, description="Total amount in PHP")
    payment_status: str = Field(default="pending", description="Payment status: pending, paid, refunded")
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
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    dining_option: str = "Dine-in"
    payment_method: str = "gcash"
    special_notes: Optional[str] = None
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Ordered drink/food items")


class OrderUpdateStatus(BaseModel):
    status: Optional[str] = Field(default=None, description="New order status")
    payment_status: Optional[str] = Field(default=None, description="New payment status")


class OrderResponse(OrderBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None
    items: List[OrderItemResponse] = Field(default_factory=list, description="Order line items")
