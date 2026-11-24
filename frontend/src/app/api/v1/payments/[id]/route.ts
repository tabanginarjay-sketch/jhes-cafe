import { NextRequest, NextResponse } from "next/server";
import { airtableCreate, airtableGet, airtableList, airtableUpdate } from "@/lib/airtable";
import { escapeFormulaString, getAuthenticatedAdmin } from "@/lib/serverAuth";
import {
  encodeRefundTransactionId,
  encodeTransactionField,
  isCartRecord,
  isLoyaltyRecord,
  isRefundRecord,
  normalizePaymentStatus,
  normalizePaymentsWithLinks,
  normalizeProvider,
  ONLINE_PAYMENT_PROVIDERS,
  parseTransactionField,
  type PaymentAuditEntry,
} from "@/lib/paymentLedger";

const IMMUTABLE_FIELDS = [
  "amount",
  "provider",
  "payment_method",
  "payment_ref",
  "order_id",
  "order_number",
  "transaction_id",
  "currency",
];

async function syncLinkedOrderPaymentStatus(
  existing: Record<string, any>,
  orderPaymentStatus: "paid" | "pending" | "failed" | "refunded"
) {
  try {
    let targetOrderId: string | null =
      existing.order_id && String(existing.order_id).startsWith("rec")
        ? String(existing.order_id)
        : null;

    if (!targetOrderId && existing.order_number) {
      const safeNum = escapeFormulaString(String(existing.order_number));
      const matches = await airtableList("Orders", `{order_number} = '${safeNum}'`, true);
      if (matches.length > 0) targetOrderId = matches[0].id;
    }

    if (targetOrderId) {
      // STRICTLY update only payment_status — NEVER alter order preparation status
      await airtableUpdate("Orders", targetOrderId, {
        payment_status: orderPaymentStatus,
      });
    }
  } catch (syncErr) {
    console.warn("Linked order payment_status sync warning:", syncErr);
  }
}

async function fetchNormalizedPaymentById(paymentId: string) {
  const [rawPayments, rawOrders] = await Promise.all([
    airtableList("Payments", undefined, true),
    airtableList("Orders", undefined, true).catch(() => []),
  ]);
  const { payments } = normalizePaymentsWithLinks(rawPayments, rawOrders);
  return payments.find((p) => p.id === paymentId) || null;
}

