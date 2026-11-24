"""Payments repository backed by Airtable with strict record type separation."""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.core.base_repository import BaseAirtableRepository
from app.modules.payments.schemas import (
    LinkedRefundRecord,
    LoyaltyTransactionResponse,
    PaymentAuditEntry,
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)

AUDIT_SEPARATOR = " || AUDIT:"
REFUND_PREFIX = "REFUND-OF:"
ONLINE_PROVIDERS = {"gcash", "maya", "card"}
VALID_PROVIDERS = {"cash", "gcash", "maya", "card"}


def is_loyalty_record(rec: Dict[str, Any]) -> bool:
    provider = str(rec.get("provider") or "").strip().lower()
    payment_ref = str(rec.get("payment_ref") or "").strip().upper()
    order_number = str(rec.get("order_number") or "").strip().upper()
    return (
        provider == "loyalty_bean_points"
        or provider.startswith("loyalty")
        or payment_ref.startswith("LTX-")
        or order_number.startswith("LOYALTY-")
        or order_number.startswith("LOYALTY_")
    )


def is_refund_record(rec: Dict[str, Any]) -> bool:
    provider = str(rec.get("provider") or "").strip().lower()
    payment_ref = str(rec.get("payment_ref") or "").strip().upper()
    tx_id = str(rec.get("transaction_id") or "").strip()
    return (
        payment_ref.startswith("REF-")
        or provider.endswith("_refund")
        or provider == "refund"
        or tx_id.startswith(REFUND_PREFIX)
    )


def is_cart_record(rec: Dict[str, Any]) -> bool:
    status = str(rec.get("status") or "").strip().lower()
    pay_status = str(rec.get("payment_status") or "").strip().lower()
    order_number = str(rec.get("order_number") or "").strip().upper()
    provider = str(rec.get("provider") or "").strip().lower()
    return (
        status in {"cart", "cart_cleared"}
        or pay_status == "cart"
        or order_number.startswith("CART-")
        or provider == "cart"
    )


def is_auth_credential_record(rec: Dict[str, Any]) -> bool:
    provider = str(rec.get("provider") or "").strip().lower()
    payment_ref = str(rec.get("payment_ref") or "").strip().upper()
    order_number = str(rec.get("order_number") or "").strip().upper()
    return (
        provider == "auth_credential"
        or payment_ref.startswith("AUTH-CRED-")
        or order_number == "AUTH-CREDENTIAL"
    )


def is_order_payment_record(rec: Dict[str, Any]) -> bool:
    return (
        not is_loyalty_record(rec)
        and not is_refund_record(rec)
        and not is_cart_record(rec)
        and not is_auth_credential_record(rec)
    )


def normalize_payment_status(raw: Any) -> str:
    s = str(raw or "pending").strip().lower()
    if s in {"completed", "paid"}:
        return "completed"
    if s == "failed":
        return "failed"
    if s == "refunded":
        return "refunded"
    return "pending"


