"""Catalog repository handling Products and Categories via Airtable with TTL caching."""

import re
from typing import Any, List, Optional
from app.core.base_repository import BaseAirtableRepository
from app.core.config import settings
from app.core.cache import cache
from app.modules.catalog.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

CATALOG_CACHE_TTL = 60.0  # 60 seconds TTL for fast responses and Airtable rate limit protection

PRODUCT_IMAGE_MAP: dict[str, str] = {
    "barako-espresso-romano": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
    "spanish-latte-dulce": "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
    "iced-brown-sugar-shaken-espresso": "/images/products/iced-brown-sugar-espresso.jpg",
    "single-origin-affogato-al-caffe": "/images/products/single-origin-affogato.jpg",
    "tagaytay-cloud-coldbrew": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
    "kyoto-drip-slow-pour-cold-brew": "/images/products/kyoto-drip-coldbrew.jpg",
    "salted-honey-latte": "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
    "tagaytay-tablea-mocha": "/images/products/tagaytay-tablea-mocha.jpg",
    "highland-uji-matcha-latte": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80",
    "glazed-heritage-doughnut": "/images/products/vanilla-bean-glazed-doughnut.jpg",
    "dark-cacao-ganache-brioche-doughnut": "/images/products/dark-cacao-ganache-doughnut.jpg",
    "burnt-basque-cheesecake": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
    "rosemary-butter-croissant": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
    "strawberry-pistachio-croissant": "/images/products/strawberry-pistachio-croissant.jpg",
}

DEFAULT_IMAGE = "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80"


def resolve_product_type(name: str, cat: Optional[str] = None) -> str:
    n = (name or "").lower()
    c = (cat or "").lower()
    if "doughnut" in n or "donut" in n or "doughnut" in c:
        return "doughnut"
    if "cheesecake" in n or "cake" in n or "cake" in c:
        return "cake"
    if "cold brew" in n or "coldbrew" in n or "cold" in c:
        return "cold_brew"
    if "matcha" in n or "chocolate" in n or "tea" in n or "tea" in c:
        return "non_coffee"
    if "croissant" in n or "pastry" in n or "bread" in n or "pastr" in c or "bake" in c:
        return "pastry"
    return "coffee"


def resolve_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "item").lower()).strip("-")
    if "barako" in slug:
        return "barako-espresso-romano"
    if "spanish" in slug:
        return "spanish-latte-dulce"
    if "shaken" in slug or "brown-sugar" in slug:
        return "iced-brown-sugar-shaken-espresso"
    if "affogato" in slug:
        return "single-origin-affogato-al-caffe"
    if "kyoto" in slug:
        return "kyoto-drip-slow-pour-cold-brew"
    if "cold" in slug and "brew" in slug:
        return "tagaytay-cloud-coldbrew"
    if "honey" in slug:
        return "salted-honey-latte"
    if "tablea" in slug or "mocha" in slug:
        return "tagaytay-tablea-mocha"
    if "cheesecake" in slug:
        return "burnt-basque-cheesecake"
    if "strawberry" in slug and "croissant" in slug:
        return "strawberry-pistachio-croissant"
    if "croissant" in slug:
        return "rosemary-butter-croissant"
    if "cacao" in slug and ("doughnut" in slug or "donut" in slug):
        return "dark-cacao-ganache-brioche-doughnut"
    if "doughnut" in slug or "donut" in slug:
        return "glazed-heritage-doughnut"
    if "matcha" in slug:
        return "highland-uji-matcha-latte"
    return slug