/**
 * GET /api/v1/payments/[id]
 * Returns full detailed view of a single order payment including customer metadata,
 * verification history, failure reason, and linked refund record.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const raw: any = await airtableGet("Payments", id);

    if (isLoyaltyRecord(raw) || isCartRecord(raw) || isRefundRecord(raw)) {
      return NextResponse.json(
        { detail: "Record is not a customer order payment transaction." },
        { status: 404 }
      );
    }

    const detailed = await fetchNormalizedPaymentById(id);
    if (!detailed) {
      return NextResponse.json({ detail: "Payment not found." }, { status: 404 });
    }

    return NextResponse.json(detailed, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment not found";
    const status = msg.includes("(404)") ? 404 : 500;
    return NextResponse.json({ detail: msg }, { status });
  }
}

/**
 * PATCH /api/v1/payments/[id]
 * Enforces strict payment status security, immutability, provider-aware verification,
 * mandatory failure reasons, and auditable linked refunds.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // 1. Block arbitrary edits to immutable financial fields
    const attemptedImmutable = IMMUTABLE_FIELDS.filter((field) => body[field] !== undefined);
    if (attemptedImmutable.length > 0) {
      return NextResponse.json(
        {
          detail: `Arbitrary editing of payment fields (${attemptedImmutable.join(", ")}) is forbidden. Payment records are immutable; use the auditable verification or refund workflow.`,
          immutable_fields: attemptedImmutable,
        },
        { status: 403 }
      );
    }

    const existing: any = await airtableGet("Payments", id);

    // 2. Prevent mutating loyalty transactions, refund child records, or cart records
    if (isLoyaltyRecord(existing)) {
      return NextResponse.json(
        { detail: "Loyalty Bean Points transactions cannot be modified via the Payments API." },
        { status: 403 }
      );
    }
    if (isRefundRecord(existing)) {
      return NextResponse.json(
        { detail: "Refund records are immutable audit entries and cannot be modified." },
        { status: 403 }
      );
    }
    if (isCartRecord(existing)) {
      return NextResponse.json(
        { detail: "Cart records are not monetary payments." },
        { status: 400 }
      );
    }

    const currentStatus = normalizePaymentStatus(existing.status);
    const provider = normalizeProvider(existing.provider);
    const originalAmount = Number(existing.amount) || 0;
    const parsedTx = parseTransactionField(existing.transaction_id, existing);
    const nowIso = new Date().toISOString();

    const rawAction = String(body.action || "").toLowerCase().trim();
    const rawStatus = String(body.status || "").toLowerCase().trim();

    // Determine intended workflow action
    let action = rawAction;
    if (!action && rawStatus) {
      if (rawStatus === "failed") action = "mark_failed";
      else if (rawStatus === "refunded") action = "refund";
      else if (rawStatus === "completed" || rawStatus === "paid") {
        action = provider === "cash" ? "confirm_cash" : "generic_complete_blocked";
      } else {
        action = "unsupported";
      }
    }

    // 3. Enforce immutable terminal states
    if (currentStatus === "failed") {
      return NextResponse.json(
        { detail: "Failed payment records are immutable terminal records and cannot be modified." },
        { status: 403 }
      );
    }
    if (currentStatus === "refunded") {
      return NextResponse.json(
        { detail: "Refunded payment records are immutable terminal records and cannot be modified." },
        { status: 403 }
      );
    }

    // 4. Handle COMPLETED payment -> ONLY auditable refund workflow allowed
    if (currentStatus === "completed") {
      if (action !== "refund") {
        return NextResponse.json(
          {
            detail:
              "Completed payment records cannot be arbitrarily edited or reverted. Use the auditable refund workflow to reverse a payment.",
          },
          { status: 403 }
        );
      }

      const refundReason = String(body.reason || body.refund_reason || "").trim();
      if (refundReason.length < 3) {
        return NextResponse.json(
          { detail: "A clear refund reason (at least 3 characters) is required for auditability." },
          { status: 400 }
        );
      }

      const requestedRefundAmount =
        body.refund_amount !== undefined && body.refund_amount !== null && body.refund_amount !== ""
          ? Number(body.refund_amount)
          : originalAmount;

      if (
        !Number.isFinite(requestedRefundAmount) ||
        requestedRefundAmount <= 0 ||
        requestedRefundAmount > originalAmount
      ) {
        return NextResponse.json(
          {
            detail: `Refund amount must be greater than ₱0 and cannot exceed the original payment amount of ₱${originalAmount.toFixed(2)}.`,
          },
          { status: 400 }
        );
      }

      const safeRefundAmount = Math.round(requestedRefundAmount * 100) / 100;
      const refundRef = `REF-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      // Create dedicated linked Refund record in Airtable Payments preserving relational links
      const refundTxEncoded = encodeRefundTransactionId({
        original_payment_id: id,
        original_payment_ref: String(existing.payment_ref || id),
        by: admin.name,
        role: admin.role,
        reason: refundReason.slice(0, 240),
        at: nowIso,
      });

      const createdRefundRecord: any = await airtableCreate("Payments", {
        payment_ref: refundRef,
        order_id: String(existing.order_id || ""),
        order_number: String(existing.order_number || ""),
        amount: safeRefundAmount,
        provider: `${provider}_refund`,
        status: "refunded",
        transaction_id: refundTxEncoded,
      });

      const auditEntry: PaymentAuditEntry = {
        at: nowIso,
        action: "refunded",
        status: "refunded",
        by: admin.name,
        role: admin.role,
        ref: refundRef,
        reason: refundReason.slice(0, 240),
        amount: safeRefundAmount,
        is_simulated: parsedTx.isSimulated,
      };

      const nextTxField = encodeTransactionField(parsedTx.primaryRef, [
        ...parsedTx.auditEntries,
        auditEntry,
      ]);

      await airtableUpdate("Payments", id, {
        status: "refunded",
        transaction_id: nextTxField,
      });

      await syncLinkedOrderPaymentStatus(existing, "refunded");

      const updatedNormalized = await fetchNormalizedPaymentById(id);
      return NextResponse.json({
        ...(updatedNormalized || {}),
        refund_record_id: createdRefundRecord.id,
        refund_ref: refundRef,
      });
    }

    // 5. Handle PENDING payment workflows
    if (action === "generic_complete_blocked") {
      return NextResponse.json(
        {
          detail:
            `Online ${provider.toUpperCase()} payments cannot be marked completed via a generic button. ` +
            `Live payments require a verified provider webhook; portfolio demo transactions must use the controlled demo verification workflow with explicit acknowledgement and reference.`,
        },
        { status: 403 }
      );
    }

    if (action === "confirm_cash") {
      if (provider !== "cash") {
        return NextResponse.json(
          {
            detail: `Cashier counter confirmation is only permitted for Cash payments (this transaction uses ${provider.toUpperCase()}).`,
          },
          { status: 403 }
        );
      }

      const receiptRef = String(body.receipt_reference || body.verification_reference || "")
        .trim()
        .replace(/[^A-Za-z0-9-_]/g, "")
        .slice(0, 48);
      const note = String(body.note || body.reason || "Counter cash received and verified by cashier.")
        .trim()
        .slice(0, 200);
      const confirmedRef = receiptRef
        ? `CASH-CONFIRMED-${receiptRef}`
        : `CASH-CONFIRMED-${Date.now()}`;

      const auditEntry: PaymentAuditEntry = {
        at: nowIso,
        action: "cash_confirmed",
        status: "completed",
        by: admin.name,
        role: admin.role,
        ref: confirmedRef,
        reason: note,
        amount: originalAmount,
        is_simulated: false,
      };

      const nextTxField = encodeTransactionField(confirmedRef, [
        ...parsedTx.auditEntries,
        auditEntry,
      ]);

      await airtableUpdate("Payments", id, {
        status: "completed",
        transaction_id: nextTxField,
      });

      await syncLinkedOrderPaymentStatus(existing, "paid");
      const updatedNormalized = await fetchNormalizedPaymentById(id);
      return NextResponse.json(updatedNormalized);
    }

    if (action === "verify_demo") {
      if (!ONLINE_PAYMENT_PROVIDERS.has(provider)) {
        return NextResponse.json(
          { detail: "Controlled demo verification applies only to online providers (GCash, Maya, Card)." },
          { status: 400 }
        );
      }

      if (body.demo_acknowledgement !== true) {
        return NextResponse.json(
          {
            detail:
              "Explicit demo acknowledgement is required: simulated portfolio payments must never be represented as real live money received.",
          },
          { status: 400 }
        );
      }

      const demoRef = String(body.verification_reference || "")
        .trim()
        .replace(/[^A-Za-z0-9-_]/g, "")
        .slice(0, 48);
      if (demoRef.length < 4) {
        return NextResponse.json(
          { detail: "A simulated verification reference (at least 4 characters) is required." },
          { status: 400 }
        );
      }

      const note = String(
        body.note || "Controlled portfolio demo verification (simulated — no real funds settled)."
      )
        .trim()
        .slice(0, 200);

      const finalRef = demoRef.toUpperCase().startsWith("DEMO-")
        ? demoRef.toUpperCase()
        : `DEMO-VERIFIED-${provider.toUpperCase()}-${demoRef.toUpperCase()}`;

      const auditEntry: PaymentAuditEntry = {
        at: nowIso,
        action: "demo_verified",
        status: "completed",
        by: admin.name,
        role: admin.role,
        ref: finalRef,
        reason: note,
        amount: originalAmount,
        is_simulated: true,
      };

      const nextTxField = encodeTransactionField(finalRef, [
        ...parsedTx.auditEntries,
        auditEntry,
      ]);

      await airtableUpdate("Payments", id, {
        status: "completed",
        transaction_id: nextTxField,
      });

      await syncLinkedOrderPaymentStatus(existing, "paid");
      const updatedNormalized = await fetchNormalizedPaymentById(id);
      return NextResponse.json(updatedNormalized);
    }

    if (action === "mark_failed") {
      const failureReason = String(body.reason || body.failure_reason || "").trim();
      if (failureReason.length < 3) {
        return NextResponse.json(
          { detail: "A failure reason (at least 3 characters) is required when marking a payment failed." },
          { status: 400 }
        );
      }

      const auditEntry: PaymentAuditEntry = {
        at: nowIso,
        action: "marked_failed",
        status: "failed",
        by: admin.name,
        role: admin.role,
        ref: parsedTx.primaryRef,
        reason: failureReason.slice(0, 240),
        is_simulated: parsedTx.isSimulated,
      };

      const nextTxField = encodeTransactionField(parsedTx.primaryRef, [
        ...parsedTx.auditEntries,
        auditEntry,
      ]);

      await airtableUpdate("Payments", id, {
        status: "failed",
        transaction_id: nextTxField,
      });

      await syncLinkedOrderPaymentStatus(existing, "failed");
      const updatedNormalized = await fetchNormalizedPaymentById(id);
      return NextResponse.json(updatedNormalized);
    }

    return NextResponse.json(
      {
        detail:
          "Unsupported payment action. Allowed actions: confirm_cash (pending cash), verify_demo (pending online demo), mark_failed (pending with reason), refund (completed with reason).",
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error updating payment status" },
      { status: 500 }
    );
  }
}
