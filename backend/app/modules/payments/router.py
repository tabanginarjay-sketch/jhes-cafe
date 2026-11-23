"""Payments REST API router."""

from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schemas import (
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)

router = APIRouter(prefix="/payments", tags=["Payments"])

payment_repo = PaymentRepository()


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
