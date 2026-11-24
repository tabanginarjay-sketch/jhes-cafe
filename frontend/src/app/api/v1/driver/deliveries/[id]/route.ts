import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableUpdate } from "@/lib/airtable";
import { escapeFormulaString, getAuthenticatedDriver } from "@/lib/serverAuth";
import {
  createCustomerNotification,
  getDeliveryById,
  saveUpdatedDeliveryRecord,
  upsertDriverProfileMeta,
} from "@/lib/deliveryStore";
import {
  formatDeliveryStatusLabel,
  isValidDeliveryTransition,
  type DeliveryStatus,
} from "@/lib/deliveryTypes";
import {
  encodeTransactionField,
  isOrderPaymentRecord,
  parseTransactionField,
  type PaymentAuditEntry,
} from "@/lib/paymentLedger";

/**
 * PATCH /api/v1/driver/deliveries/[id]
 * Strictly scoped to the assigned driver.
 * - Rejects access to unassigned orders or orders assigned to another driver with HTTP 403.
 * - Enforces driver-specific status transitions (PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED / FAILED_DELIVERY).
 * - Records cash collection on COD delivery completion WITHOUT marking payment as PAID (admin settles COD separately).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const driver = getAuthenticatedDriver(req);
  if (!driver) {
    return NextResponse.json({ detail: "Driver authentication required." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const delivery = await getDeliveryById(id);
    if (!delivery) {
      return NextResponse.json({ detail: "Delivery record not found." }, { status: 404 });
    }

    // Strict assignment ownership enforcement
    if (!delivery.driver_id || delivery.driver_id !== driver.sub) {
      return NextResponse.json(
        { detail: "Access denied: this delivery is not assigned to you." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = String(body.action || "").trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // Never permit drivers to directly mark payments as PAID / completed
    if (body.payment_status !== undefined || action.includes("confirm_payment") || action.includes("confirm_cod")) {
      return NextResponse.json(
        {
          detail:
            "Drivers cannot confirm payment settlement directly. Record COD cash collected on delivery completion; authorized admin/cashier confirms COD settlement separately.",
        },
        { status: 403 }
      );
    }

    // 1. Acknowledge Assignment
    if (action === "acknowledge") {
      delivery.driver_acknowledged_at = nowIso;
      delivery.audit_trail.push({
        at: nowIso,
        action: "driver_acknowledged",
        from_status: delivery.delivery_status,
        to_status: delivery.delivery_status,
        by: driver.name,
        role: "driver",
        note: `Driver ${driver.name} (${driver.staff_id}) acknowledged delivery assignment.`,
      });
      const saved = await saveUpdatedDeliveryRecord(delivery);
      return NextResponse.json({ ...saved, confirmation_code: undefined, has_confirmation_code: true });
    }

    // 2. Driver Status Transition
    if (action === "update_status") {
      const nextStatus = String(body.delivery_status || "").toUpperCase().trim() as DeliveryStatus;
      if (!isValidDeliveryTransition(delivery.delivery_status, nextStatus, "driver")) {
        return NextResponse.json(
          {
            detail: `Invalid driver transition from ${delivery.delivery_status} to ${nextStatus}.`,
          },
          { status: 400 }
        );
      }

      const prevStatus = delivery.delivery_status;

      if (nextStatus === "FAILED_DELIVERY") {
        const reason = String(body.reason || body.failure_reason || "").trim().slice(0, 240);
        if (reason.length < 3) {
          return NextResponse.json(
            { detail: "Please provide a clear reason describing the delivery problem (min 3 chars)." },
            { status: 400 }
          );
        }
        delivery.delivery_status = "FAILED_DELIVERY";
        delivery.failure_reason = reason;
        delivery.failed_attempts = (delivery.failed_attempts || 0) + 1;
        delivery.audit_trail.push({
          at: nowIso,
          action: "driver_reported_failure",
          from_status: prevStatus,
          to_status: "FAILED_DELIVERY",
          by: driver.name,
          role: "driver",
          note: reason,
        });
        delivery.messages.push({
          id: `msg-${Date.now()}`,
          kind: "issue",
          at: nowIso,
          sender_name: driver.name,
          sender_role: "driver",
          text: `Delivery problem reported: ${reason}`,
          issue_category: "Driver Delivery Failure",
        });

        const saved = await saveUpdatedDeliveryRecord(delivery);
        await upsertDriverProfileMeta(driver.sub, { availability_status: "available" }).catch(() => {});

        await createCustomerNotification({
          customer_id: delivery.customer_id,
          customer_email: delivery.customer_email,
          order_id: delivery.order_id,
          order_number: delivery.order_number,
          event_type: "FAILED_DELIVERY",
          title: `Delivery Issue for Order #${delivery.order_number}`,
          message: `Driver ${driver.name} reported a delivery issue: ${reason}.`,
        });

        return NextResponse.json({ ...saved, confirmation_code: undefined, has_confirmation_code: true });
      }

      if (nextStatus === "DELIVERED") {
        const proofNote = String(body.proof_note || "").trim().slice(0, 240);
        const submittedCode = String(body.confirmation_code || "").trim().toUpperCase();

        if (!proofNote && !submittedCode) {
          return NextResponse.json(
            {
              detail:
                "Please submit a proof-of-delivery note or the customer's 6-character confirmation code to complete delivery.",
            },
            { status: 400 }
          );
        }

        if (submittedCode && delivery.confirmation_code && submittedCode !== delivery.confirmation_code) {
          return NextResponse.json(
            { detail: "Customer confirmation code does not match. Please verify with the recipient." },
            { status: 400 }
          );
        }

        delivery.delivery_status = "DELIVERED";
        delivery.delivered_at = nowIso;
        delivery.proof_note =
          proofNote || `Verified recipient handoff using confirmation code ${submittedCode}.`;
        delivery.proof_confirmed_code = submittedCode || null;

        // Record COD cash collection WITHOUT changing payment_status from cod_pending to paid!
        let cashCollectionAuditNote = "";
        if (delivery.payment_method === "cod") {
          const collected =
            body.cash_collected_amount !== undefined && body.cash_collected_amount !== ""
              ? Number(body.cash_collected_amount)
              : delivery.cod_amount_due;
          if (!Number.isFinite(collected) || collected < 0) {
            return NextResponse.json(
              { detail: "Invalid cash collected amount." },
              { status: 400 }
            );
          }
          delivery.cash_collected_amount = Math.round(collected * 100) / 100;
          delivery.cash_collected_at = nowIso;
          delivery.cash_collected_by = driver.name;
          cashCollectionAuditNote = ` COD cash collected: ₱${delivery.cash_collected_amount.toFixed(2)} (awaiting authorized admin settlement).`;

          // Append a non-settling cod_collected audit entry onto the linked Payment record (keeping status=cod_pending!)
          try {
            const safeOrderNum = escapeFormulaString(delivery.order_number);
            const payRows = await airtableList("Payments", `{order_number} = '${safeOrderNum}'`, true);
            const codPayment = payRows.find((p: any) => isOrderPaymentRecord(p) && String(p.provider || "").toLowerCase() === "cod");
            if (codPayment) {
              const parsed = parseTransactionField(codPayment.transaction_id, codPayment);
              const entry: PaymentAuditEntry = {
                at: nowIso,
                action: "cod_collected",
                status: "cod_pending",
                by: driver.name,
                role: "driver",
                ref: parsed.primaryRef,
                reason: `Driver collected ₱${delivery.cash_collected_amount.toFixed(2)} cash upon delivery. Pending authorized admin/cashier confirmation.`,
                amount: delivery.cash_collected_amount,
                is_simulated: false,
              };
              await airtableUpdate("Payments", codPayment.id, {
                transaction_id: encodeTransactionField(parsed.primaryRef, [...parsed.auditEntries, entry]),
              });
            }
          } catch {
            // Non-blocking audit sync
          }
        }

        delivery.audit_trail.push({
          at: nowIso,
          action: "driver_delivered",
          from_status: prevStatus,
          to_status: "DELIVERED",
          by: driver.name,
          role: "driver",
          note: `${delivery.proof_note}${cashCollectionAuditNote}`,
        });

        const saved = await saveUpdatedDeliveryRecord(delivery);
        await upsertDriverProfileMeta(driver.sub, { availability_status: "available" }).catch(() => {});

        await createCustomerNotification({
          customer_id: delivery.customer_id,
          customer_email: delivery.customer_email,
          order_id: delivery.order_id,
          order_number: delivery.order_number,
          event_type: "DELIVERED",
          title: `Order #${delivery.order_number} Delivered`,
          message: `Delivered by ${driver.name}. Proof: ${delivery.proof_note}${
            delivery.payment_method === "cod"
              ? ` Cash collected (₱${Number(delivery.cash_collected_amount || delivery.cod_amount_due).toFixed(2)}) — awaiting cashier confirmation.`
              : ""
          }`,
        });

        return NextResponse.json({ ...saved, confirmation_code: undefined, has_confirmation_code: true });
      }

      // PICKED_UP or OUT_FOR_DELIVERY
      delivery.delivery_status = nextStatus;
      if (!delivery.driver_acknowledged_at) {
        delivery.driver_acknowledged_at = nowIso;
      }
      delivery.audit_trail.push({
        at: nowIso,
        action: `driver_${nextStatus.toLowerCase()}`,
        from_status: prevStatus,
        to_status: nextStatus,
        by: driver.name,
        role: "driver",
        note:
          nextStatus === "PICKED_UP"
            ? `Driver ${driver.name} picked up order from Jhe's Cafe' counter.`
            : `Driver ${driver.name} is now out for delivery to ${delivery.zone_label}.`,
      });

      const saved = await saveUpdatedDeliveryRecord(delivery);

      await createCustomerNotification({
        customer_id: delivery.customer_id,
        customer_email: delivery.customer_email,
        order_id: delivery.order_id,
        order_number: delivery.order_number,
        event_type: nextStatus,
        title: `Order #${delivery.order_number}: ${formatDeliveryStatusLabel(nextStatus)}`,
        message:
          nextStatus === "PICKED_UP"
            ? `Driver ${driver.name} has picked up your freshly crafted order from Jhe's Cafe'.`
            : `Driver ${driver.name} is on the way to ${delivery.barangay}, ${delivery.city}. Estimated delivery time: ${delivery.estimated_delivery_time}.`,
      });

      return NextResponse.json({ ...saved, confirmation_code: undefined, has_confirmation_code: true });
    }

    return NextResponse.json(
      { detail: "Unsupported driver action. Allowed: acknowledge, update_status." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update driver delivery." },
      { status: 500 }
    );
  }
}
