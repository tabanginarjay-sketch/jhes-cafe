import { NextRequest, NextResponse } from "next/server";
import { airtableGet, airtableList, airtableUpdate } from "@/lib/airtable";
import { escapeFormulaString, getAuthenticatedAdmin } from "@/lib/serverAuth";

/**
 * PATCH /api/v1/payments/[id]
 * Allows administrators to confirm, fail, or refund a payment transaction,
 * automatically synchronizing the linked Orders.payment_status field in Airtable.
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
    const nextStatus = String(body.status || "").toLowerCase().trim();
    const allowed = ["unpaid", "pending", "paid", "completed", "failed", "refunded"];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { detail: `Invalid payment status. Must be one of: ${allowed.join(", ")}.` },
        { status: 400 }
      );
    }

    const existing: any = await airtableGet("Payments", id);
    const storedPaymentStatus = nextStatus === "paid" ? "completed" : nextStatus;
    const fields: Record<string, unknown> = { status: storedPaymentStatus };
    if (body.transaction_id !== undefined) {
      fields.transaction_id = String(body.transaction_id).trim();
    } else if (
      storedPaymentStatus === "completed" &&
      /^(AWAITING-|COUNTER-CASH-PENDING|DEMO-SIMULATED-PENDING)/.test(
        String(existing.transaction_id || "")
      )
    ) {
      fields.transaction_id = `CONFIRMED-${Date.now()}`;
    }

    const updated: any = await airtableUpdate("Payments", id, fields);

    // Sync linked Order record's separated payment_status enum
    const orderPaymentStatus =
      storedPaymentStatus === "completed"
        ? "paid"
        : storedPaymentStatus === "unpaid"
          ? "unpaid"
          : storedPaymentStatus === "failed"
            ? "failed"
            : storedPaymentStatus === "refunded"
              ? "refunded"
              : "pending";

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
        await airtableUpdate("Orders", targetOrderId, {
          payment_status: orderPaymentStatus,
        });
      }
    } catch (syncErr) {
      console.warn("Linked order payment_status sync warning:", syncErr);
    }

    return NextResponse.json({
      ...updated,
      synced_order_payment_status: orderPaymentStatus,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update payment status" },
      { status: 500 }
    );
  }
}
