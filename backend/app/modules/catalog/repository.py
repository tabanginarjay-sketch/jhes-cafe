"""Catalog repository handling Products and Categories via Airtable with TTL caching."""

from typing import List, Optional
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
