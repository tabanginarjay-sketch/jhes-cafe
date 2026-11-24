import { airtableList, airtableCreate, airtableUpdate, airtableDelete } from "@/lib/airtable";
import { escapeFormulaString } from "@/lib/serverAuth";

export interface PersistedCartItem {
  id: string;
  productId?: string;
  slug?: string;
  name: string;
  category?: string;
  basePrice?: number;
  price: number;
  quantity: number;
  imageUrl?: string;
  isBakery?: boolean;

  // Drink customizations
  size?: string;
  temperature?: "Hot" | "Iced";
  milk?: string;
  sweetness?: number;
  extraShots?: number;
  toppings?: string[];

  // Pastry & Food customizations
  warming?: string;
  addOns?: string[];
  servingStyle?: string;
  finishes?: string[];

  customizationSummary?: string;
}

export interface CanonicalCustomer {
  id: string;
  full_name: string;
  email: string;
  phone?: string | number | null;
  role: string;
  loyalty_points: number;
  auth_provider?: string;
  avatar_url?: string | null;
}

/**
 * Retrieves or creates a single canonical Airtable Users record for the given verified email.
 * Deduplicates multiple records if they exist, prioritizing the record with existing loyalty points or phone.
 */
export async function getCanonicalCustomer(
  email: string,
  preferredName?: string,
  phone?: string | number | null,
  authProvider: string = "email",
  avatarUrl?: string | null
): Promise<CanonicalCustomer> {
  const cleanEmail = email.toLowerCase().trim();
  const safeEmail = escapeFormulaString(cleanEmail);

  let existing: any[] = [];
  try {
    existing = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true);
  } catch (err) {
    console.warn("Error listing users for deduplication:", err);
  }

  if (existing.length > 0) {
    // Sort to pick the best record: highest points, having phone, or oldest
    existing.sort((a, b) => {
      const ptsA = Number(a.loyalty_points) || 0;
      const ptsB = Number(b.loyalty_points) || 0;
      if (ptsB !== ptsA) return ptsB - ptsA;
      if (a.phone && !b.phone) return -1;
      if (!a.phone && b.phone) return 1;
      return String(a.id).localeCompare(String(b.id));
    });

    const canonical = existing[0];
    const points = Number(canonical.loyalty_points) ?? 25;

    // If loyalty_points was unset in Airtable, initialize it to 25 welcome points
    if (canonical.loyalty_points === undefined || canonical.loyalty_points === null) {
      try {
        await airtableUpdate("Users", canonical.id, { loyalty_points: 25 });
        canonical.loyalty_points = 25;
      } catch {
        // Non-blocking update
      }
    }

    return {
      id: canonical.id,
      full_name: canonical.full_name || preferredName || "Customer",
      email: cleanEmail,
      phone: canonical.phone ?? phone ?? null,
      role: canonical.role || "customer",
      loyalty_points: Number(canonical.loyalty_points) || 25,
      auth_provider: canonical.auth_provider || authProvider,
      avatar_url: avatarUrl || null,
    };
  }

  // Create new canonical record
  const newFields: Record<string, unknown> = {
    full_name: preferredName || "Valued Customer",
    email: cleanEmail,
    role: "customer",
    loyalty_points: 25,
    ...(phone !== undefined && phone !== null ? { phone } : {}),
  };

  try {
    const created: any = await airtableCreate("Users", newFields);
    // Seed initial signup welcome transaction
    try {
      await recordLoyaltyTransaction({
        customerId: created.id,
        orderNumber: "WELCOME-BONUS",
        points: 25,
        type: "signup",
        idempotencyKey: `SIGNUP-${created.id}`,
        description: "Welcome gift: 25 Bean Points",
      });
    } catch {
      // Non-blocking
    }

    return {
      id: created.id,
      full_name: String(created.full_name || preferredName || "Valued Customer"),
      email: cleanEmail,
      phone: created.phone ?? phone ?? null,
      role: "customer",
      loyalty_points: 25,
      auth_provider: authProvider,
      avatar_url: avatarUrl || null,
    };
  } catch (err) {
    console.error("Failed to create canonical user:", err);
    return {
      id: `cust-${Date.now()}`,
      full_name: preferredName || "Valued Customer",
      email: cleanEmail,
      phone: phone ?? null,
      role: "customer",
      loyalty_points: 25,
      auth_provider: authProvider,
      avatar_url: avatarUrl || null,
    };
  }
}

export interface CustomerLoyaltyTransaction {
  id: string;
  transaction_ref: string;
  transaction_type: "signup_bonus" | "order_earned" | "redemption" | "adjustment";
  points: number;
  signed_points: number;
  order_reference: string | null;
  description: string;
  created_at: string;
}

export interface CustomerLoyaltySummary {
  balance: number;
  total_earned: number;
  total_redeemed: number;
  transactions: CustomerLoyaltyTransaction[];
}

/**
 * Single authoritative loyalty calculator & ledger reconciler scoped strictly to canonical customerId.
 * Guarantees Header, My Account, and Checkout always read the exact same Bean Points balance.
 */
