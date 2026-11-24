import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate, airtableUpdate, airtableGet } from "@/lib/airtable";
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
    const records = await airtableList("Inventory", undefined, true);
    return NextResponse.json(records, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load inventory from Airtable" },
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
    const itemName = String(body.item_name || "").trim();
    if (!itemName) {
      return NextResponse.json({ detail: "Item name is required." }, { status: 400 });
    }

    const created = await airtableCreate("Inventory", {
      item_name: itemName,
      sku: String(body.sku || `SKU-${Date.now().toString().slice(-4)}`).trim(),
      category: body.category || "supplies",
      stock_quantity: Math.max(0, Number(body.stock_quantity) || 0),
      unit: body.unit || "pcs",
      reorder_threshold: Math.max(0, Number(body.reorder_threshold) || 5),
      supplier: body.supplier || "Local Supplier",
      last_restocked: new Date().toISOString().split("T")[0],
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error creating inventory item" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, stock_quantity, delta, reorder_threshold } = body;

    if (!id || !String(id).startsWith("rec")) {
      return NextResponse.json(
        { detail: "A valid Airtable Inventory record ID is required." },
        { status: 400 }
      );
    }

    const current: any = await airtableGet("Inventory", id);
    const currentQty = Number(current.stock_quantity) || 0;
    const nextQty =
      delta !== undefined
        ? Math.max(0, currentQty + Number(delta))
        : stock_quantity !== undefined
          ? Math.max(0, Number(stock_quantity))
          : currentQty;

    const updateFields: Record<string, unknown> = {
      stock_quantity: nextQty,
    };
    if (nextQty > currentQty) {
      updateFields.last_restocked = new Date().toISOString().split("T")[0];
    }
    if (reorder_threshold !== undefined) {
      updateFields.reorder_threshold = Math.max(0, Number(reorder_threshold));
    }

    const updated = await airtableUpdate("Inventory", id, updateFields);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error updating inventory" },
      { status: 500 }
    );
  }
}
