import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate, airtableUpdate } from "@/lib/airtable";

const DEFAULT_INVENTORY = [
  { id: "inv-1", item_name: "Amadeo Cavite Liberica Beans 1kg", sku: "BEAN-LIB-01", stock_quantity: 15, unit: "kg", reorder_threshold: 5 },
  { id: "inv-2", item_name: "Benguet Typica Whole Beans 1kg", sku: "BEAN-TYP-01", stock_quantity: 12, unit: "kg", reorder_threshold: 4 },
  { id: "inv-3", item_name: "Barista Oat Milk 1L", sku: "MILK-OAT-01", stock_quantity: 24, unit: "pcs", reorder_threshold: 8 },
  { id: "inv-4", item_name: "Wild Tagaytay Honey 500ml", sku: "SYR-HNY-01", stock_quantity: 10, unit: "pcs", reorder_threshold: 3 },
  { id: "inv-5", item_name: "Ceylon Cinnamon Bark Powder 250g", sku: "SPICE-CIN-01", stock_quantity: 18, unit: "pcs", reorder_threshold: 5 },
  { id: "inv-6", item_name: "Ceramic Coffee Cups 12oz", sku: "CUP-CER-12", stock_quantity: 48, unit: "pcs", reorder_threshold: 12 },
];

export async function GET() {
  try {
    const records = await airtableList("Inventory", undefined, true);
    if (records.length > 0) {
      return NextResponse.json(records);
    }
    return NextResponse.json(DEFAULT_INVENTORY);
  } catch {
    return NextResponse.json(DEFAULT_INVENTORY);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await airtableCreate("Inventory", {
      item_name: body.item_name,
      sku: body.sku,
      stock_quantity: Number(body.stock_quantity) || 0,
      unit: body.unit || "pcs",
      reorder_threshold: Number(body.reorder_threshold) || 5,
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
  try {
    const body = await req.json();
    const { id, stock_quantity, delta } = body;

    if (!id) {
      return NextResponse.json({ detail: "Item id is required" }, { status: 400 });
    }

    // Try Airtable update if id is a real record
    if (id.startsWith("rec")) {
      let newQuantity = stock_quantity;
      if (delta !== undefined) {
        const currentList = await airtableList("Inventory", undefined, true);
        const item = currentList.find((i: any) => i.id === id);
        newQuantity = Math.max(0, (item?.stock_quantity || 0) + delta);
      }
      const updated = await airtableUpdate("Inventory", id, {
        stock_quantity: newQuantity,
      });
      return NextResponse.json(updated);
    }

    // If demo item id, return simulated updated item
    const match = DEFAULT_INVENTORY.find((i) => i.id === id);
    const newQty = delta !== undefined ? Math.max(0, (match?.stock_quantity || 10) + delta) : stock_quantity;
    return NextResponse.json({
      ...(match || { id, item_name: "Inventory Item", sku: "SKU-001", unit: "pcs", reorder_threshold: 5 }),
      stock_quantity: newQty,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error updating inventory" },
      { status: 500 }
    );
  }
}