export async function getCustomerLoyaltySummary(
  customerId: string,
  customerEmail: string
): Promise<CustomerLoyaltySummary> {
  const cleanEmail = customerEmail.toLowerCase().trim();
  const safeEmail = escapeFormulaString(cleanEmail);

  let currentPoints = 0;
  let canonicalUser: any = null;

  try {
    const matches = await airtableList("Users", `LOWER({email}) = '${safeEmail}'`, true);
    if (matches.length > 0) {
      // Strictly prefer the exact canonical customerId, falling back to highest-points record
      canonicalUser =
        matches.find((m: any) => String(m.id) === String(customerId)) ||
        [...matches].sort((a: any, b: any) => {
          const ptsDiff = (Number(b.loyalty_points) || 0) - (Number(a.loyalty_points) || 0);
          if (ptsDiff !== 0) return ptsDiff;
          if (a.phone && !b.phone) return -1;
          if (!a.phone && b.phone) return 1;
          return String(a.id).localeCompare(String(b.id));
        })[0];
      currentPoints = Number(canonicalUser.loyalty_points) || 0;
    }
  } catch {
    // ignore
  }

  const targetCustomerId = String(canonicalUser?.id || customerId);
  const transactions: CustomerLoyaltyTransaction[] = [];

  try {
    const payments = await airtableList(
      "Payments",
      `{provider} = 'loyalty_bean_points'`,
      true
    );

    const customerTxs = payments.filter((p: any) => {
      const txId = String(p.transaction_id || "");
      const orderId = String(p.order_id || "");
      return orderId === targetCustomerId || txId.includes(targetCustomerId);
    });

    let totalEarned = 0;
    let totalRedeemed = 0;

    for (const tx of customerTxs) {
      const amt = Math.abs(Number(tx.amount) || 0);
      const rawType = String(tx.order_number || "").toUpperCase().trim();
      const txKey = String(tx.transaction_id || "").trim();

      let txType: CustomerLoyaltyTransaction["transaction_type"] = "adjustment";
      let signed = amt;
      let orderRef: string | null = null;
      let description = "Loyalty Bean Points credit";

      if (rawType.includes("REDEEM")) {
        txType = "redemption";
        signed = -amt;
        totalRedeemed += amt;
        description = "Bean Points redeemed for reward";
      } else if (rawType.includes("SIGNUP")) {
        txType = "signup_bonus";
        totalEarned += amt;
        description = "Welcome bonus awarded on account registration";
      } else if (rawType.includes("ORDER_EARNED") || rawType.includes("EARN")) {
        txType = "order_earned";
        totalEarned += amt;
        const parts = txKey.split("-");
        if (parts.length >= 3 && parts[0] === "ORD") {
          orderRef = parts.slice(2).join("-");
        }
        description = orderRef
          ? `Earned from Order #${orderRef}`
          : "Earned from completed coffee order";
      } else {
        totalEarned += amt;
      }

      transactions.push({
        id: String(tx.id || ""),
        transaction_ref: String(tx.payment_ref || tx.id || ""),
        transaction_type: txType,
        points: amt,
        signed_points: signed,
        order_reference: orderRef,
        description,
        created_at: String(tx.created_at || ""),
      });
    }

    transactions.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

    if (transactions.length > 0) {
      const reconciled = Math.max(0, totalEarned - totalRedeemed);
      if (canonicalUser && reconciled !== currentPoints) {
        try {
          await airtableUpdate("Users", canonicalUser.id, { loyalty_points: reconciled });
        } catch {
          // Non-blocking sync
        }
      }
      return {
        balance: reconciled,
        total_earned: totalEarned,
        total_redeemed: totalRedeemed,
        transactions,
      };
    }
  } catch (ledgerErr) {
    console.warn("Ledger reconciliation notice:", ledgerErr);
  }

  // Legacy customer without ledger rows yet — preserve existing balance truthfully
  return {
    balance: Math.max(0, currentPoints),
    total_earned: Math.max(0, currentPoints),
    total_redeemed: 0,
    transactions: [],
  };
}

/**
 * Reconciles the customer's loyalty balance against the Payments ledger.
 */
export async function reconcileCustomerLoyalty(
  customerId: string,
  customerEmail: string
): Promise<number> {
  const summary = await getCustomerLoyaltySummary(customerId, customerEmail);
  return summary.balance;
}

/**
 * Records an immutable loyalty transaction in Payments table and updates Users.loyalty_points.
 */
