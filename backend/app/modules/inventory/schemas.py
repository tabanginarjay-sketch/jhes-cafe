"""Inventory schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class InventoryItemBase(BaseModel):
    item_name: str = Field(..., description="Stock item name (e.g. Cavite Liberica Beans 1kg)")
    sku: str = Field(..., description="Stock Keeping Unit e.g. BEAN-LIB-01")
    category: str = Field(default="coffee_beans", description="Category: coffee_beans, dairy, syrups, packaging, pastries")
    stock_quantity: float = Field(..., ge=0, description="Current stock level")
    unit: str = Field(default="kg", description="Measurement unit: kg, liters, pcs, bags")
    reorder_threshold: float = Field(default=5.0, ge=0, description="Minimum safety stock")
    supplier: Optional[str] = Field(default=None, description="Supplier or farm source")
    last_restocked: Optional[str] = Field(default=None, description="Last restock date")


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    item_name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    stock_quantity: Optional[float] = None
    unit: Optional[str] = None
    reorder_threshold: Optional[float] = None
    supplier: Optional[str] = None
    last_restocked: Optional[str] = None


class InventoryItemResponse(InventoryItemBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None
