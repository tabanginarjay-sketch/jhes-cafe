"""Payments & Loyalty Transactions REST API router with strict separation and security."""

import json
import random
from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, status

from app.core.airtable import AirtableError, AirtableNotFoundError
from app.modules.auth.security import decode_session_token
from app.modules.orders.repository import OrderRepository
from app.modules.orders.schemas import OrderUpdateStatus
from app.modules.payments.repository import (
    ONLINE_PROVIDERS,
    REFUND_PREFIX,
    VALID_PROVIDERS,
    PaymentRepository,
    encode_transaction_field,
    is_auth_credential_record,
    is_cart_record,
    is_delivery_system_record,
    is_loyalty_record,
    is_refund_record,
    normalize_payment_status,
    parse_transaction_field,
)
from app.modules.payments.schemas import (
    LoyaltyTransactionResponse,
    PaymentAuditEntry,
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)

router = APIRouter(tags=["Payments & Loyalty"])

payment_repo = PaymentRepository()
order_repo = OrderRepository()


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


@router.get("/payments", response_model=List[PaymentResponse], summary="List genuine order payment transactions (Admin)")
async def list_payments(
    order_id: Optional[str] = Query(default=None, description="Filter by order ID"),
    _: dict[str, Any] = Depends(require_admin_session),
) -> List[PaymentResponse]:
    try:
        return await payment_repo.list_order_payments(order_id=order_id)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get(
    "/loyalty/transactions",
    response_model=List[LoyaltyTransactionResponse],
    summary="List loyalty Bean Points transactions separately from payments (Admin)",
)
async def list_loyalty_transactions(
    _: dict[str, Any] = Depends(require_admin_session),
) -> List[LoyaltyTransactionResponse]:
    try:
        return await payment_repo.list_loyalty_transactions()
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, summary="Record pending order payment")
async def create_payment(
    payload: PaymentCreate,
    _: dict[str, Any] = Depends(require_admin_session),
) -> PaymentResponse:
    raw_dict = payload.model_dump()
    if is_cart_record(raw_dict) or is_loyalty_record(raw_dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart activity and loyalty transactions cannot be created as monetary payments.",
        )
    provider = payload.provider.strip().lower()
    if provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider. Must be one of: {', '.join(sorted(VALID_PROVIDERS))}.",
        )
    # Never allow skipping verification by creating a pre-completed payment
    safe_payload = payload.model_copy(update={"provider": provider, "status": "pending"})
    try:
        return await payment_repo.create(safe_payload)
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.get("/payments/{payment_id}", response_model=PaymentResponse, summary="Get order payment details by ID (Admin)")
async def get_payment(
    payment_id: str,
    _: dict[str, Any] = Depends(require_admin_session),
) -> PaymentResponse:
    try:
        all_order_payments = await payment_repo.list_order_payments()
        match = next((p for p in all_order_payments if p.id == payment_id), None)
        if not match:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order payment '{payment_id}' not found.")
        return match
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Payment '{payment_id}' not found.")
    except AirtableError as exc:
        raise HTTPException(status_code=exc.status_code or 500, detail=exc.message)


