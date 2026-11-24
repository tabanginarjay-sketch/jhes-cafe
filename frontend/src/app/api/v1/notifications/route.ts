import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { getCanonicalCustomer } from "@/lib/customerPersistence";
import {
  listCustomerNotifications,
  markCustomerNotificationsRead,
} from "@/lib/deliveryStore";

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { detail: "Authentication required to load notifications." },
      { status: 401 }
    );
  }

  try {
    const canonical = await getCanonicalCustomer(user.email, user.name);
    const notifications = await listCustomerNotifications(canonical.id, canonical.email);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json(
      { notifications, unread_count: unreadCount },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const notificationId = body.id ? String(body.id) : undefined;
    const canonical = await getCanonicalCustomer(user.email, user.name);
    const marked = await markCustomerNotificationsRead(
      canonical.id,
      canonical.email,
      notificationId
    );
    return NextResponse.json({ ok: true, marked_read: marked });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update notifications." },
      { status: 500 }
    );
  }
}
