import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import {
  getCanonicalCustomer,
  getCustomerLoyaltySummary,
} from "@/lib/customerPersistence";

/**
 * GET /api/v1/account/loyalty
 * Strictly customer-scoped endpoint returning ONLY the authenticated customer's
 * authoritative loyalty balance, earned/redeemed totals, and LTX-* transaction history.
 */
export async function GET(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) {
    return NextResponse.json(
      { detail: "Authentication required to view loyalty rewards." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const canonical = await getCanonicalCustomer(
      session.email,
      session.name,
      null,
      session.auth_provider || "email",
      session.avatar_url
    );

    const summary = await getCustomerLoyaltySummary(canonical.id, canonical.email);

    return NextResponse.json(
      {
        customer_id: canonical.id,
        ...summary,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to fetch customer loyalty summary" },
      { status: 500 }
    );
  }
}
