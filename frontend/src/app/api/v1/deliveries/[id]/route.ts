import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedAdmin,
  getAuthenticatedDriver,
  getAuthenticatedUser,
} from "@/lib/serverAuth";
import { getCanonicalCustomer } from "@/lib/customerPersistence";
import {
  createCustomerNotification,
  getDeliveryById,
  listDrivers,
  saveUpdatedDeliveryRecord,
  upsertDriverProfileMeta,
} from "@/lib/deliveryStore";
import {
  formatDeliveryStatusLabel,
  isValidDeliveryTransition,
  type DeliveryStatus,
} from "@/lib/deliveryTypes";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  const driver = getAuthenticatedDriver(req);
  const user = getAuthenticatedUser(req);

  if (!admin && !driver && !user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const delivery = await getDeliveryById(id);
    if (!delivery) {
      return NextResponse.json({ detail: "Delivery record not found." }, { status: 404 });
    }

    if (!admin) {
      if (driver && delivery.driver_id === driver.sub) {
        // Authorized assigned driver
      } else if (user) {
        const canonical = await getCanonicalCustomer(user.email, user.name);
        const isOwner =
          delivery.customer_id === canonical.id ||
          delivery.customer_email.toLowerCase() === canonical.email.toLowerCase();
        if (!isOwner) {
          return NextResponse.json(
            { detail: "You do not have permission to view this delivery." },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { detail: "You do not have permission to view this delivery." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(delivery, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error retrieving delivery." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/deliveries/[id]
 * Admin-only dispatch management: assign drivers, update ETA, advance admin statuses,
 * record failures/returns/cancellations — strictly enforcing the delivery status state machine.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required for delivery dispatch actions." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const delivery = await getDeliveryById(id);
    if (!delivery) {
      return NextResponse.json({ detail: "Delivery record not found." }, { status: 404 });
    }

    const body = await req.json();
    const action = String(body.action || "").trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // 1. Assign or Reassign Driver
    if (action === "assign_driver") {
      const driverId = String(body.driver_id || "").trim();
      if (!driverId) {
        return NextResponse.json({ detail: "A valid driver_id is required." }, { status: 400 });
      }
      if (["DELIVERED", "CANCELLED", "RETURNED"].includes(delivery.delivery_status)) {
        return NextResponse.json(
          { detail: `Cannot assign a driver to a terminal delivery (${delivery.delivery_status}).` },
          { status: 409 }
        );
      }

      const drivers = await listDrivers();
      const targetDriver = drivers.find((d) => d.id === driverId);
      if (!targetDriver || !targetDriver.is_active) {
        return NextResponse.json(
          { detail: "Selected driver was not found or is currently inactive." },
          { status: 400 }
        );
      }

      const prevStatus = delivery.delivery_status;
      const nextStatus: DeliveryStatus =
        prevStatus === "PENDING_ASSIGNMENT" || prevStatus === "FAILED_DELIVERY"
          ? "DRIVER_ASSIGNED"
          : prevStatus;

      const updatedEta = body.estimated_delivery_time
        ? String(body.estimated_delivery_time).trim().slice(0, 60)
        : delivery.estimated_delivery_time;

      delivery.driver_id = targetDriver.id;
      delivery.driver_staff_code = targetDriver.staff_id;
      delivery.driver_name = targetDriver.full_name;
      delivery.driver_phone = targetDriver.phone || null;
      delivery.driver_vehicle = [targetDriver.vehicle_type, targetDriver.plate_number]
        .filter(Boolean)
        .join(" · ");
      delivery.driver_acknowledged_at = null;
      delivery.estimated_delivery_time = updatedEta;
      delivery.delivery_status = nextStatus;
      delivery.audit_trail.push({
        at: nowIso,
        action: "driver_assigned",
        from_status: prevStatus,
        to_status: nextStatus,
        by: admin.name,
        role: admin.role,
        note: `Assigned to driver ${targetDriver.full_name} (${targetDriver.staff_id}). ETA: ${updatedEta}.`,
      });

      const saved = await saveUpdatedDeliveryRecord(delivery);
      await upsertDriverProfileMeta(targetDriver.id, { availability_status: "on_delivery" }).catch(() => {});

      await createCustomerNotification({
        customer_id: delivery.customer_id,
        customer_email: delivery.customer_email,
        order_id: delivery.order_id,
        order_number: delivery.order_number,
        event_type: "DRIVER_ASSIGNED",
        title: `Driver Assigned for Order #${delivery.order_number}`,
        message: `${targetDriver.full_name} has been assigned to deliver your order. Estimated delivery time: ${updatedEta}.`,
      });

      return NextResponse.json(saved);
    }

    // 2. Update Estimated Delivery Time
    if (action === "update_eta") {
      const nextEta = String(body.estimated_delivery_time || "").trim().slice(0, 60);
      if (nextEta.length < 3) {
        return NextResponse.json(
          { detail: "Please provide a valid estimated delivery time." },
          { status: 400 }
        );
      }

      delivery.estimated_delivery_time = nextEta;
      delivery.audit_trail.push({
        at: nowIso,
        action: "eta_updated",
        from_status: delivery.delivery_status,
        to_status: delivery.delivery_status,
        by: admin.name,
        role: admin.role,
        note: `Estimated delivery time updated to ${nextEta}.`,
      });

      const saved = await saveUpdatedDeliveryRecord(delivery);
      await createCustomerNotification({
        customer_id: delivery.customer_id,
        customer_email: delivery.customer_email,
        order_id: delivery.order_id,
        order_number: delivery.order_number,
        event_type: "ETA_UPDATED",
        title: `Delivery ETA Updated for #${delivery.order_number}`,
        message: `Updated estimated delivery time: ${nextEta}.`,
      });

      return NextResponse.json(saved);
    }

    // 3. Transition Delivery Status (Backend State Machine Enforced)
    if (action === "update_status") {
      const nextStatus = String(body.delivery_status || "").toUpperCase().trim() as DeliveryStatus;
      const reason = String(body.reason || body.note || "").trim().slice(0, 240);

      if (!isValidDeliveryTransition(delivery.delivery_status, nextStatus, "admin")) {
        return NextResponse.json(
          {
            detail: `Invalid delivery status transition from ${delivery.delivery_status} to ${nextStatus}.`,
          },
          { status: 400 }
        );
      }

      if (nextStatus === "FAILED_DELIVERY" && reason.length < 3) {
        return NextResponse.json(
          { detail: "A failure reason (at least 3 characters) is required when recording a failed delivery attempt." },
          { status: 400 }
        );
      }

      const prevStatus = delivery.delivery_status;
      delivery.delivery_status = nextStatus;

      if (nextStatus === "FAILED_DELIVERY") {
        delivery.failure_reason = reason;
        delivery.failed_attempts = (delivery.failed_attempts || 0) + 1;
      }
      if (nextStatus === "DELIVERED") {
        delivery.delivered_at = nowIso;
        delivery.proof_note = String(body.proof_note || reason || "Delivery confirmed by dispatch admin.").slice(0, 240);
        if (delivery.payment_method === "cod" && body.cash_collected_amount !== undefined) {
          delivery.cash_collected_amount = Number(body.cash_collected_amount);
          delivery.cash_collected_at = nowIso;
          delivery.cash_collected_by = delivery.driver_name || admin.name;
        }
      }

      delivery.audit_trail.push({
        at: nowIso,
        action: "status_updated",
        from_status: prevStatus,
        to_status: nextStatus,
        by: admin.name,
        role: admin.role,
        note: reason || `Status updated to ${formatDeliveryStatusLabel(nextStatus)}.`,
      });

      const saved = await saveUpdatedDeliveryRecord(delivery);

      // Release driver availability if terminal/failed
      if (
        delivery.driver_id &&
        ["DELIVERED", "CANCELLED", "RETURNED", "FAILED_DELIVERY"].includes(nextStatus)
      ) {
        await upsertDriverProfileMeta(delivery.driver_id, { availability_status: "available" }).catch(() => {});
      }

      await createCustomerNotification({
        customer_id: delivery.customer_id,
        customer_email: delivery.customer_email,
        order_id: delivery.order_id,
        order_number: delivery.order_number,
        event_type: nextStatus,
        title: `Order #${delivery.order_number}: ${formatDeliveryStatusLabel(nextStatus)}`,
        message:
          nextStatus === "FAILED_DELIVERY"
            ? `Delivery attempt failed: ${reason}. Our team will follow up.`
            : nextStatus === "DELIVERED"
              ? `Your order has been delivered.${delivery.payment_method === "cod" ? " COD cash collection will be finalized by our cashier." : ""}`
              : `Your delivery status is now ${formatDeliveryStatusLabel(nextStatus)}.`,
      });

      return NextResponse.json(saved);
    }

    return NextResponse.json(
      { detail: "Unsupported action. Allowed: assign_driver, update_eta, update_status." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update delivery." },
      { status: 500 }
    );
  }
}
