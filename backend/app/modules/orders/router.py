"""Orders REST API router with authentication and customer ownership enforcement."""

from typing import Any, List, Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.auth.security import decode_session_token
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


def require_authenticated_session(
    authorization: Optional[str] = Header(default=None),
    jhes_session: Optional[str] = Cookie(default=None),
) -> dict[str, Any]:
    token: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif jhes_session:
        token = jhes_session

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access or create orders.",
        )

    claims = decode_session_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired. Please sign in again.",
        )
    return claims


@router.get("", response_model=List[OrderResponse], summary="List authenticated customer or admin orders")
async def list_orders(
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
    claims: dict[str, Any] = Depends(require_authenticated_session),
) -> List[OrderResponse]:
    try:
        role = str(claims.get("role", "customer")).lower()
        email = str(claims.get("email", "")).strip().lower().replace("'", "\\'")
        clauses: list[str] = []
        if role not in {"admin", "manager"} and email:
            clauses.append(f"LOWER({{customer_email}}) = '{email}'")
        if status_filter:
            safe_status = status_filter.replace("'", "\\'")
            clauses.append(f"{{status}} = '{safe_status}'")
        formula = f"AND({', '.join(clauses)})" if len(clauses) > 1 else (clauses[0] if clauses else None)
        return await order_repo.list_all(filter_by_formula=formula)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new order with line items (authenticated customer required)",
)
async def create_order(
    payload: OrderCreate,
    x_idempotency_key: Optional[str] = Header(default=None),
    claims: dict[str, Any] = Depends(require_authenticated_session),
) -> OrderResponse:
    try:
        role = str(claims.get("role", "customer")).lower()
        verified_email = str(claims.get("email", "")).strip().lower()
        if role not in {"admin", "manager"} and verified_email:
            payload = payload.model_copy(update={"customer_email": verified_email})
        return await order_repo.create_order_with_items(
            payload,
            idempotency_key=x_idempotency_key or payload.idempotency_key,
        )
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
async def update_order_status(
    order_id: str,
    payload: OrderUpdateStatus,
    claims: dict[str, Any] = Depends(require_authenticated_session),
) -> OrderResponse:
    if str(claims.get("role", "")).lower() not in {"admin", "manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required to update order status.",
        )
    try:
        return await order_repo.update_validated_status(order_id, payload)
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
