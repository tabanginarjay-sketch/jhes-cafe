import { NextRequest, NextResponse } from "next/server";
import { airtableList, airtableCreate, airtableUpdate } from "@/lib/airtable";
import { BRAND_CONFIG } from "@/lib/brandConfig";
import { getProductType } from "@/lib/productCustomization";
import { resolveCanonicalSlug } from "@/lib/productRegistry";
import {
  escapeFormulaString,
  getAuthenticatedAdmin,
  getAuthenticatedUser,
  sanitizeNumericPhone,
} from "@/lib/serverAuth";

const PRODUCTS_TABLE = "tblcQD4QoANpq0ytK";

function calculateItemDelta(item: any, isFood: boolean): number {
  let delta = 0;

  if (!isFood) {
    const size = String(item.size || "").toLowerCase();
    if (size.includes("venti") || size.includes("20oz")) {
      delta += 30;
    } else if (size.includes("tall") || size.includes("12oz")) {
      delta -= 20;
    }

    const milk = String(item.milk_type || item.milk || "").toLowerCase();
    if (milk.includes("oat") || milk.includes("almond") || milk.includes("soy") || milk.includes("coconut")) {
      delta += 40;
    }
  }

  const addOns = String(item.add_ons || item.customization_summary || item.customizationSummary || "").toLowerCase();
  if (!isFood) {
    if (addOns.includes("+2 shot") || addOns.includes("2 extra shot")) {
      delta += 85;
    } else if (addOns.includes("+1 shot") || addOns.includes("1 extra shot") || addOns.includes("+ shot")) {
      delta += 45;
    }
    if (addOns.includes("cold foam") || addOns.includes("cold-foam")) delta += 45;
    if (addOns.includes("vanilla drizzle") || addOns.includes("vanilla-drizzle")) delta += 35;
    if (addOns.includes("caramel crunch") || addOns.includes("caramel-crunch")) delta += 35;
  } else {
    if (addOns.includes("berry") || addOns.includes("compote")) delta += 35;
    if (addOns.includes("cacao-dip") || addOns.includes("chocolate dip")) delta += 35;
    else if (addOns.includes("cacao-drizzle") || addOns.includes("cacao drizzle")) delta += 30;
    else if (addOns.includes("dark-cacao-dip") || addOns.includes("ganache")) delta += 25;
    if (addOns.includes("butter") || addOns.includes("french-butter")) delta += 25;
    if (addOns.includes("almonds") || addOns.includes("toasted-almonds")) delta += 25;
    if (addOns.includes("honey") || addOns.includes("wild-honey")) delta += 30;
  }

  return delta;
}