export async function recordLoyaltyTransaction({
  customerId,
  orderId,
  orderNumber,
  points,
  type,
  idempotencyKey,
  description,
}: {
  customerId: string;
  orderId?: string;
  orderNumber: string;
  points: number;
  type: "signup" | "order_earned" | "redemption";
  idempotencyKey: string;
  description?: string;
}): Promise<boolean> {
  if (points <= 0 && type !== "redemption") return false;

  const safeKey = escapeFormulaString(idempotencyKey);
  try {
    const existing = await airtableList(
      "Payments",
      `AND({provider} = 'loyalty_bean_points', {transaction_id} = '${safeKey}')`,
      true
    );
    if (existing.length > 0) {
      console.log(`Loyalty transaction ${idempotencyKey} already recorded. Skipping.`);
      return false; // Idempotent skip
    }
  } catch {
    // If check fails, continue safely
  }

  try {
    const paymentRef = `LTX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await airtableCreate("Payments", {
      payment_ref: paymentRef,
      order_id: customerId, // Stores canonical customer ID
      order_number: `LOYALTY-${type.toUpperCase()}`,
      amount: Math.abs(points),
      provider: "loyalty_bean_points",
      status: "completed",
      transaction_id: idempotencyKey,
    });

    // Update customer's cached points in Users table
    try {
      const userMatches = await airtableList("Users", `RECORD_ID() = '${customerId}'`, true);
      if (userMatches.length > 0) {
        const u = userMatches[0];
        const prev = Number(u.loyalty_points) || 0;
        const next = type === "redemption" ? Math.max(0, prev - points) : prev + points;
        await airtableUpdate("Users", customerId, { loyalty_points: next });
      }
    } catch {
      // Non-blocking
    }

    return true;
  } catch (err) {
    console.error("Failed to record loyalty transaction:", err);
    return false;
  }
}

/**
 * Retrieves the persistent active cart for a customer from Airtable Orders table.
 */
export async function getCustomerActiveCart(
  customerEmail: string,
  customerId?: string
): Promise<{ cartRecordId: string | null; items: PersistedCartItem[]; subtotal: number }> {
  const cleanEmail = customerEmail.toLowerCase().trim();
  const safeEmail = escapeFormulaString(cleanEmail);

  try {
    const formula = `AND({status} = 'cart', LOWER({customer_email}) = '${safeEmail}')`;
    const carts = await airtableList("Orders", formula, true);

    if (carts.length === 0) {
      return { cartRecordId: null, items: [], subtotal: 0 };
    }

    const cartRecord: any = carts[0];
    let items: PersistedCartItem[] = [];

    if (cartRecord.special_notes) {
      try {
        const parsed = JSON.parse(cartRecord.special_notes);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (Array.isArray(parsed?.items)) {
          items = parsed.items;
        }
      } catch {
        items = [];
      }
    }

    const subtotal = Number(cartRecord.total_amount) || 0;
    return {
      cartRecordId: cartRecord.id,
      items,
      subtotal,
    };
  } catch (err) {
    console.warn("Error getting active cart:", err);
    return { cartRecordId: null, items: [], subtotal: 0 };
  }
}

/**
 * Saves or updates the customer's active cart in Airtable Orders table.
 */
export async function saveCustomerActiveCart(
  customerEmail: string,
  customerName: string,
  customerId: string,
  items: PersistedCartItem[]
): Promise<{ success: boolean; cartRecordId?: string; totalAmount: number }> {
  const cleanEmail = customerEmail.toLowerCase().trim();
  const safeEmail = escapeFormulaString(cleanEmail);

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const payloadJson = JSON.stringify({
    items,
    customerId,
    updatedAt: new Date().toISOString(),
  });

  try {
    const formula = `AND({status} = 'cart', LOWER({customer_email}) = '${safeEmail}')`;
    const existing = await airtableList("Orders", formula, true);

    if (existing.length > 0) {
      const cartRec: any = existing[0];
      await airtableUpdate("Orders", cartRec.id, {
        total_amount: subtotal,
        special_notes: payloadJson,
        payment_status: "cart",
        customer_name: customerName,
      });
      return { success: true, cartRecordId: cartRec.id, totalAmount: subtotal };
    }

    const orderNumber = `CART-${customerId ? customerId.slice(-8).toUpperCase() : Math.floor(1000 + Math.random() * 9000)}`;
    const created: any = await airtableCreate("Orders", {
      order_number: orderNumber,
      customer_name: customerName,
      customer_email: cleanEmail,
      status: "cart",
      payment_status: "cart",
      dining_option: "Takeaway",
      payment_method: "cash",
      total_amount: subtotal,
      special_notes: payloadJson,
    });

    return { success: true, cartRecordId: created.id, totalAmount: subtotal };
  } catch (err) {
    console.error("Failed to save active cart to Airtable:", err);
    return { success: false, totalAmount: subtotal };
  }
}

/**
 * Clears or deletes the active cart record for a customer upon checkout completion or manual cart purge.
 */
export async function clearCustomerActiveCart(customerEmail: string): Promise<boolean> {
  const cleanEmail = customerEmail.toLowerCase().trim();
  const safeEmail = escapeFormulaString(cleanEmail);

  try {
    const formula = `AND({status} = 'cart', LOWER({customer_email}) = '${safeEmail}')`;
    const existing = await airtableList("Orders", formula, true);

    for (const rec of existing) {
      try {
        await airtableDelete("Orders", rec.id);
      } catch {
        // Fallback: update status to empty
        await airtableUpdate("Orders", rec.id, {
          status: "cart_cleared",
          total_amount: 0,
          special_notes: "{}",
        });
      }
    }
    return true;
  } catch (err) {
    console.warn("Failed to clear active cart:", err);
    return false;
  }
}
