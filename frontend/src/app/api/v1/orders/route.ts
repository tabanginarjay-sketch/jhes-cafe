import crypto from "crypto";
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
const ALLOWED_PAYMENT_METHODS = new Set(["gcash", "maya", "card", "cash"]);
const ALLOWED_DINING_OPTIONS = new Set(["Dine-in", "Takeaway"]);
const SPECIAL_INSTRUCTIONS_MAX_LEN = 200;
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

// In-memory fast-path guards against concurrent double-clicks on warm instances
const inFlightIdempotencyKeys = new Set<string>();
const recentIdempotencyOrders = new Map<
  string,
  { orderNumber: string; orderId: string; expiresAt: number }
>();

function pruneExpiredIdempotencyEntries() {
  const now = Date.now();
  for (const [key, entry] of recentIdempotencyOrders.entries()) {
    if (entry.expiresAt <= now) {
      recentIdempotencyOrders.delete(key);
    }
  }
}

function buildIdempotencyTag(ownerKey: string, rawKey: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(`${ownerKey}:${rawKey}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `IDEM-${digest}`;
}

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
  // 1. Strict Server-Side Authentication Validation (guests cannot submit orders)
  const admin = getAuthenticatedAdmin(req);
  const user = getAuthenticatedUser(req);

  if (!user && !admin) {
    return NextResponse.json(
      { detail: "Authentication required to place an order. Please sign in first." },
      { status: 401 }
    );
  }

  let acquiredIdemTag: string | null = null;

  try {
    const body = await req.json();

    // 2. Bind order ownership strictly to authenticated session email for customer requests
    const verifiedCustomerEmail =
      !admin && user?.email
        ? user.email.trim().toLowerCase()
        : body.customer_email
          ? String(body.customer_email).trim().toLowerCase()
          : admin?.email?.trim().toLowerCase() || undefined;

    const customerName = String(body.customer_name || user?.name || "").trim();
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

    // 3. Validate payment method, dining option, and special instructions length
    const rawPaymentMethod = String(body.payment_method || "gcash").trim().toLowerCase();
    if (!ALLOWED_PAYMENT_METHODS.has(rawPaymentMethod)) {
      return NextResponse.json(
        { detail: "Unsupported payment method. Choose GCash, Maya, Credit / Debit Card, or Counter Cash." },
        { status: 400 }
      );
    }

    const rawDiningOption = String(body.dining_option || "Dine-in").trim();
    const diningOption = ALLOWED_DINING_OPTIONS.has(rawDiningOption) ? rawDiningOption : "Dine-in";

    const rawSpecialNotes = body.special_notes ? String(body.special_notes).trim() : "";
    if (rawSpecialNotes.length > SPECIAL_INSTRUCTIONS_MAX_LEN) {
      return NextResponse.json(
        { detail: `Special instructions cannot exceed ${SPECIAL_INSTRUCTIONS_MAX_LEN} characters.` },
        { status: 400 }
      );
    }

    // 4. Duplicate Order Submission Guard (Idempotency Key + Airtable Verification)
    pruneExpiredIdempotencyEntries();
    const rawIdempotencyKey = String(
      req.headers.get("x-idempotency-key") || body.idempotency_key || ""
    ).trim();

    if (rawIdempotencyKey) {
      const idemTag = buildIdempotencyTag(verifiedCustomerEmail || user?.sub || "member", rawIdempotencyKey);
      if (inFlightIdempotencyKeys.has(idemTag)) {
        return NextResponse.json(
          {
            detail: "This order is already being submitted. Duplicate request prevented.",
            duplicate_prevented: true,
          },
          { status: 409 }
        );
      }
      const recent = recentIdempotencyOrders.get(idemTag);
      if (recent) {
        return NextResponse.json(
          {
            detail: `Duplicate order submission prevented. Order #${recent.orderNumber} was already created.`,
            duplicate_prevented: true,
            existing_order_number: recent.orderNumber,
            existing_order_id: recent.orderId,
          },
          { status: 409 }
        );
      }

      // Acquire in-flight lock before async Airtable checks
      inFlightIdempotencyKeys.add(idemTag);
      acquiredIdemTag = idemTag;

      // Cross-instance durable duplicate check in Airtable Payments.transaction_id
      try {
        const safeTag = escapeFormulaString(idemTag);
        const existingPayments = await airtableList(
          "Payments",
          `FIND('${safeTag}', {transaction_id})`,
          true
        );
        if (existingPayments.length > 0) {
          const existingRef = String(existingPayments[0].order_number || "");
          return NextResponse.json(
            {
              detail: `Duplicate order submission prevented. Order #${existingRef} has already been recorded.`,
              duplicate_prevented: true,
              existing_order_number: existingRef,
              existing_order_id: existingPayments[0].order_id,
            },
            { status: 409 }
          );
        }
      } catch {
        // Proceed with in-memory lock if Payments table check fails transiently
      }
    }

    // 5. Fetch live Products from Airtable for database-driven prices & availability checks
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

    // 6. Server-side price verification and food vs drink normalization
    let calculatedSubtotal = 0;
    const verifiedItems: any[] = [];
    let coffeeDrinkCount = 0;
    let oatMilkCount = 0;
    let honeyUsageCount = 0;

    for (const item of items) {
      const liveProd = findLiveProduct(item);
      if (liveProd && !Boolean(liveProd.is_available)) {
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
      const qty = Math.max(1, Math.min(20, Math.floor(Number(item.quantity) || 1)));

      const dbBasePrice =
        liveProd?.price !== undefined ? Number(liveProd.price) : Number(item.unit_price || item.price) || 200;
      const optionDelta = calculateItemDelta(item, isFood);
      const verifiedUnitPrice = Math.max(50, dbBasePrice + optionDelta);
      const verifiedSubtotal = verifiedUnitPrice * qty;

      calculatedSubtotal += verifiedSubtotal;

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

    // 7. Optional Demo Promo Code (FIRSTSIP15 = 15% off)
    const rawPromo = String(body.promo_code || "").trim().toUpperCase();
    const promoApplied = rawPromo === BRAND_CONFIG.promo.code ? rawPromo : null;
    const discountAmount = promoApplied
      ? Math.round(calculatedSubtotal * BRAND_CONFIG.promo.discountRate)
      : 0;
    const finalTotal = Math.max(0, Math.round((calculatedSubtotal - discountAmount) * 100) / 100);

    // Ensure unique JHE- order number
    let orderNumber =
      typeof body.order_number === "string" && /^JHE-[A-Z0-9-]{4,24}$/.test(body.order_number.trim())
        ? body.order_number.trim()
        : `JHE-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const safeOrderNum = escapeFormulaString(orderNumber);
      const existingByNum = await airtableList("Orders", `{order_number} = '${safeOrderNum}'`, true);
      if (existingByNum.length > 0) {
        if (rawIdempotencyKey) {
          return NextResponse.json(
            {
              detail: `Duplicate order submission prevented. Order #${orderNumber} already exists.`,
              duplicate_prevented: true,
              existing_order_number: orderNumber,
              existing_order_id: existingByNum[0].id,
            },
            { status: 409 }
          );
        }
        orderNumber = `JHE-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      }
    } catch {
      // Ignore collision lookup error
    }

    const numericPhone = sanitizeNumericPhone(body.customer_phone);
    const seatingZone = body.seating_zone ? String(body.seating_zone).trim().slice(0, 60) : "";
    const tableNumber = body.table_number ? String(body.table_number).trim().slice(0, 20) : "";
    const diningMeta =
      diningOption === "Dine-in"
        ? [seatingZone ? `Area: ${seatingZone}` : null, tableNumber ? `Table: ${tableNumber}` : null]
            .filter(Boolean)
            .join(", ")
        : "Counter Pickup";

    const specialNotes = [
      diningMeta || null,
      rawSpecialNotes || null,
      promoApplied ? `Promo applied: ${promoApplied} (-₱${discountAmount})` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    // 8. Persist primary Order record in Airtable
    // Strictly separate status ("pending") and payment_status ("pending"); NEVER trust client status
    const orderFields: Record<string, unknown> = {
      order_number: orderNumber,
      customer_name: customerName,
      ...(numericPhone !== undefined ? { customer_phone: numericPhone } : {}),
      ...(verifiedCustomerEmail ? { customer_email: verifiedCustomerEmail } : {}),
      dining_option: diningOption,
      status: "pending",
      payment_method: rawPaymentMethod,
      payment_status: "pending",
      total_amount: finalTotal,
      ...(specialNotes ? { special_notes: specialNotes } : {}),
    };

    const createdOrder: any = await airtableCreate("Orders", orderFields);

    if (acquiredIdemTag) {
      recentIdempotencyOrders.set(acquiredIdemTag, {
        orderNumber,
        orderId: createdOrder.id,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });
    }

    // 9. Persist child OrderItems records (food items strictly omit drink columns)
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

    // 10. Create a matching PENDING payment record in Airtable Payments table
    let paymentRecord: any = null;
    try {
      const paymentRef = `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const txPrefix =
        rawPaymentMethod === "cash" ? "COUNTER-CASH-PENDING" : "DEMO-SIMULATED-PENDING";
      const txId = `${txPrefix}-${orderNumber}${acquiredIdemTag ? `-${acquiredIdemTag}` : ""}`;
      paymentRecord = await airtableCreate("Payments", {
        payment_ref: paymentRef,
        order_id: createdOrder.id,
        order_number: orderNumber,
        amount: finalTotal,
        provider: rawPaymentMethod,
        status: "pending", // NEVER mark paid/completed without verified confirmation
        transaction_id: txId,
      });
    } catch (payErr) {
      console.warn("Payment record creation warning:", payErr);
    }

    // 11. Accurate ingredient-based Inventory deduction
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

    // 12. Award loyalty points to authenticated customer record in Airtable Users
    const pointsEarned = Math.floor(finalTotal / 50);
    if (pointsEarned > 0 && verifiedCustomerEmail) {
      try {
        const safeEmail = escapeFormulaString(verifiedCustomerEmail);
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
        payment_mode: rawPaymentMethod === "cash" ? "counter_cash" : "demo_simulated",
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
  } finally {
    if (acquiredIdemTag) {
      inFlightIdempotencyKeys.delete(acquiredIdemTag);
    }
  }
}
