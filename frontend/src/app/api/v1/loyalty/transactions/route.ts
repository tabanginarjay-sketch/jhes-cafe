import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";
import { normalizeLoyaltyTransactions } from "@/lib/paymentLedger";

/**
 * GET /api/v1/loyalty/transactions
 * Dedicated admin endpoint returning ONLY Loyalty Bean Points ledger records
 * (signup bonuses, earned points from orders, redemptions).
 * Completely separated from monetary PHP order payments and revenue calculations.
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
    const [rawPayments, rawUsers] = await Promise.all([
      airtableList("Payments", undefined, true),
      airtableList("Users", undefined, true).catch(() => []),
    ]);

    const { transactions, stats } = normalizeLoyaltyTransactions(rawPayments, rawUsers);

    const { searchParams } = new URL(req.url);
    const typeFilter = (searchParams.get("type") || "").toLowerCase().trim();
    const search = (searchParams.get("search") || "").toLowerCase().trim();

    let filtered = transactions;
    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter((t) => t.transaction_type === typeFilter);
    }
    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.transaction_ref.toLowerCase().includes(search) ||
          t.customer_name.toLowerCase().includes(search) ||
          (t.customer_email || "").toLowerCase().includes(search) ||
          (t.order_reference || "").toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(
      {
        transactions: filtered,
        stats,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to fetch loyalty transactions" },
      { status: 500 }
    );
  }
}
