import { NextRequest, NextResponse } from "next/server";
import { airtableGet, airtableUpdate, airtableList } from "@/lib/airtable";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First try direct lookup by Airtable record ID
    let order: any = null;
    try {
      order = await airtableGet("Orders", id);
    } catch {
      // If not record ID, lookup by order_number formula
      const matched = await airtableList("Orders", `{order_number} = '${id}'`, true);
      if (matched.length > 0) {
        order = matched[0];
      }
    }

    if (!order) {
      return NextResponse.json({ detail: "Order not found" }, { status: 404 });
    }

    // Try fetching child order items
    let items: any[] = [];
    try {
      items = await airtableList("OrderItems", `{order_id} = '${order.id}'`, true);
    } catch {}

    return NextResponse.json({
      ...order,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error retrieving order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Find target record id
    let targetRecordId = id;
    if (!id.startsWith("rec")) {
      const matched = await airtableList("Orders", `{order_number} = '${id}'`, true);
      if (matched.length === 0) {
        return NextResponse.json({ detail: "Order not found" }, { status: 404 });
      }
      targetRecordId = matched[0].id;
    }

    const fieldsToUpdate: Record<string, unknown> = {};
    if (body.status) fieldsToUpdate.status = body.status;
    if (body.payment_status) fieldsToUpdate.payment_status = body.payment_status;
    if (body.special_notes !== undefined) fieldsToUpdate.special_notes = body.special_notes;

    const updated = await airtableUpdate("Orders", targetRecordId, fieldsToUpdate);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error updating order" },
      { status: 500 }
    );
  }
}
