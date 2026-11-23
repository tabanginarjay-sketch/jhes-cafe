"""Inventory REST API router."""

from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.inventory.repository import InventoryRepository
from app.modules.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])

inventory_repo = InventoryRepository()


@router.get("", response_model=List[InventoryItemResponse], summary="List all inventory items")
async def list_inventory(
    low_stock_only: bool = Query(default=False, description="Filter only low stock items needing reorder"),
) -> List[InventoryItemResponse]:
    try:
        if low_stock_only:
            return await inventory_repo.list_low_stock()
        return await inventory_repo.list_all()
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED, summary="Add inventory item")
async def create_inventory_item(payload: InventoryItemCreate) -> InventoryItemResponse:
    try:
        return await inventory_repo.create(payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/{item_id}", response_model=InventoryItemResponse, summary="Get inventory item by ID")
async def get_inventory_item(item_id: str) -> InventoryItemResponse:
    try:
        return await inventory_repo.get_by_id(item_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{item_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.patch("/{item_id}", response_model=InventoryItemResponse, summary="Update stock or item details")
async def update_inventory_item(item_id: str, payload: InventoryItemUpdate) -> InventoryItemResponse:
    try:
        return await inventory_repo.update(item_id, payload)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{item_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)
