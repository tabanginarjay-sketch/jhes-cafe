import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import { getAuthenticatedAdmin, getAuthenticatedUser } from "@/lib/serverAuth";
import { getCanonicalCustomer } from "@/lib/customerPersistence";
import { listDeliveries } from "@/lib/deliveryStore";
import { normalizePaymentsWithLinks } from "@/lib/paymentLedger";

/**
 * GET /api/v1/deliveries
 * - Admin: returns all delivery records enriched with order status, payment status & linked payment ID.
 *   Supports filters: ?status=..., ?date_from=YYYY-MM-DD, ?date_to=YYYY-MM-DD, ?driver_id=...
 * - Customer: returns strictly the authenticated customer's own deliveries.
 */
export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  const user = getAuthenticatedUser(req);

  if (!admin && !user) {
    return NextResponse.json(
      { detail: "Authentication required to access delivery records." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = (searchParams.get("status") || "all").trim();
    const driverIdFilter = (searchParams.get("driver_id") || "").trim();
    const dateFrom = (searchParams.get("date_from") || "").trim();
    const dateTo = (searchParams.get("date_to") || "").trim();

    let deliveries;
    if (admin) {
      deliveries = await listDeliveries({
        status: statusFilter,
        driverId: driverIdFilter || undefined,
      });
    } else {
      const canonical = await getCanonicalCustomer(user!.email, user!.name);
      deliveries = await listDeliveries({
        customerId: canonical.id,
        customerEmail: canonical.email,
        status: statusFilter,
      });
    }

    if (dateFrom) {
      const fromTs = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
      if (!Number.isNaN(fromTs)) {
        deliveries = deliveries.filter((d) => {
          const t = new Date(d.created_at).getTime();
          return !Number.isNaN(t) && t >= fromTs;
        });
      }
    }
    if (dateTo) {
      const toTs = new Date(`${dateTo}T23:59:59.999Z`).getTime();
      if (!Number.isNaN(toTs)) {
        deliveries = deliveries.filter((d) => {
          const t = new Date(d.created_at).getTime();
          return !Number.isNaN(t) && t <= toTs;
        });
      }
    }

    // Enrich with linked order & payment status (keeping all three statuses cleanly separate)
    const [rawOrders, rawPayments] = await Promise.all([
      airtableList("Orders", undefined, true).catch(() => []),
      airtableList("Payments", undefined, true).catch(() => []),
    ]);

    const orderById = new Map<string, any>();
    const orderByNum = new Map<string, any>();
    for (const o of rawOrders) {
      if (o.id) orderById.set(String(o.id), o);
      if (o.order_number) orderByNum.set(String(o.order_number).toUpperCase().trim(), o);
    }

    const { payments } = normalizePaymentsWithLinks(rawPayments, rawOrders);
    const payByOrderId = new Map<string, any>();
    const payByOrderNum = new Map<string, any>();
    for (const p of payments) {
      if (p.order_id) payByOrderId.set(String(p.order_id), p);
      if (p.order_number) payByOrderNum.set(String(p.order_number).toUpperCase().trim(), p);
    }

    const enriched = deliveries.map((d) => {
      const ord =
        orderById.get(d.order_id) || orderByNum.get(d.order_number.toUpperCase().trim()) || null;
      const pay =
        payByOrderId.get(d.order_id) || payByOrderNum.get(d.order_number.toUpperCase().trim()) || null;

      return {
        ...d,
        order_status: ord?.status ? String(ord.status).trim() : "pending",
        order_total: ord?.total_amount !== undefined ? Number(ord.total_amount) : d.cod_amount_due,
        payment_status: pay?.status || (d.payment_method === "cod" ? "cod_pending" : ord?.payment_status || "pending"),
        payment_id: pay?.id || null,
        payment_ref: pay?.payment_ref || null,
      };
    });

    return NextResponse.json(
      { deliveries: enriched, total: enriched.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load deliveries." },
      { status: 500 }
    );
  }
}
