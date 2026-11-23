"""Catalog schemas for Categories and Products."""

from typing import Optional
from pydantic import BaseModel, Field


# ==================== CATEGORY SCHEMAS ====================

class CategoryBase(BaseModel):
    name: str = Field(..., description="Category name (e.g. Signature Espresso, Cold Brews)")
    slug: str = Field(..., description="URL slug (e.g. signature-espresso)")
    description: Optional[str] = Field(default=None, description="Category description")
    display_order: int = Field(default=0, description="Display sorting order")
    is_active: bool = Field(default=True, description="Whether category is published")


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None


# ==================== PRODUCT SCHEMAS ====================

class ProductBase(BaseModel):
    name: str = Field(..., description="Product name (e.g. Spanish Latte Dulce)")
    category_name: Optional[str] = Field(default=None, description="Category name")
    category_id: Optional[str] = Field(default=None, description="Associated Category Airtable ID")
    description: Optional[str] = Field(default=None, description="Tasting & ingredient notes")
    price: float = Field(..., gt=0, description="Base price in PHP")
    image_url: Optional[str] = Field(default=None, description="Product image URL")
    origin: Optional[str] = Field(default=None, description="Bean single origin (e.g. Amadeo Cavite)")
    roast_level: Optional[str] = Field(default="Medium", description="Roast profile")
    tasting_notes: Optional[str] = Field(default=None, description="Flavor notes")
    is_available: bool = Field(default=True, description="In-stock status")
    tag: Optional[str] = Field(default=None, description="Badge tag (e.g. Bestseller, Signature)")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    origin: Optional[str] = None
    roast_level: Optional[str] = None
    tasting_notes: Optional[str] = None
    is_available: Optional[bool] = None
    tag: Optional[str] = None


class ProductResponse(ProductBase):
    id: str = Field(..., description="Airtable record ID")
    created_at: Optional[str] = None
