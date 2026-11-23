import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate, airtableUpdate } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await airtableList("Orders", undefined, true);
    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
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
    const orderNumber = `BNC-${Date.now().toString().slice(-6)}`;
    
    // 1. Create primary Order record
    const createdOrder = await airtableCreate("Orders", {
      order_number: orderNumber,
      customer_name: body.customer_name || "Valued Guest",
      customer_phone: body.customer_phone ? String(body.customer_phone) : undefined,
      customer_email: body.customer_email || undefined,
      dining_option: body.dining_option || "Dine-in",
      status: "pending",
      payment_method: body.payment_method || "cash",
      payment_status: "pending",
      subtotal: Number(body.total_amount) || 0,
      total_amount: Number(body.total_amount) || 0,
      special_notes: body.special_notes || undefined,
    });

    // 2. Persist child OrderItems records if provided
    const items = Array.isArray(body.items) ? body.items : [];
    const createdItems = [];

    for (const item of items) {
      try {
        const itemRecord = await airtableCreate("OrderItems", {
          order_id: createdOrder.id,
          product_name: item.name || item.product_name || "Artisan Coffee",
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.price || item.unit_price) || 0,
          subtotal: (Number(item.price || item.unit_price) || 0) * (Number(item.quantity) || 1),
          size: item.size || "Grande 16oz",
          temperature: item.temperature || "Hot",
          milk: item.milk || "Whole Milk",
        });
        createdItems.push(itemRecord);
      } catch (err) {
        console.warn("Notice: OrderItem creation skipped or table schema mismatch:", err);
      }
    }

    // 3. Inventory stock deduction (deduct whole bean / consumable stock)
    try {
      const inventoryList = await airtableList("Inventory", undefined, true);
      if (inventoryList.length > 0) {
        // Find default coffee beans or first active bean item to deduct 0.02kg (20g espresso dose per item)
        const beanItem = inventoryList.find((i: any) =>
          String(i.item_name || "").toLowerCase().includes("bean")
        ) || inventoryList[0];

        if (beanItem && typeof beanItem.stock_quantity === "number") {
          const deduction = Math.max(1, items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0));
          const newStock = Math.max(0, beanItem.stock_quantity - deduction);
          await airtableUpdate("Inventory", beanItem.id, {
            stock_quantity: newStock,
          });
        }
      }
    } catch (invErr) {
      console.warn("Notice: Inventory deduction skipped or table unavailable:", invErr);
    }

    return NextResponse.json(
      {
        ...createdOrder,
        items: createdItems,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error placing order" },
      { status: 500 }
    );
  }
}
