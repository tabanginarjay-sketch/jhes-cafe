import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const records = await airtableList("Payments", undefined, true);
    records.sort((a: any, b: any) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );
    return NextResponse.json(records, {
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
    const allowedStatuses = ["pending", "completed", "failed", "refunded"];
    // Never default to "completed" without explicit confirmation
    const requestedStatus = String(body.status || "pending").toLowerCase();
    const safeStatus = allowedStatuses.includes(requestedStatus) ? requestedStatus : "pending";

    const paymentRef =
      body.payment_ref || `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const created = await airtableCreate("Payments", {
      payment_ref: paymentRef,
      order_id: body.order_id || "",
      order_number: body.order_number || "",
      amount: Number(body.amount) || 0,
      provider: body.provider || body.payment_method || "cash",
      status: safeStatus,
      transaction_id: body.transaction_id || `TXN-${Date.now()}`,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error recording payment" },
      { status: 500 }
    );
  }
}
