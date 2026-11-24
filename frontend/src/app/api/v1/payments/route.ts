import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";
import {
  isAuthCredentialRecord,
  isCartRecord,
  isLoyaltyRecord,
  normalizePaymentsWithLinks,
  VALID_PAYMENT_PROVIDERS,
} from "@/lib/paymentLedger";

/**
 * GET /api/v1/payments
 * Returns ONLY genuine order payment transactions (strictly excluding LTX loyalty records,
 * CART records, and raw child REF refund rows, which are attached to their parent payment).
 * Supports optional query params:
 *   ?include_meta=true -> returns { payments, stats, pagination }
 *   ?status=pending|completed|failed|refunded
 *   ?provider=cash|gcash|maya|card
 *   ?search=<payment_ref|order_number|transaction_id>
 *   ?customer=<name|email>
 *   ?date_from=YYYY-MM-DD & ?date_to=YYYY-MM-DD
 *   ?page=1 & ?page_size=10
 */
export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const [rawPayments, rawOrders] = await Promise.all([
      airtableList("Payments", undefined, true),
      airtableList("Orders", undefined, true).catch(() => []),
    ]);

    const { payments: allOrderPayments, stats } = normalizePaymentsWithLinks(
      rawPayments,
      rawOrders
    );

    const { searchParams } = new URL(req.url);
    const statusFilter = (searchParams.get("status") || "").toLowerCase().trim();
    const providerFilter = (searchParams.get("provider") || searchParams.get("method") || "")
      .toLowerCase()
      .trim();
    const searchQuery = (searchParams.get("search") || "").toLowerCase().trim();
    const customerQuery = (searchParams.get("customer") || "").toLowerCase().trim();
    const dateFrom = (searchParams.get("date_from") || "").trim();
    const dateTo = (searchParams.get("date_to") || "").trim();
    const includeMeta = searchParams.get("include_meta") === "true";

    let filtered = allOrderPayments;

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    if (providerFilter && providerFilter !== "all") {
      filtered = filtered.filter((p) => p.provider === providerFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.id.toLowerCase().includes(searchQuery) ||
          p.payment_ref.toLowerCase().includes(searchQuery) ||
          p.order_number.toLowerCase().includes(searchQuery) ||
          p.order_id.toLowerCase().includes(searchQuery) ||
          p.transaction_id.toLowerCase().includes(searchQuery) ||
          (p.refund?.refund_ref || "").toLowerCase().includes(searchQuery)
      );
    }
    if (customerQuery) {
      filtered = filtered.filter(
        (p) =>
          p.customer_name.toLowerCase().includes(customerQuery) ||
          (p.customer_email || "").toLowerCase().includes(customerQuery)
      );
    }
    if (dateFrom) {
      const fromTs = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
      if (!Number.isNaN(fromTs)) {
        filtered = filtered.filter((p) => {
          const t = new Date(p.created_at).getTime();
          return !Number.isNaN(t) && t >= fromTs;
        });
      }
    }
    if (dateTo) {
      const toTs = new Date(`${dateTo}T23:59:59.999Z`).getTime();
      if (!Number.isNaN(toTs)) {
        filtered = filtered.filter((p) => {
          const t = new Date(p.created_at).getTime();
          return !Number.isNaN(t) && t <= toTs;
        });
      }
    }

    if (includeMeta) {
      const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("page_size") || 10) || 10));
      const totalFiltered = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
      const safePage = Math.min(page, totalPages);
      const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

      return NextResponse.json(
        {
          payments: paged,
          all_filtered_count: totalFiltered,
          stats,
          pagination: {
            page: safePage,
            page_size: pageSize,
            total_items: totalFiltered,
            total_pages: totalPages,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(filtered, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to fetch payments from Airtable" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    // Strictly reject cart, loyalty, or internal credential payloads on the monetary Payments endpoint
    if (isCartRecord(body) || isLoyaltyRecord(body) || isAuthCredentialRecord(body)) {
      return NextResponse.json(
        { detail: "Cart events, loyalty point transactions, and internal records cannot be recorded as monetary order payments." },
        { status: 400 }
      );
    }

    const orderId = String(body.order_id || "").trim();
    const orderNumber = String(body.order_number || "").trim();
    const amount = Number(body.amount);
    const provider = String(body.provider || body.payment_method || "cash").toLowerCase().trim();

    if (!orderId || !orderNumber) {
      return NextResponse.json(
        { detail: "A valid submitted order_id and order_number are required to record a payment." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { detail: "Payment amount must be a positive PHP value." },
        { status: 400 }
      );
    }
    if (!VALID_PAYMENT_PROVIDERS.has(provider)) {
      return NextResponse.json(
        { detail: `Invalid payment provider. Allowed: ${Array.from(VALID_PAYMENT_PROVIDERS).join(", ")}.` },
        { status: 400 }
      );
    }

    // Never allow bypassing verification by creating an already-completed payment arbitrarily
    const paymentRef = `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const txPrefix = provider === "cash" ? "COUNTER-CASH-PENDING" : "DEMO-SIMULATED-PENDING";

    const created = await airtableCreate("Payments", {
      payment_ref: paymentRef,
      order_id: orderId,
      order_number: orderNumber,
      amount: Math.round(amount * 100) / 100,
      provider,
      status: "pending",
      transaction_id: body.transaction_id || `${txPrefix}-${orderNumber}`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error recording payment" },
      { status: 500 }
    );
  }
}
