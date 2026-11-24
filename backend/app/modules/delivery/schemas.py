"""Pydantic v2 domain schemas & transition validation for Jhe's Cafe' Delivery System."""

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

DeliveryStatusLiteral = Literal[
    "PENDING_ASSIGNMENT",
    "DRIVER_ASSIGNED",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "FAILED_DELIVERY",
    "RETURNED",
]

ALLOWED_DELIVERY_TRANSITIONS: Dict[str, List[str]] = {
    "PENDING_ASSIGNMENT": ["DRIVER_ASSIGNED", "READY_FOR_PICKUP", "CANCELLED"],
    "DRIVER_ASSIGNED": ["READY_FOR_PICKUP", "PICKED_UP", "CANCELLED"],
    "READY_FOR_PICKUP": ["DRIVER_ASSIGNED", "PICKED_UP", "CANCELLED"],
    "PICKED_UP": ["OUT_FOR_DELIVERY", "FAILED_DELIVERY", "RETURNED", "CANCELLED"],
    "OUT_FOR_DELIVERY": ["DELIVERED", "FAILED_DELIVERY", "RETURNED"],
    "FAILED_DELIVERY": ["DRIVER_ASSIGNED", "RETURNED", "CANCELLED"],
    "DELIVERED": [],
    "CANCELLED": [],
    "RETURNED": [],
}

DRIVER_ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    "PENDING_ASSIGNMENT": [],
    "DRIVER_ASSIGNED": ["PICKED_UP"],
    "READY_FOR_PICKUP": ["PICKED_UP"],
    "PICKED_UP": ["OUT_FOR_DELIVERY", "FAILED_DELIVERY"],
    "OUT_FOR_DELIVERY": ["DELIVERED", "FAILED_DELIVERY"],
    "FAILED_DELIVERY": [],
    "DELIVERED": [],
    "CANCELLED": [],
    "RETURNED": [],
}


class DeliveryZoneCreate(BaseModel):
    city: str = Field(..., min_length=2, max_length=80)
    barangay: str = Field(..., min_length=2, max_length=80)
    area_label: Optional[str] = Field(default=None, max_length=120)
    delivery_fee: float = Field(..., ge=0, le=2000)
    min_order_amount: float = Field(default=0, ge=0, le=10000)
    estimated_minutes: str = Field(default="30–45 mins", min_length=2, max_length=60)
    is_active: bool = Field(default=True)


class DeliveryZoneUpdate(BaseModel):
    city: Optional[str] = Field(default=None, min_length=2, max_length=80)
    barangay: Optional[str] = Field(default=None, min_length=2, max_length=80)
    area_label: Optional[str] = Field(default=None, max_length=120)
    delivery_fee: Optional[float] = Field(default=None, ge=0, le=2000)
    min_order_amount: Optional[float] = Field(default=None, ge=0, le=10000)
    estimated_minutes: Optional[str] = Field(default=None, min_length=2, max_length=60)
    is_active: Optional[bool] = None


class DriverAssignPayload(BaseModel):
    action: Literal["assign_driver"] = "assign_driver"
    driver_id: str = Field(..., min_length=3)
    estimated_delivery_time: Optional[str] = Field(default=None, max_length=60)


class DeliveryStatusUpdatePayload(BaseModel):
    action: Literal["update_status"] = "update_status"
    delivery_status: DeliveryStatusLiteral
    reason: Optional[str] = Field(default=None, max_length=240)
    proof_note: Optional[str] = Field(default=None, max_length=240)
    confirmation_code: Optional[str] = Field(default=None, max_length=16)
    cash_collected_amount: Optional[float] = Field(default=None, ge=0)


class DeliveryMessageCreate(BaseModel):
    kind: Literal["message", "issue"] = "message"
    text: str = Field(..., min_length=2, max_length=300)
    issue_category: Optional[str] = Field(default=None, max_length=60)
