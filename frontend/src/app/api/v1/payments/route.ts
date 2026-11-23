import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

const DEFAULT_PAYMENTS = [
  { ref: "PAY-2026-0001", order: "BNC-001024", amount: 440, provider: "GCash", status: "Completed", date: "Nov 23, 2026, 8:43 AM" },
  { ref: "PAY-2026-0002", order: "BNC-001001", amount: 350, provider: "Maya", status: "Completed", date: "Nov 23, 2026, 9:12 AM" },
  { ref: "PAY-2026-0003", order: "BNC-000982", amount: 280, provider: "Credit Card (Visa)", status: "Completed", date: "Nov 22, 2026, 4:15 PM" },
  { ref: "PAY-2026-0004", order: "BNC-000975", amount: 190, provider: "Cash at Counter", status: "Completed", date: "Nov 22, 2026, 2:30 PM" },
];

export async function GET() {
  try {
    const records = await airtableList("Payments", undefined, true);
    if (records.length > 0) {
      return NextResponse.json(records);
    }
    return NextResponse.json(DEFAULT_PAYMENTS);
  } catch {
    return NextResponse.json(DEFAULT_PAYMENTS);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await airtableCreate("Payments", {
      order_id: body.order_id,
      amount: Number(body.amount) || 0,
      payment_method: body.payment_method || "cash",
      status: "completed",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error recording payment" },
      { status: 500 }
    );
  }
}
