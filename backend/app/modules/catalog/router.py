"""Catalog REST API router for Products and Categories with CDN / HTTP caching headers."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.catalog.repository import CategoryRepository, ProductRepository
from app.modules.catalog.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/catalog", tags=["Catalog"])

category_repo = CategoryRepository()
product_repo = ProductRepository()

CACHE_CONTROL_HEADER = "public, max-age=60, stale-while-revalidate=300"


# ==================== CATEGORIES ====================

@router.get("/categories", response_model=List[CategoryResponse], summary="List all categories")
async def list_categories(response: Response) -> List[CategoryResponse]:
    response.headers["Cache-Control"] = CACHE_CONTROL_HEADER
    try:
        return await category_repo.list_all(sort_by=[{"field": "display_order", "direction": "asc"}])
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED, summary="Create category")
async def create_category(payload: CategoryCreate) -> CategoryResponse:
    try:
        return await category_repo.create(payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/categories/{category_id}", response_model=CategoryResponse, summary="Get category by ID")
async def get_category(category_id: str, response: Response) -> CategoryResponse:
    response.headers["Cache-Control"] = CACHE_CONTROL_HEADER
    try:
        return await category_repo.get_by_id(category_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Category '{category_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


# ==================== PRODUCTS ====================

@router.get("/products", response_model=List[ProductResponse], summary="List products")
async def list_products(
    response: Response,
    category: Optional[str] = Query(default=None, description="Filter by category name"),
    available_only: bool = Query(default=False, description="Filter only available items"),
) -> List[ProductResponse]:
    response.headers["Cache-Control"] = CACHE_CONTROL_HEADER
    try:
        if category:
            return await product_repo.list_by_category(category)
        if available_only:
            return await product_repo.list_available()
        return await product_repo.list_all(sort_by=[{"field": "name", "direction": "asc"}])
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Create product")
async def create_product(payload: ProductCreate) -> ProductResponse:
    try:
        return await product_repo.create(payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/products/{product_id}", response_model=ProductResponse, summary="Get product by ID")
async def get_product(product_id: str, response: Response) -> ProductResponse:
    response.headers["Cache-Control"] = CACHE_CONTROL_HEADER
    try:
        return await product_repo.get_by_id(product_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.patch("/products/{product_id}", response_model=ProductResponse, summary="Update product")
async def update_product(product_id: str, payload: ProductUpdate) -> ProductResponse:
    try:
        return await product_repo.update(product_id, payload)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete product")
async def delete_product(product_id: str) -> None:
    try:
        deleted = await product_repo.delete(product_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product '{product_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)
