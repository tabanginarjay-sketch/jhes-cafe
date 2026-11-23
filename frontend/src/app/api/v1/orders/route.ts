import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate, airtableUpdate } from "@/lib/airtable";

// Canonical catalog base prices in PHP
const CANONICAL_BASE_PRICES: Record<string, number> = {
  "barako-espresso-romano": 190,
  "barako-romano": 190,
  "barako espresso romano": 190,
  "spanish-latte-dulce": 220,
  "spanish latte dulce": 220,
  "tagaytay-cloud-coldbrew": 240,
  "tagaytay-cloud-cold-brew": 240,
  "tagaytay cloud cold brew": 240,
  "salted-honey-latte": 230,
  "salted wild honey latte": 230,
  "highland-uji-matcha-latte": 220,
  "highland uji matcha latte": 220,
  "burnt-basque-cheesecake": 280,
  "burnt basque cheesecake": 280,
  "rosemary-butter-croissant": 160,
  "rosemary-croissant": 160,
  "rosemary butter croissant": 160,
  "glazed-heritage-doughnut": 140,
  "vanilla bean glazed doughnut": 140,
};

function resolveBasePrice(nameOrSlug: string, fallback: number): number {
  if (!nameOrSlug) return fallback || 200;
  const key = nameOrSlug.toLowerCase().trim();
  if (CANONICAL_BASE_PRICES[key]) return CANONICAL_BASE_PRICES[key];
  const slugified = key.replace(/[^a-z0-9]+/g, "-");
  if (CANONICAL_BASE_PRICES[slugified]) return CANONICAL_BASE_PRICES[slugified];
  return fallback || 200;
}

function calculateItemDelta(item: any): number {
  let delta = 0;
  const size = (item.size || "").toLowerCase();
  if (size.includes("venti") || size.includes("20oz")) {
    delta += 30;
  } else if (size.includes("tall") || size.includes("12oz")) {
    delta -= 20;
  }

  const milk = (item.milk_type || item.milk || "").toLowerCase();
  if (milk.includes("oat") || milk.includes("almond") || milk.includes("soy") || milk.includes("coconut")) {
    delta += 40;
  }

  const addOns = (item.add_ons || item.customizationSummary || "").toLowerCase();
  if (addOns.includes("+2 shot") || addOns.includes("2 extra shot")) {
    delta += 85;
  } else if (addOns.includes("+1 shot") || addOns.includes("1 extra shot") || addOns.includes("+ shot")) {
    delta += 45;
  }

  if (addOns.includes("cold foam")) delta += 45;
  if (addOns.includes("vanilla drizzle")) delta += 35;
  if (addOns.includes("caramel crunch")) delta += 35;
  if (addOns.includes("berry") || addOns.includes("compote")) delta += 35;
  if (addOns.includes("cacao") || addOns.includes("chocolate")) delta += 30;
  if (addOns.includes("butter") || addOns.includes("ganache") || addOns.includes("almonds")) delta += 25;
  if (addOns.includes("honey")) delta += 30;

  return delta;
}

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

    // 1. Validate customer information
    const customerName = (body.customer_name || "").trim();
    if (!customerName || customerName.length < 2) {
      return NextResponse.json(
        { detail: "Customer name is required (minimum 2 characters)." },
        { status: 400 }
      );
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { detail: "Order must contain at least one item." },
        { status: 400 }
      );
    }

    // 2. Server-side item price verification and subtotal calculation
    let calculatedTotal = 0;
    const verifiedItems: any[] = [];

    for (const item of items) {
      const pName = item.product_name || item.name || "Artisan Coffee";
      const qty = Math.max(1, Number(item.quantity) || 1);
      const basePrice = resolveBasePrice(pName, Number(item.unit_price || item.price) || 200);
      const optionDelta = calculateItemDelta(item);
      const verifiedUnitPrice = Math.max(80, basePrice + optionDelta);
      const verifiedSubtotal = verifiedUnitPrice * qty;

      calculatedTotal += verifiedSubtotal;
      verifiedItems.push({
        ...item,
        product_name: pName,
        quantity: qty,
        unit_price: verifiedUnitPrice,
        subtotal: verifiedSubtotal,
        size: item.size || "Grande 16oz",
        temperature: item.temperature || "Hot",
        milk_type: item.milk_type || item.milk || "Whole Milk",
      });
    }

    const orderNumber = body.order_number?.startsWith("JHE-")
      ? body.order_number
      : `JHE-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    // 3. Persist primary Order record in Airtable with strictly validated total & pending status
    const createdOrder = await airtableCreate("Orders", {
      order_number: orderNumber,
      customer_name: customerName,
      customer_phone: body.customer_phone ? String(body.customer_phone) : undefined,
      customer_email: body.customer_email || undefined,
      dining_option: body.dining_option || "Dine-in",
      status: "pending",
      payment_method: body.payment_method || "gcash",
      payment_status: "pending", // ALWAYS enforce pending payment status
      total_amount: Math.round(calculatedTotal * 100) / 100,
      special_notes: body.special_notes || undefined,
    });

    // 4. Persist child OrderItems records
    const createdItems = [];
    for (const item of verifiedItems) {
      try {
        const itemRecord = await airtableCreate("OrderItems", {
          order_id: createdOrder.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          size: item.size,
          temperature: item.temperature,
          milk_type: item.milk_type,
        });
        createdItems.push(itemRecord);
      } catch (err) {
        console.warn("Notice: OrderItem creation skipped or table schema mismatch:", err);
      }
    }

    // 5. Inventory deduction
    try {
      const inventoryList = await airtableList("Inventory", undefined, true);
      if (inventoryList.length > 0) {
        const beanItem =
          inventoryList.find((i: any) =>
            String(i.item_name || "").toLowerCase().includes("bean")
          ) || inventoryList[0];

        if (beanItem && typeof beanItem.stock_quantity === "number") {
          const deduction = Math.max(1, verifiedItems.reduce((sum: number, it: any) => sum + it.quantity, 0));
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
        total_amount: Math.round(calculatedTotal * 100) / 100,
        payment_status: "pending",
        status: "pending",
        items: createdItems.length > 0 ? createdItems : verifiedItems,
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
