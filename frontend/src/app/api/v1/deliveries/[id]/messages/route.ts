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
  saveUpdatedDeliveryRecord,
} from "@/lib/deliveryStore";

/**
 * POST /api/v1/deliveries/[id]/messages
 * Restricted in-app communication & delivery issue reporting.
 * Strictly accessible ONLY to the order's customer, assigned driver, or authorized admin.
 */
export async function POST(
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

    let senderName = "";
    let senderRole: "customer" | "driver" | "admin" | "manager" = "customer";

    if (admin) {
      senderName = admin.name;
      senderRole = admin.role;
    } else if (driver) {
      if (delivery.driver_id !== driver.sub) {
        return NextResponse.json(
          { detail: "Access denied: only the assigned driver may message this delivery." },
          { status: 403 }
        );
      }
      senderName = driver.name;
      senderRole = "driver";
    } else if (user) {
      const canonical = await getCanonicalCustomer(user.email, user.name);
      const isOwner =
        delivery.customer_id === canonical.id ||
        delivery.customer_email.toLowerCase() === canonical.email.toLowerCase();
      if (!isOwner) {
        return NextResponse.json(
          { detail: "Access denied: you may only message or report issues on your own delivery." },
          { status: 403 }
        );
      }
      senderName = canonical.full_name;
      senderRole = "customer";
    }

    const body = await req.json();
    const text = String(body.text || body.message || "").trim().slice(0, 300);
    const kind = body.kind === "issue" ? "issue" : "message";
    const issueCategory = body.issue_category ? String(body.issue_category).trim().slice(0, 60) : undefined;

    if (text.length < 2) {
      return NextResponse.json(
        { detail: "Message or issue description must be at least 2 characters." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const entry = {
      id: `msg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      kind: kind as "message" | "issue",
      at: nowIso,
      sender_name: senderName,
      sender_role: senderRole,
      text,
      ...(issueCategory ? { issue_category: issueCategory } : {}),
    };

    delivery.messages.push(entry);
    if (kind === "issue") {
      delivery.audit_trail.push({
        at: nowIso,
        action: "issue_reported",
        from_status: delivery.delivery_status,
        to_status: delivery.delivery_status,
        by: senderName,
        role: senderRole,
        note: `${issueCategory ? `[${issueCategory}] ` : ""}${text}`,
      });
    }

    const saved = await saveUpdatedDeliveryRecord(delivery);

    if (senderRole !== "customer") {
      await createCustomerNotification({
        customer_id: delivery.customer_id,
        customer_email: delivery.customer_email,
        order_id: delivery.order_id,
        order_number: delivery.order_number,
        event_type: kind === "issue" ? "DELIVERY_ISSUE" : "DELIVERY_MESSAGE",
        title:
          kind === "issue"
            ? `Delivery Issue Update (#${delivery.order_number})`
            : `Message from ${senderRole === "driver" ? `Driver ${senderName}` : "Jhe's Cafe'"} (#${delivery.order_number})`,
        message: text,
      });
    }

    return NextResponse.json({ message: entry, messages: saved.messages }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to send message." },
      { status: 500 }
    );
  }
}