export async function GET(req: NextRequest) {
  const admin = getAuthenticatedAdmin(req);
  const user = getAuthenticatedUser(req);

  if (!admin && !user) {
    return NextResponse.json(
      { detail: "Authentication required to list orders." },
      { status: 401 }
    );
  }

  try {
    let formula: string | undefined;
    if (!admin && user?.email) {
      const safeEmail = escapeFormulaString(user.email.toLowerCase().trim());
      formula = `LOWER({customer_email}) = '${safeEmail}'`;
    }

    const records = await airtableList("Orders", formula, true);
    records.sort((a: any, b: any) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );

    return NextResponse.json(records, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Error fetching orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate customer info
    const customerName = String(body.customer_name || "").trim();
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

    // 2. Fetch live Products from Airtable for database-driven prices & availability checks
    const liveProducts: any[] = await airtableList(PRODUCTS_TABLE, undefined, true).catch(() => []);
    const findLiveProduct = (item: any) => {
      const targetSlug = resolveCanonicalSlug(item.product_name || item.name || item.product_id);
      const nameLower = String(item.product_name || item.name || "").trim().toLowerCase();
      return liveProducts.find(
        (p) =>
          (item.product_id && p.id === item.product_id) ||
          String(p.name || "").trim().toLowerCase() === nameLower ||
          resolveCanonicalSlug(p.name) === targetSlug
      );
    };

    // 3. Server-side price verification and food vs drink normalization
    let calculatedSubtotal = 0;
    const verifiedItems: any[] = [];
    let coffeeDrinkCount = 0;
    let oatMilkCount = 0;
    let honeyUsageCount = 0;

    for (const item of items) {
      const liveProd = findLiveProduct(item);
      if (liveProd && liveProd.is_available === false) {
        return NextResponse.json(
          { detail: `"${liveProd.name}" is currently unavailable and cannot be ordered.` },
          { status: 400 }
        );
      }

      const pName = liveProd?.name || item.product_name || item.name || "Artisan Item";
      const productType = getProductType({
        name: pName,
        category_name: liveProd?.category_name || item.category,
      });
      const isFood = ["cake", "doughnut", "pastry"].includes(productType) || Boolean(item.is_bakery);
      const qty = Math.max(1, Number(item.quantity) || 1);

      const dbBasePrice = liveProd?.price !== undefined ? Number(liveProd.price) : Number(item.unit_price || item.price) || 200;
      const optionDelta = calculateItemDelta(item, isFood);
      const verifiedUnitPrice = Math.max(50, dbBasePrice + optionDelta);
      const verifiedSubtotal = verifiedUnitPrice * qty;

      calculatedSubtotal += verifiedSubtotal;

      // Track accurate ingredient consumption by product type & customization
      if (productType === "coffee" || productType === "cold_brew") {
        coffeeDrinkCount += qty;
      }
      const milkLower = String(item.milk_type || item.milk || "").toLowerCase();
      if (!isFood && milkLower.includes("oat")) {
        oatMilkCount += qty;
      }
      const nameAndAddons = `${pName} ${item.add_ons || ""}`.toLowerCase();
      if (nameAndAddons.includes("honey")) {
        honeyUsageCount += qty;
      }

      verifiedItems.push({
        product_name: pName,
        product_type: productType,
        is_food: isFood,
        quantity: qty,
        unit_price: verifiedUnitPrice,
        subtotal: verifiedSubtotal,
        // STRICTLY omit drink fields for food/bakery items
        ...(isFood
          ? {}
          : {
              size: item.size || "Grande 16oz",
              temperature: productType === "cold_brew" ? "Iced" : item.temperature || "Hot",
              milk_type: item.milk_type || item.milk || "Whole Milk",
              sweetness: item.sweetness !== undefined ? Number(item.sweetness) : 50,
            }),
      });
    }

    // 4. Optional Demo Promo Code (FIRSTSIP15 = 15% off)
    const rawPromo = String(body.promo_code || "").trim().toUpperCase();
    const promoApplied = rawPromo === BRAND_CONFIG.promo.code ? rawPromo : null;
    const discountAmount = promoApplied
      ? Math.round(calculatedSubtotal * BRAND_CONFIG.promo.discountRate)
      : 0;
    const finalTotal = Math.max(0, Math.round((calculatedSubtotal - discountAmount) * 100) / 100);

    const orderNumber =
      typeof body.order_number === "string" && body.order_number.startsWith("JHE-")
        ? body.order_number
        : `JHE-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const numericPhone = sanitizeNumericPhone(body.customer_phone);
    const specialNotes = [
      body.special_notes ? String(body.special_notes).trim() : null,
      promoApplied ? `Promo applied: ${promoApplied} (-₱${discountAmount})` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    // 5. Persist primary Order record in Airtable (payment_status ALWAYS pending until confirmed)
    const orderFields: Record<string, unknown> = {
      order_number: orderNumber,
      customer_name: customerName,
      ...(numericPhone !== undefined ? { customer_phone: numericPhone } : {}),
      ...(body.customer_email ? { customer_email: String(body.customer_email).trim().toLowerCase() } : {}),
      dining_option: body.dining_option || "Dine-in",
      status: "pending",
      payment_method: body.payment_method || "gcash",
      payment_status: "pending",
      total_amount: finalTotal,
      ...(specialNotes ? { special_notes: specialNotes } : {}),
    };

    const createdOrder: any = await airtableCreate("Orders", orderFields);

    // 6. Persist child OrderItems records (food items have NO size/temperature/milk_type/sweetness)
    const createdItems: any[] = [];
    for (const item of verifiedItems) {
      try {
        const itemFields: Record<string, unknown> = {
          order_id: createdOrder.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        };
        if (!item.is_food) {
          itemFields.size = item.size;
          itemFields.temperature = item.temperature;
          itemFields.milk_type = item.milk_type;
          itemFields.sweetness = item.sweetness;
        }
        const itemRecord = await airtableCreate("OrderItems", itemFields);
        createdItems.push(itemRecord);
      } catch (err) {
        console.warn("OrderItem creation warning:", err);
      }
    }

    // 7. Create a matching PENDING payment record in Airtable Payments table
    let paymentRecord: any = null;
    try {
      const paymentRef = `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      paymentRecord = await airtableCreate("Payments", {
        payment_ref: paymentRef,
        order_id: createdOrder.id,
        order_number: orderNumber,
        amount: finalTotal,
        provider: String(body.payment_method || "gcash"),
        status: "pending", // NEVER mark completed without actual payment confirmation
        transaction_id: `AWAITING-CONFIRMATION-${orderNumber}`,
      });
    } catch (payErr) {
      console.warn("Payment record creation warning:", payErr);
    }

    // 8. Accurate ingredient-based Inventory deduction (only deduct what was actually ordered)
    const inventoryUpdates: Array<{ item: string; deducted: number; remaining: number }> = [];
    if (coffeeDrinkCount > 0 || oatMilkCount > 0 || honeyUsageCount > 0) {
      try {
        const inventoryList = await airtableList("Inventory", undefined, true);
        const deductMatching = async (predicate: (i: any) => boolean, amount: number) => {
          if (amount <= 0) return;
          const match = inventoryList.find(predicate);
          if (match && typeof match.stock_quantity === "number") {
            const newStock = Math.max(0, match.stock_quantity - amount);
            await airtableUpdate("Inventory", match.id, { stock_quantity: newStock });
            inventoryUpdates.push({
              item: String(match.item_name),
              deducted: amount,
              remaining: newStock,
            });
          }
        };

        await deductMatching(
          (i) =>
            String(i.category || "").toLowerCase().includes("bean") ||
            String(i.item_name || "").toLowerCase().includes("bean"),
          coffeeDrinkCount
        );
        await deductMatching(
          (i) => String(i.item_name || "").toLowerCase().includes("oat"),
          oatMilkCount
        );
        await deductMatching(
          (i) => String(i.item_name || "").toLowerCase().includes("honey"),
          honeyUsageCount
        );
      } catch (invErr) {
        console.warn("Inventory deduction warning:", invErr);
      }
    }

    // 9. Award loyalty points to customer record in Airtable Users if email matches
    const pointsEarned = Math.floor(finalTotal / 50);
    if (pointsEarned > 0 && body.customer_email) {
      try {
        const safeEmail = escapeFormulaString(String(body.customer_email).trim().toLowerCase());
        const userMatches = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true);
        if (userMatches.length > 0) {
          const cust: any = userMatches[0];
          const currentPts = Number(cust.loyalty_points) || 0;
          await airtableUpdate("Users", cust.id, {
            loyalty_points: currentPts + pointsEarned,
          });
        }
      } catch {
        // Non-blocking loyalty update
      }
    }

    return NextResponse.json(
      {
        ...createdOrder,
        subtotal_before_discount: calculatedSubtotal,
        promo_code: promoApplied,
        discount_amount: discountAmount,
        total_amount: finalTotal,
        payment_status: "pending",
        status: "pending",
        payment: paymentRecord,
        inventory_updates: inventoryUpdates,
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