class CategoryRepository(BaseAirtableRepository[CategoryResponse, CategoryCreate, CategoryUpdate]):
    table_name = settings.AIRTABLE_TABLE_CATEGORIES
    response_model = CategoryResponse

    async def list_all(
        self,
        filter_by_formula: Optional[str] = None,
        max_records: Optional[int] = None,
        sort_by: Optional[list[dict[str, str]]] = None,
    ) -> List[CategoryResponse]:
        cache_key = f"catalog:categories:{filter_by_formula}:{max_records}"
        return await cache.get_or_set(
            cache_key,
            lambda: super(CategoryRepository, self).list_all(
                filter_by_formula=filter_by_formula,
                max_records=max_records,
                sort_by=sort_by,
            ),
            ttl_seconds=120.0,
        )

    async def create(self, data: CategoryCreate) -> CategoryResponse:
        res = await super().create(data)
        cache.invalidate_prefix("catalog:")
        return res

    async def update(self, record_id: str, data: CategoryUpdate) -> CategoryResponse:
        res = await super().update(record_id, data)
        cache.invalidate_prefix("catalog:")
        return res

    async def delete(self, record_id: str) -> bool:
        res = await super().delete(record_id)
        cache.invalidate_prefix("catalog:")
        return res


class ProductRepository(BaseAirtableRepository[ProductResponse, ProductCreate, ProductUpdate]):
    table_name = settings.AIRTABLE_TABLE_PRODUCTS
    response_model = ProductResponse

    def _record_to_model(self, record: dict[str, Any]) -> ProductResponse:
        """Enrich raw Airtable product record with canonical slug, product_type, and verified image."""
        fields = dict(record.get("fields", {}))
        fields["id"] = record.get("id")
        if "createdTime" in record:
            fields["created_at"] = record.get("createdTime")

        name = fields.get("name", "")
        cat_name = fields.get("category_name", "")
        slug = resolve_slug(name)
        fields["slug"] = fields.get("slug") or slug
        fields["product_type"] = fields.get("product_type") or resolve_product_type(name, cat_name)
        fields["is_available"] = bool(fields.get("is_available", False))
        
        # Ensure image_url is always resolved and high-resolution
        img = fields.get("image_url")
        if not img or not (img.startswith("http") or img.startswith("/")):
            fields["image_url"] = PRODUCT_IMAGE_MAP.get(slug, DEFAULT_IMAGE)

        return self.response_model.model_validate(fields)

    async def list_all(
        self,
        filter_by_formula: Optional[str] = None,
        max_records: Optional[int] = None,
        sort_by: Optional[list[dict[str, str]]] = None,
    ) -> List[ProductResponse]:
        cache_key = f"catalog:products:{filter_by_formula}:{max_records}"
        return await cache.get_or_set(
            cache_key,
            lambda: super(ProductRepository, self).list_all(
                filter_by_formula=filter_by_formula,
                max_records=max_records,
                sort_by=sort_by,
            ),
            ttl_seconds=CATALOG_CACHE_TTL,
        )

    async def list_by_category(self, category_name: str) -> List[ProductResponse]:
        """Fetch products filtered by category name with caching."""
        cache_key = f"catalog:products:cat:{category_name.strip().lower()}"
        formula = f"{{category_name}} = '{category_name}'"
        return await cache.get_or_set(
            cache_key,
            lambda: super(ProductRepository, self).list_all(filter_by_formula=formula),
            ttl_seconds=CATALOG_CACHE_TTL,
        )

    async def list_available(self) -> List[ProductResponse]:
        """Fetch only currently available products with caching."""
        cache_key = "catalog:products:available"
        return await cache.get_or_set(
            cache_key,
            lambda: super(ProductRepository, self).list_all(filter_by_formula="{is_available} = 1"),
            ttl_seconds=CATALOG_CACHE_TTL,
        )

    async def get_by_id(self, record_id: str) -> ProductResponse:
        """Fetch single product with caching."""
        cache_key = f"catalog:product:{record_id}"
        return await cache.get_or_set(
            cache_key,
            lambda: super(ProductRepository, self).get_by_id(record_id),
            ttl_seconds=CATALOG_CACHE_TTL,
        )

    async def create(self, data: ProductCreate) -> ProductResponse:
        res = await super().create(data)
        cache.invalidate_prefix("catalog:")
        return res

    async def update(self, record_id: str, data: ProductUpdate) -> ProductResponse:
        res = await super().update(record_id, data)
        cache.invalidate_prefix("catalog:")
        return res

    async def delete(self, record_id: str) -> bool:
        res = await super().delete(record_id)
        cache.invalidate_prefix("catalog:")
        return res
