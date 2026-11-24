"""Orders REST API router."""

from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.orders.repository import OrderItemRepository, OrderRepository
from app.modules.orders.schemas import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    OrderUpdateStatus,
)

router = APIRouter(prefix="/orders", tags=["Orders"])

order_repo = OrderRepository()
order_item_repo = OrderItemRepository()


@router.get("", response_model=List[OrderResponse], summary="List orders")
async def list_orders(
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
) -> List[OrderResponse]:
    try:
        formula = f"{{status}} = '{status_filter}'" if status_filter else None
        return await order_repo.list_all(filter_by_formula=formula)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, summary="Create new order with line items")
async def create_order(payload: OrderCreate) -> OrderResponse:
    try:
        return await order_repo.create_order_with_items(payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/{order_id}", response_model=OrderResponse, summary="Get order by ID with line items")
async def get_order(order_id: str) -> OrderResponse:
    try:
        return await order_repo.get_order_with_items(order_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.patch("/{order_id}/status", response_model=OrderResponse, summary="Update order preparation or payment status")
@router.patch("/{order_id}", response_model=OrderResponse, summary="Update order status (REST alias)")
async def update_order_status(order_id: str, payload: OrderUpdateStatus) -> OrderResponse:
    try:
        updated = await order_repo.update(order_id, payload)
        return await order_repo.get_order_with_items(order_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{order_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/{order_id}/items", response_model=List[OrderItemResponse], summary="Get items belonging to an order")
async def get_order_items(order_id: str) -> List[OrderItemResponse]:
    try:
        return await order_item_repo.list_by_order_id(order_id)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)