def parse_transaction_field(
    raw_tx: Optional[str], raw_record: Dict[str, Any]
) -> Tuple[str, List[PaymentAuditEntry], Optional[str], bool, str, str]:
    tx_str = str(raw_tx or "").strip()
    primary_ref = tx_str
    parsed_entries: List[PaymentAuditEntry] = []

    if AUDIT_SEPARATOR in tx_str:
        primary_part, json_part = tx_str.split(AUDIT_SEPARATOR, 1)
        primary_ref = primary_part.strip()
        try:
            loaded = json.loads(json_part.strip())
            if isinstance(loaded, list):
                parsed_entries = [PaymentAuditEntry(**item) for item in loaded if isinstance(item, dict)]
        except Exception:
            parsed_entries = []

    status = normalize_payment_status(raw_record.get("status"))
    provider = str(raw_record.get("provider") or "cash").strip().lower()
    created_at = str(raw_record.get("created_at") or datetime.now(timezone.utc).isoformat())

    if not any(e.action == "created" for e in parsed_entries):
        parsed_entries.insert(
            0,
            PaymentAuditEntry(
                at=created_at,
                action="created",
                status="pending",
                by="Checkout System",
                role="system",
                ref=primary_ref or str(raw_record.get("payment_ref") or ""),
                is_simulated=provider in ONLINE_PROVIDERS and (
                    primary_ref.startswith("DEMO-") or primary_ref.startswith("AWAITING-")
                ),
            ),
        )

    failure_reason = next(
        (e.reason for e in reversed(parsed_entries) if e.action == "marked_failed" and e.reason),
        "Payment failed or declined." if status == "failed" else None,
    )

    is_simulated = False
    verification_mode = "unverified"
    if primary_ref.startswith("WEBHOOK-VERIFIED-"):
        verification_mode = "provider_webhook"
    elif provider == "cash" and (
        primary_ref.startswith("CASH-CONFIRMED-") or (status == "completed" and primary_ref.startswith("CONFIRMED-"))
    ):
        verification_mode = "cashier_counter"
    elif (
        primary_ref.startswith("DEMO-")
        or str(raw_record.get("order_id") or "") == "recSample"
        or str(raw_record.get("order_number") or "") == "ORD-1001"
        or (provider in ONLINE_PROVIDERS and status == "completed")
    ):
        verification_mode = "demo_simulated"
        is_simulated = True
    elif provider in ONLINE_PROVIDERS:
        is_simulated = primary_ref.startswith("DEMO-") or primary_ref.startswith("AWAITING-")

    updated_at = parsed_entries[-1].at if parsed_entries else created_at
    return primary_ref, parsed_entries, failure_reason, is_simulated, verification_mode, updated_at


def encode_transaction_field(primary_ref: str, entries: List[PaymentAuditEntry]) -> str:
    clean_primary = str(primary_ref or "").split(AUDIT_SEPARATOR)[0].strip()
    bounded = [e.model_dump(exclude_none=True) for e in entries[-12:]]
    return f"{clean_primary}{AUDIT_SEPARATOR}{json.dumps(bounded, separators=(',', ':'))}"


def parse_refund_record(raw: Dict[str, Any]) -> LinkedRefundRecord:
    tx_str = str(raw.get("transaction_id") or "").strip()
    meta: Dict[str, Any] = {}
    if tx_str.startswith(REFUND_PREFIX):
        try:
            meta = json.loads(tx_str[len(REFUND_PREFIX) :].strip())
        except Exception:
            meta = {}
    return LinkedRefundRecord(
        id=str(raw.get("id") or ""),
        refund_ref=str(raw.get("payment_ref") or raw.get("id") or ""),
        original_payment_id=str(meta.get("original_payment_id") or ""),
        original_payment_ref=str(meta.get("original_payment_ref") or ""),
        order_id=str(raw.get("order_id") or ""),
        order_number=str(raw.get("order_number") or ""),
        amount=float(raw.get("amount") or 0),
        currency="PHP",
        provider=str(raw.get("provider") or "cash").replace("_refund", ""),
        reason=str(meta.get("reason") or "Refund issued by administrator"),
        refunded_by=str(meta.get("by") or "Administrator"),
        refunded_role=meta.get("role"),
        refunded_at=str(meta.get("at") or raw.get("created_at") or ""),
    )


