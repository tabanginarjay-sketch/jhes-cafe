import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import {
  getCustomerActiveCart,
  saveCustomerActiveCart,
  clearCustomerActiveCart,
  PersistedCartItem,
} from "@/lib/customerPersistence";

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { detail: "Authentication required to view shopping cart." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { items, subtotal } = await getCustomerActiveCart(user.email, user.sub);
    const totalCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    return NextResponse.json(
      {
        items,
        total_count: totalCount,
        subtotal,
        customer_id: user.sub,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load cart" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { detail: "Authentication required to update shopping cart." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const body = await req.json();
    const rawItems: any[] = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];

    const items: PersistedCartItem[] = rawItems.map((item, idx) => ({
      id: item.id || `cart-${Date.now()}-${idx}`,
      productId: item.productId || item.id,
      slug: item.slug,
      name: String(item.name || "Item"),
      category: item.category,
      basePrice: Number(item.basePrice || item.price || 0),
      price: Number(item.price || 0),
      quantity: Math.max(1, Number(item.quantity) || 1),
      imageUrl: item.imageUrl,
      isBakery: Boolean(item.isBakery),
      size: item.size,
      temperature: item.temperature,
      milk: item.milk,
      sweetness: item.sweetness,
      extraShots: item.extraShots,
      toppings: item.toppings,
      warming: item.warming,
      addOns: item.addOns,
      servingStyle: item.servingStyle,
      finishes: item.finishes,
      customizationSummary: item.customizationSummary,
    }));

    const result = await saveCustomerActiveCart(user.email, user.name, user.sub, items);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json(
      {
        success: result.success,
        items,
        total_count: totalCount,
        subtotal: result.totalAmount,
        customer_id: user.sub,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to save cart" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { detail: "Authentication required to clear shopping cart." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await clearCustomerActiveCart(user.email);
    return NextResponse.json(
      {
        success: true,
        items: [],
        total_count: 0,
        subtotal: 0,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to clear cart" },
      { status: 500 }
    );
  }
}
