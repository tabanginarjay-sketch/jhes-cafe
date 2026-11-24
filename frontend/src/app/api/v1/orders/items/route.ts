import { NextRequest, NextResponse } from "next/server";
import { airtableList } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";

/**
 * GET /api/v1/orders/items — Admin-only OrderItems listing for real bestseller & sales analytics.
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
    const records = await airtableList("OrderItems", undefined, true);
    return NextResponse.json(records, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error fetching order items" },
      { status: 500 }
    );
  }
}