class PaymentRepository(BaseAirtableRepository[PaymentResponse, PaymentCreate, PaymentUpdate]):
    table_name = "Payments"
    response_model = PaymentResponse

    async def list_raw_records(self, filter_by_formula: Optional[str] = None) -> List[Dict[str, Any]]:
        records = await self.client.list_records(self.table_name, filter_by_formula=filter_by_formula)
        return [
            {"id": r["id"], "created_at": r.get("createdTime"), **(r.get("fields") or {})}
            for r in records
        ]

    async def list_order_payments(self, order_id: Optional[str] = None) -> List[PaymentResponse]:
        formula = f"{{order_id}} = '{order_id}'" if order_id else None
        raw_payments = await self.list_raw_records(filter_by_formula=formula)
        raw_orders = await self.client.list_records("Orders")
        order_map: Dict[str, Dict[str, Any]] = {}
        order_num_map: Dict[str, Dict[str, Any]] = {}
        for o in raw_orders:
            f = o.get("fields") or {}
            flat = {"id": o["id"], "created_at": o.get("createdTime"), **f}
            if is_cart_record(flat):
                continue
            order_map[o["id"]] = flat
            if flat.get("order_number"):
                order_num_map[str(flat["order_number"]).upper().strip()] = flat

        refunds_by_pid: Dict[str, LinkedRefundRecord] = {}
        for row in raw_payments:
            if is_refund_record(row):
                ref = parse_refund_record(row)
                if ref.original_payment_id:
                    refunds_by_pid[ref.original_payment_id] = ref

        results: List[PaymentResponse] = []
        for row in raw_payments:
            if not is_order_payment_record(row):
                continue
            ord_id = str(row.get("order_id") or "")
            ord_num = str(row.get("order_number") or "")
            linked_ord = order_map.get(ord_id) or order_num_map.get(ord_num.upper().strip())
            primary_ref, history, fail_reason, is_sim, mode, updated_at = parse_transaction_field(
                row.get("transaction_id"), row
            )
            provider = str(row.get("provider") or "cash").strip().lower()
            results.append(
                PaymentResponse(
                    id=str(row["id"]),
                    payment_ref=str(row.get("payment_ref") or row["id"]),
                    order_id=ord_id,
                    order_number=ord_num,
                    amount=max(0.01, float(row.get("amount") or 0.01)),
                    provider=provider,
                    payment_method=provider,
                    status=normalize_payment_status(row.get("status")),
                    transaction_id=primary_ref,
                    provider_transaction_ref=primary_ref,
                    created_at=row.get("created_at"),
                    updated_at=updated_at,
                    currency="PHP",
                    customer_name=linked_ord.get("customer_name") if linked_ord else "Registered Customer",
                    customer_email=linked_ord.get("customer_email") if linked_ord else None,
                    order_status=str(linked_ord.get("status") or "").strip() if linked_ord else None,
                    is_simulated=is_sim,
                    verification_mode=mode,
                    failure_reason=fail_reason,
                    refund=refunds_by_pid.get(str(row["id"])),
                    verification_history=history,
                )
            )
        results.sort(key=lambda p: str(p.created_at or ""), reverse=True)
        return results

    async def list_loyalty_transactions(self) -> List[LoyaltyTransactionResponse]:
        raw_payments = await self.list_raw_records()
        raw_users = await self.client.list_records("Users")
        user_map = {u["id"]: u.get("fields") or {} for u in raw_users}

        txs: List[LoyaltyTransactionResponse] = []
        for row in raw_payments:
            if not is_loyalty_record(row):
                continue
            cid = str(row.get("order_id") or "")
            u = user_map.get(cid, {})
            raw_type = str(row.get("order_number") or "").upper()
            pts = abs(int(float(row.get("amount") or 0)))
            tx_id = str(row.get("transaction_id") or "")
            tx_type = "adjustment"
            signed = pts
            order_ref = None
            desc = "Loyalty Bean Points adjustment"
            if "SIGNUP" in raw_type:
                tx_type = "signup_bonus"
                desc = "Welcome bonus awarded upon registration"
            elif "ORDER_EARNED" in raw_type or "EARN" in raw_type:
                tx_type = "order_earned"
                parts = tx_id.split("-")
                if len(parts) >= 3 and parts[0] == "ORD":
                    order_ref = "-".join(parts[2:])
                desc = f"Bean Points earned from Order #{order_ref}" if order_ref else "Bean Points earned from order"
            elif "REDEEM" in raw_type:
                tx_type = "redemption"
                signed = -pts
                desc = "Bean Points redeemed"
            txs.append(
                LoyaltyTransactionResponse(
                    id=str(row["id"]),
                    transaction_ref=str(row.get("payment_ref") or row["id"]),
                    customer_id=cid,
                    customer_name=str(u.get("full_name") or "Registered Member"),
                    customer_email=u.get("email"),
                    transaction_type=tx_type,
                    points=pts,
                    signed_points=signed,
                    order_reference=order_ref,
                    idempotency_key=tx_id,
                    description=desc,
                    created_at=row.get("created_at"),
                )
            )
        txs.sort(key=lambda t: str(t.created_at or ""), reverse=True)
        return txs

    async def list_by_order(self, order_id: str) -> List[PaymentResponse]:
        """Fetch genuine order payment records associated with an order."""
        return await self.list_order_payments(order_id=order_id)