@router.patch("/payments/{payment_id}", response_model=PaymentResponse, summary="Verify, fail, or refund payment (Admin)")
async def update_payment_status(
    payment_id: str,
    payload: PaymentUpdate,
    admin: dict[str, Any] = Depends(require_admin_session),
) -> PaymentResponse:
    # 1. Reject arbitrary modification of immutable financial fields
    immutable_attempted = [
        f
        for f in ("amount", "provider", "payment_method", "payment_ref", "order_id", "order_number", "transaction_id")
        if getattr(payload, f) is not None
    ]
    if immutable_attempted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Arbitrary editing of immutable fields ({', '.join(immutable_attempted)}) is forbidden.",
        )

    try:
        raw_rec = await payment_repo.client.get_record("Payments", payment_id)
        existing = {"id": raw_rec["id"], "created_at": raw_rec.get("createdTime"), **(raw_rec.get("fields") or {})}
    except AirtableNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Payment '{payment_id}' not found.")

    if (
        is_loyalty_record(existing)
        or is_refund_record(existing)
        or is_cart_record(existing)
        or is_auth_credential_record(existing)
        or is_delivery_system_record(existing)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only genuine customer order payment records may be transitioned via this endpoint.",
        )

    current_status = normalize_payment_status(existing.get("status"))
    provider = str(existing.get("provider") or "cash").strip().lower()
    original_amount = float(existing.get("amount") or 0)
    primary_ref, history, _, is_sim, _, _ = parse_transaction_field(existing.get("transaction_id"), existing)
    now_iso = datetime.now(timezone.utc).isoformat()
    actor = str(admin.get("name") or admin.get("email") or "Administrator")
    actor_role = str(admin.get("role") or "manager")

    action = (payload.action or "").strip().lower()
    req_status = (payload.status or "").strip().lower()
    if not action and req_status:
        if req_status == "failed":
            action = "mark_failed"
        elif req_status == "refunded":
            action = "refund"
        elif req_status in {"completed", "paid"}:
            action = "confirm_cash" if provider == "cash" else "generic_complete_blocked"

    if current_status in {"failed", "refunded"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Payment is in immutable terminal state '{current_status}'.",
        )

    if current_status == "completed":
        if action != "refund":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Completed payments cannot be arbitrarily modified. Use the auditable refund workflow.",
            )
        reason = (payload.reason or payload.refund_reason or "").strip()
        if len(reason) < 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A refund reason is required.")
        refund_amt = payload.refund_amount if payload.refund_amount is not None else original_amount
        if refund_amt <= 0 or refund_amt > original_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Refund amount must be between ₱0.01 and ₱{original_amount:.2f}.",
            )
        refund_ref = f"REF-2026-{random.randint(10000, 99999)}"
        refund_meta = {
            "original_payment_id": payment_id,
            "original_payment_ref": str(existing.get("payment_ref") or payment_id),
            "by": actor,
            "role": actor_role,
            "reason": reason[:240],
            "at": now_iso,
        }
        await payment_repo.client.create_record(
            "Payments",
            {
                "payment_ref": refund_ref,
                "order_id": str(existing.get("order_id") or ""),
                "order_number": str(existing.get("order_number") or ""),
                "amount": round(refund_amt, 2),
                "provider": f"{provider}_refund",
                "status": "refunded",
                "transaction_id": f"{REFUND_PREFIX}{json.dumps(refund_meta, separators=(',', ':'))}",
            },
        )
        history.append(
            PaymentAuditEntry(
                at=now_iso,
                action="refunded",
                status="refunded",
                by=actor,
                role=actor_role,
                ref=refund_ref,
                reason=reason[:240],
                amount=round(refund_amt, 2),
                is_simulated=is_sim,
            )
        )
        await payment_repo.client.update_record(
            "Payments",
            payment_id,
            {"status": "refunded", "transaction_id": encode_transaction_field(primary_ref, history)},
        )
        if existing.get("order_id") and str(existing["order_id"]).startswith("rec"):
            try:
                await order_repo.update(str(existing["order_id"]), OrderUpdateStatus(payment_status="refunded"))
            except Exception:
                pass
        return await get_payment(payment_id, admin)

    # Pending payment workflows
    if action == "generic_complete_blocked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Online payments require verified webhook or controlled demo verification.",
        )

    if action == "confirm_cash":
        if provider != "cash":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Cash payments may use cashier confirmation.")
        rcpt = (payload.receipt_reference or payload.verification_reference or "").strip()
        confirmed_ref = f"CASH-CONFIRMED-{rcpt}" if rcpt else f"CASH-CONFIRMED-{int(datetime.now().timestamp() * 1000)}"
        history.append(
            PaymentAuditEntry(
                at=now_iso,
                action="cash_confirmed",
                status="completed",
                by=actor,
                role=actor_role,
                ref=confirmed_ref,
                reason=(payload.note or "Counter cash received and verified by cashier.")[:200],
                amount=original_amount,
                is_simulated=False,
            )
        )
        await payment_repo.client.update_record(
            "Payments",
            payment_id,
            {"status": "completed", "transaction_id": encode_transaction_field(confirmed_ref, history)},
        )
        if existing.get("order_id") and str(existing["order_id"]).startswith("rec"):
            try:
                await order_repo.update(str(existing["order_id"]), OrderUpdateStatus(payment_status="paid"))
            except Exception:
                pass
        return await get_payment(payment_id, admin)

    if action == "verify_demo":
        if provider not in ONLINE_PROVIDERS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Demo verification applies to online providers only.")
        if payload.demo_acknowledgement is not True:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Explicit demo acknowledgement is required.")
        vref = (payload.verification_reference or "").strip()
        if len(vref) < 4:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A verification reference (min 4 chars) is required.")
        final_ref = vref.upper() if vref.upper().startswith("DEMO-") else f"DEMO-VERIFIED-{provider.upper()}-{vref.upper()}"
        history.append(
            PaymentAuditEntry(
                at=now_iso,
                action="demo_verified",
                status="completed",
                by=actor,
                role=actor_role,
                ref=final_ref,
                reason=(payload.note or "Controlled portfolio demo simulation verified.")[:200],
                amount=original_amount,
                is_simulated=True,
            )
        )
        await payment_repo.client.update_record(
            "Payments",
            payment_id,
            {"status": "completed", "transaction_id": encode_transaction_field(final_ref, history)},
        )
        if existing.get("order_id") and str(existing["order_id"]).startswith("rec"):
            try:
                await order_repo.update(str(existing["order_id"]), OrderUpdateStatus(payment_status="paid"))
            except Exception:
                pass
        return await get_payment(payment_id, admin)

    if action == "mark_failed":
        reason = (payload.reason or payload.failure_reason or "").strip()
        if len(reason) < 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A failure reason is required.")
        history.append(
            PaymentAuditEntry(
                at=now_iso,
                action="marked_failed",
                status="failed",
                by=actor,
                role=actor_role,
                ref=primary_ref,
                reason=reason[:240],
                is_simulated=is_sim,
            )
        )
        await payment_repo.client.update_record(
            "Payments",
            payment_id,
            {"status": "failed", "transaction_id": encode_transaction_field(primary_ref, history)},
        )
        if existing.get("order_id") and str(existing["order_id"]).startswith("rec"):
            try:
                await order_repo.update(str(existing["order_id"]), OrderUpdateStatus(payment_status="failed"))
            except Exception:
                pass
        return await get_payment(payment_id, admin)

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported payment workflow action.")
