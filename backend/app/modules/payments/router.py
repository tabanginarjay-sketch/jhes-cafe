"""Payments REST API router."""

from typing import Any, List, Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.auth.security import decode_session_token
from app.modules.orders.repository import OrderRepository
from app.modules.orders.schemas import OrderUpdateStatus
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schemas import (
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)

router = APIRouter(prefix="/payments", tags=["Payments"])

payment_repo = PaymentRepository()
order_repo = OrderRepository()
ALLOWED_PAYMENT_UPDATE_STATUSES = {"unpaid", "pending", "paid", "completed", "failed", "refunded"}


def require_admin_session(
    authorization: Optional[str] = Header(default=None),
    jhes_session: Optional[str] = Cookie(default=None),
) -> dict[str, Any]:
    token: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif jhes_session:
        token = jhes_session
    claims = decode_session_token(token) if token else None
    if not claims:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    if str(claims.get("role", "")).lower() not in {"admin", "manager"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator authentication required.")
    return claims


@router.get("", response_model=List[PaymentResponse], summary="List payment transactions")
async def list_payments(
    order_id: Optional[str] = Query(default=None, description="Filter by order ID"),
) -> List[PaymentResponse]:
    try:
        if order_id:
            return await payment_repo.list_by_order(order_id)
        return await payment_repo.list_all()
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, summary="Record a payment")
async def create_payment(payload: PaymentCreate) -> PaymentResponse:
    try:
        return await payment_repo.create(payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/{payment_id}", response_model=PaymentResponse, summary="Get payment by ID")
async def get_payment(payment_id: str) -> PaymentResponse:
    try:
        return await payment_repo.get_by_id(payment_id)
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Payment '{payment_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.patch("/{payment_id}", response_model=PaymentResponse, summary="Confirm or update payment status (Admin)")
async def update_payment_status(
    payment_id: str,
    payload: PaymentUpdate,
    _: dict[str, Any] = Depends(require_admin_session),
) -> PaymentResponse:
    if payload.status and payload.status.lower().strip() not in ALLOWED_PAYMENT_UPDATE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment status. Must be one of: {', '.join(sorted(ALLOWED_PAYMENT_UPDATE_STATUSES))}.",
        )
    try:
        updated = await payment_repo.update(payment_id, payload)
        if payload.status and updated.order_id:
            st = payload.status.lower().strip()
            synced = "paid" if st in {"paid", "completed"} else st
            try:
                await order_repo.update(updated.order_id, OrderUpdateStatus(payment_status=synced))
            except Exception:
                pass
        return updated
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Payment '{payment_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)
