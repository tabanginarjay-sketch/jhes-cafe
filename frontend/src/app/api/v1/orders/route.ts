import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await airtableList("Orders");
    return NextResponse.json(records);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error fetching orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderNumber = `JHE-${Date.now().toString().slice(-6)}`;
    const created = await airtableCreate("Orders", {
      order_number: orderNumber,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone ? String(body.customer_phone) : undefined,
      customer_email: body.customer_email,
      dining_option: body.dining_option || "dine_in",
      status: "pending",
      payment_method: body.payment_method || "cash",
      payment_status: "pending",
      subtotal: body.total_amount || 0,
      total_amount: body.total_amount || 0,
      special_notes: body.special_notes,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error placing order" },
      { status: 500 }
    );
  }
}
