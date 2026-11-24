import { NextRequest, NextResponse } from "next/server";
import { airtableGet, airtableUpdate, airtableList, airtableDelete } from "@/lib/airtable";
import { escapeFormulaString, getAuthenticatedAdmin, getAuthenticatedUser } from "@/lib/serverAuth";
import { isAuthCredentialRecord, isDeliverySystemRecord, isLoyaltyRecord } from "@/lib/paymentLedger";
import { getDeliveryByOrderIdOrNumber } from "@/lib/deliveryStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();
    const safeId = escapeFormulaString(cleanId);

    // 1. Lookup by Airtable record ID or exact order_number (case-insensitive)
    let order: any = null;
    if (cleanId.startsWith("rec")) {
      try {
        order = await airtableGet("Orders", cleanId);
      } catch {
        order = null;
      }
    }
    if (!order) {
      const matched = await airtableList(
        "Orders",
        `LOWER({order_number}) = '${safeId.toLowerCase()}'`,
        true
      );
      if (matched.length > 0) {
        order = matched[0];
      }
    }

    if (!order) {
      return NextResponse.json({ detail: "Order not found" }, { status: 404 });
    }

    // Never expose internal shopping cart drafts as submitted orders
    const ordSt = String(order.status || "").toLowerCase().trim();
    const ordNumUpper = String(order.order_number || "").toUpperCase().trim();
    if (ordSt === "cart" || ordSt === "cart_cleared" || ordNumUpper.startsWith("CART-")) {
      return NextResponse.json({ detail: "Order not found" }, { status: 404 });
    }

    // 2. Fetch child OrderItems matching either Airtable order record ID OR order_number
    let items: any[] = [];
    try {
      const safeRecId = escapeFormulaString(String(order.id));
      const safeOrderNum = escapeFormulaString(String(order.order_number || ""));
      const itemFormula = safeOrderNum
        ? `OR({order_id} = '${safeRecId}', {order_id} = '${safeOrderNum}')`
        : `{order_id} = '${safeRecId}'`;
      items = await airtableList("OrderItems", itemFormula, true);
    } catch {
      items = [];
    }

    // Normalize status & payment_status (trim legacy newlines and normalize COD pending)
    const normalizedStatus = order.status ? String(order.status).trim() : "pending";
    let normalizedPayStatus = order.payment_status ? String(order.payment_status).trim() : "pending";
    if (
      String(order.payment_method || "").toLowerCase().trim() === "cod" &&
      normalizedPayStatus.toLowerCase() === "pending"
    ) {
      normalizedPayStatus = "cod_pending";
    }

    // Attach linked delivery tracking for Delivery orders
    let linkedDelivery: any = null;
    if (String(order.dining_option || "").toLowerCase().trim() === "delivery") {
      linkedDelivery = await getDeliveryByOrderIdOrNumber(
        String(order.id),
        order.order_number ? String(order.order_number) : null
      ).catch(() => null);
    }

    // Privacy: mask personal identity, address, and private delivery instructions for unauthenticated lookups
    const admin = getAuthenticatedAdmin(req);
    const user = getAuthenticatedUser(req);
    const isOwner =
      Boolean(admin) ||
      Boolean(
        user?.email &&
          order.customer_email &&
          user.email.toLowerCase() === String(order.customer_email).toLowerCase()
      );

    const safeDelivery = linkedDelivery
      ? isOwner
        ? linkedDelivery
        : {
            id: linkedDelivery.id,
            delivery_ref: linkedDelivery.delivery_ref,
            delivery_status: linkedDelivery.delivery_status,
            estimated_delivery_time: linkedDelivery.estimated_delivery_time,
            zone_label: linkedDelivery.zone_label,
            delivery_fee: linkedDelivery.delivery_fee,
            delivered_at: linkedDelivery.delivered_at,
          }
      : null;

    const responseOrder = isOwner
      ? {
          ...order,
          status: normalizedStatus,
          payment_status: normalizedPayStatus,
          ...(safeDelivery ? { delivery: safeDelivery, delivery_fee: safeDelivery.delivery_fee } : {}),
        }
      : {
          ...order,
          status: normalizedStatus,
          payment_status: normalizedPayStatus,
          customer_name: "Verified Member",
          customer_email: undefined,
          customer_phone: undefined,
          special_notes: undefined,
          ...(safeDelivery ? { delivery: safeDelivery, delivery_fee: safeDelivery.delivery_fee } : {}),
        };

    return NextResponse.json(
      {
        ...responseOrder,
        is_owner: isOwner,
        items,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error retrieving order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required to update orders." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();

    let targetRecordId = id;
    if (!id.startsWith("rec")) {
      const safeId = escapeFormulaString(id);
      const matched = await airtableList("Orders", `{order_number} = '${safeId}'`, true);
      if (matched.length === 0) {
        return NextResponse.json({ detail: "Order not found" }, { status: 404 });
      }
      targetRecordId = matched[0].id;
    }

    const ALLOWED_ORDER_STATUSES = new Set([
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ]);
    const ALLOWED_PAYMENT_STATUSES = new Set([
      "unpaid",
      "pending",
      "cod_pending",
      "paid",
      "failed",
      "refunded",
    ]);

    const fieldsToUpdate: Record<string, unknown> = {};
    if (body.status) {
      const normalizedStatus = String(body.status).toLowerCase().trim();
      if (!ALLOWED_ORDER_STATUSES.has(normalizedStatus)) {
        return NextResponse.json(
          { detail: `Invalid order_status. Allowed: ${Array.from(ALLOWED_ORDER_STATUSES).join(", ")}.` },
          { status: 400 }
        );
      }
      fieldsToUpdate.status = normalizedStatus;
    }
    if (body.payment_status) {
      const normalizedPayStatus = String(body.payment_status).toLowerCase().trim();
      if (!ALLOWED_PAYMENT_STATUSES.has(normalizedPayStatus)) {
        return NextResponse.json(
          { detail: `Invalid payment_status. Allowed: ${Array.from(ALLOWED_PAYMENT_STATUSES).join(", ")}.` },
          { status: 400 }
        );
      }
      fieldsToUpdate.payment_status = normalizedPayStatus;
    }
    if (body.special_notes !== undefined) fieldsToUpdate.special_notes = body.special_notes;

    const updated = await airtableUpdate("Orders", targetRecordId, fieldsToUpdate);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error updating order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    // Also clean up child OrderItems & Payments linked to this order if present
    try {
      const safeId = escapeFormulaString(id);
      const childItems = await airtableList("OrderItems", `{order_id} = '${safeId}'`, true);
      for (const item of childItems) {
        await airtableDelete("OrderItems", item.id).catch(() => {});
      }
      const childPayments = await airtableList("Payments", `{order_id} = '${safeId}'`, true);
      for (const pay of childPayments) {
        if (
          isAuthCredentialRecord(pay) ||
          isLoyaltyRecord(pay) ||
          (isDeliverySystemRecord(pay) && String(pay.provider || "").toLowerCase() !== "delivery_dispatch")
        ) {
          continue;
        }
        await airtableDelete("Payments", pay.id).catch(() => {});
      }
    } catch {
      // Ignore child lookup errors
    }

    await airtableDelete("Orders", id);
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error deleting order" },
      { status: 500 }
    );
  }
}
