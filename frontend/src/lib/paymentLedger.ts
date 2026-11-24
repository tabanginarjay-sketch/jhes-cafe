/**
 * Authoritative Payment & Loyalty Ledger Separation, Audit Trail, and Normalization Layer.
 * Ensures zero mixing between PHP order payments, Bean Points loyalty records, refund records,
 * and shopping cart drafts while preserving all existing Airtable record IDs untouched.
 */

export type NormalizedPaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentProvider = "cash" | "gcash" | "maya" | "card";
export type VerificationMode = "cashier_counter" | "demo_simulated" | "provider_webhook" | "unverified";

export interface PaymentAuditEntry {
  at: string;
  action:
    | "created"
    | "cash_confirmed"
    | "demo_verified"
    | "webhook_verified"
    | "marked_failed"
    | "refunded";
  status: string;
  by: string;
  role?: string;
  ref?: string;
  reason?: string;
  amount?: number;
  is_simulated?: boolean;
}

export interface LinkedRefundRecord {
  id: string;
  refund_ref: string;
  original_payment_id: string;
  original_payment_ref: string;
  order_id: string;
  order_number: string;
  amount: number;
  currency: "PHP";
  provider: string;
  reason: string;
  refunded_by: string;
  refunded_role?: string;
  refunded_at: string;
}

export interface NormalizedPayment {
  id: string;
  payment_ref: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | number | null;
  order_status: string | null;
  order_payment_status: string | null;
  provider: PaymentProvider;
  payment_method: PaymentProvider;
  amount: number;
  currency: "PHP";
  status: NormalizedPaymentStatus;
  transaction_id: string;
  provider_transaction_ref: string;
  is_simulated: boolean;
  verification_mode: VerificationMode;
  failure_reason: string | null;
  refund: LinkedRefundRecord | null;
  refund_history: LinkedRefundRecord[];
  created_at: string;
  updated_at: string;
  verification_history: PaymentAuditEntry[];
}

export interface PaymentDashboardStats {
  total_count: number;
  total_collected: number;
  completed_count: number;
  verified_live_collected: number;
  simulated_demo_collected: number;
  pending_count: number;
  pending_amount: number;
  failed_count: number;
  failed_amount: number;
  refunded_count: number;
  refunded_amount: number;
}

export interface NormalizedLoyaltyTransaction {
  id: string;
  transaction_ref: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  transaction_type: "signup_bonus" | "order_earned" | "redemption" | "adjustment";
  points: number;
  signed_points: number;
  unit: "Bean Points";
  order_reference: string | null;
  idempotency_key: string;
  description: string;
  created_at: string;
}

export interface LoyaltyDashboardStats {
  total_transactions: number;
  total_points_issued: number;
  signup_bonus_points: number;
  order_earned_points: number;
  redeemed_points: number;
  net_points: number;
}

export const ONLINE_PAYMENT_PROVIDERS = new Set<string>(["gcash", "maya", "card"]);
export const VALID_PAYMENT_PROVIDERS = new Set<string>(["cash", "gcash", "maya", "card"]);
const AUDIT_SEPARATOR = " || AUDIT:";
const REFUND_PREFIX = "REFUND-OF:";

export function isLoyaltyRecord(rec: Record<string, any>): boolean {
  const provider = String(rec.provider || "").toLowerCase().trim();
  const paymentRef = String(rec.payment_ref || "").toUpperCase().trim();
  const orderNumber = String(rec.order_number || "").toUpperCase().trim();
  return (
    provider === "loyalty_bean_points" ||
    provider.startsWith("loyalty") ||
    paymentRef.startsWith("LTX-") ||
    orderNumber.startsWith("LOYALTY-") ||
    orderNumber.startsWith("LOYALTY_")
  );
}

export function isRefundRecord(rec: Record<string, any>): boolean {
  const provider = String(rec.provider || "").toLowerCase().trim();
  const paymentRef = String(rec.payment_ref || "").toUpperCase().trim();
  const txId = String(rec.transaction_id || "").trim();
  return (
    paymentRef.startsWith("REF-") ||
    provider.endsWith("_refund") ||
    provider === "refund" ||
    txId.startsWith(REFUND_PREFIX)
  );
}

export function isCartRecord(rec: Record<string, any>): boolean {
  const status = String(rec.status || "").toLowerCase().trim();
  const payStatus = String(rec.payment_status || "").toLowerCase().trim();
  const orderNumber = String(rec.order_number || "").toUpperCase().trim();
  const provider = String(rec.provider || "").toLowerCase().trim();
  return (
    status === "cart" ||
    status === "cart_cleared" ||
    payStatus === "cart" ||
    orderNumber.startsWith("CART-") ||
    provider === "cart"
  );
}

export function isAuthCredentialRecord(rec: Record<string, any>): boolean {
  const provider = String(rec.provider || "").toLowerCase().trim();
  const paymentRef = String(rec.payment_ref || "").toUpperCase().trim();
  const orderNumber = String(rec.order_number || "").toUpperCase().trim();
  return (
    provider === "auth_credential" ||
    paymentRef.startsWith("AUTH-CRED-") ||
    orderNumber === "AUTH-CREDENTIAL"
  );
}

export function isOrderPaymentRecord(rec: Record<string, any>): boolean {
  return (
    !isLoyaltyRecord(rec) &&
    !isRefundRecord(rec) &&
    !isCartRecord(rec) &&
    !isAuthCredentialRecord(rec)
  );
}

export function normalizePaymentStatus(raw?: unknown): NormalizedPaymentStatus {
  const s = String(raw || "pending").toLowerCase().trim();
  if (s === "completed" || s === "paid") return "completed";
  if (s === "failed") return "failed";
  if (s === "refunded") return "refunded";
  return "pending";
}

export function normalizeProvider(raw?: unknown): PaymentProvider {
  const p = String(raw || "cash").toLowerCase().trim();
  if (p === "gcash" || p === "maya" || p === "card" || p === "cash") {
    return p;
  }
  return "cash";
}

export function parseTransactionField(
  rawTxId: string | undefined | null,
  rawRecord: Record<string, any>
): {
  primaryRef: string;
  auditEntries: PaymentAuditEntry[];
  failureReason: string | null;
  isSimulated: boolean;
  verificationMode: VerificationMode;
  updatedAt: string;
} {
  const txStr = String(rawTxId || "").trim();
  let primaryRef = txStr;
  let parsedEntries: PaymentAuditEntry[] = [];

  const sepIdx = txStr.indexOf(AUDIT_SEPARATOR);
  if (sepIdx !== -1) {
    primaryRef = txStr.slice(0, sepIdx).trim();
    const jsonPart = txStr.slice(sepIdx + AUDIT_SEPARATOR.length).trim();
    try {
      const parsed = JSON.parse(jsonPart);
      if (Array.isArray(parsed)) {
        parsedEntries = parsed.filter((e) => e && typeof e === "object");
      }
    } catch {
      parsedEntries = [];
    }
  }

  const status = normalizePaymentStatus(rawRecord.status);
  const provider = normalizeProvider(rawRecord.provider);
  const createdAt = String(rawRecord.created_at || new Date().toISOString());

  // Always synthesize the initial creation event if not already recorded in audit entries
  const hasCreatedEntry = parsedEntries.some((e) => e.action === "created");
  const auditEntries: PaymentAuditEntry[] = [...parsedEntries];

  if (!hasCreatedEntry) {
    const initiallySimulated =
      ONLINE_PAYMENT_PROVIDERS.has(provider) &&
      (primaryRef.startsWith("DEMO-") ||
        primaryRef.startsWith("AWAITING-") ||
        String(rawRecord.order_id || "") === "recSample" ||
        String(rawRecord.order_number || "") === "ORD-1001");

    auditEntries.unshift({
      at: createdAt,
      action: "created",
      status: "pending",
      by: "Checkout System",
      role: "system",
      ref: primaryRef || String(rawRecord.payment_ref || ""),
      reason:
        provider === "cash"
          ? "Counter cash payment initiated upon order submission (awaiting cashier confirmation)."
          : "Online payment record initiated upon order submission (pending provider verification).",
      is_simulated: initiallySimulated,
    });

    // For legacy pre-audit records already completed/failed/refunded, synthesize a truthful state entry
    if (status === "completed" && parsedEntries.length === 0) {
      const isCashLegacy = provider === "cash";
      const isWebhookLegacy = primaryRef.startsWith("WEBHOOK-VERIFIED-");
      auditEntries.push({
        at: createdAt,
        action: isCashLegacy
          ? "cash_confirmed"
          : isWebhookLegacy
            ? "webhook_verified"
            : "demo_verified",
        status: "completed",
        by: isCashLegacy ? "Authorized Cashier (Legacy Record)" : isWebhookLegacy ? "Payment Gateway Webhook" : "Portfolio Demo Seed / Legacy Verification",
        ref: primaryRef,
        is_simulated: !isCashLegacy && !isWebhookLegacy,
      });
    } else if (status === "failed" && parsedEntries.length === 0) {
      auditEntries.push({
        at: createdAt,
        action: "marked_failed",
        status: "failed",
        by: "System / Legacy Admin Record",
        ref: primaryRef,
        reason: "Payment did not complete (recorded prior to structured failure reason tracking).",
      });
    } else if (status === "refunded" && parsedEntries.length === 0) {
      auditEntries.push({
        at: createdAt,
        action: "refunded",
        status: "refunded",
        by: "Administrator (Legacy Record)",
        ref: primaryRef,
        amount: Number(rawRecord.amount) || 0,
      });
    }
  }

  // Extract latest failure reason
  const failedEntry = [...auditEntries].reverse().find((e) => e.action === "marked_failed");
  const failureReason = failedEntry?.reason || (status === "failed" ? "Payment failed or declined." : null);

  // Determine verification mode and simulated status accurately
  const verifiedEntry = [...auditEntries]
    .reverse()
    .find((e) =>
      e.action === "webhook_verified" || e.action === "cash_confirmed" || e.action === "demo_verified"
    );

  let verificationMode: VerificationMode = "unverified";
  let isSimulated = false;

  if (primaryRef.startsWith("WEBHOOK-VERIFIED-") || verifiedEntry?.action === "webhook_verified") {
    verificationMode = "provider_webhook";
    isSimulated = false;
  } else if (
    provider === "cash" &&
    (primaryRef.startsWith("CASH-CONFIRMED-") ||
      verifiedEntry?.action === "cash_confirmed" ||
      (status === "completed" && primaryRef.startsWith("CONFIRMED-")))
  ) {
    verificationMode = "cashier_counter";
    isSimulated = false;
  } else if (
    primaryRef.startsWith("DEMO-") ||
    verifiedEntry?.action === "demo_verified" ||
    String(rawRecord.order_id || "") === "recSample" ||
    String(rawRecord.order_number || "") === "ORD-1001" ||
    (ONLINE_PAYMENT_PROVIDERS.has(provider) && status === "completed")
  ) {
    verificationMode = "demo_simulated";
    isSimulated = true;
  } else if (ONLINE_PAYMENT_PROVIDERS.has(provider)) {
    verificationMode = status === "pending" ? "unverified" : "demo_simulated";
    isSimulated = primaryRef.startsWith("DEMO-") || primaryRef.startsWith("AWAITING-");
  } else {
    verificationMode = provider === "cash" && status === "pending" ? "unverified" : "cashier_counter";
    isSimulated = false;
  }

  const latestAuditAt = auditEntries[auditEntries.length - 1]?.at || createdAt;

  return {
    primaryRef,
    auditEntries,
    failureReason,
    isSimulated,
    verificationMode,
    updatedAt: latestAuditAt,
  };
}

export function encodeTransactionField(primaryRef: string, auditEntries: PaymentAuditEntry[]): string {
  const cleanPrimary = String(primaryRef || "").split(AUDIT_SEPARATOR)[0].trim();
  // Keep audit history concise (max 12 entries)
  const bounded = auditEntries.slice(-12);
  return `${cleanPrimary}${AUDIT_SEPARATOR}${JSON.stringify(bounded)}`;
}

export function parseRefundRecord(raw: Record<string, any>): LinkedRefundRecord {
  const txStr = String(raw.transaction_id || "").trim();
  let originalPaymentId = "";
  let originalPaymentRef = "";
  let reason = "Refund issued by administrator";
  let refundedBy = "Administrator";
  let refundedRole = "manager";
  let refundedAt = String(raw.created_at || new Date().toISOString());

  if (txStr.startsWith(REFUND_PREFIX)) {
    const payload = txStr.slice(REFUND_PREFIX.length).trim();
    try {
      const parsed = JSON.parse(payload);
      originalPaymentId = String(parsed.original_payment_id || "");
      originalPaymentRef = String(parsed.original_payment_ref || "");
      reason = String(parsed.reason || reason);
      refundedBy = String(parsed.by || refundedBy);
      refundedRole = String(parsed.role || refundedRole);
      refundedAt = String(parsed.at || refundedAt);
    } catch {
      originalPaymentId = payload;
    }
  }

  return {
    id: String(raw.id || ""),
    refund_ref: String(raw.payment_ref || raw.id || ""),
    original_payment_id: originalPaymentId,
    original_payment_ref: originalPaymentRef,
    order_id: String(raw.order_id || ""),
    order_number: String(raw.order_number || ""),
    amount: Number(raw.amount) || 0,
    currency: "PHP",
    provider: String(raw.provider || "").replace(/_refund$/i, "") || "cash",
    reason,
    refunded_by: refundedBy,
    refunded_role: refundedRole,
    refunded_at: refundedAt,
  };
}

export function encodeRefundTransactionId(meta: {
  original_payment_id: string;
  original_payment_ref: string;
  by: string;
  role: string;
  reason: string;
  at: string;
}): string {
  return `${REFUND_PREFIX}${JSON.stringify(meta)}`;
}

export function normalizePaymentsWithLinks(
  rawPaymentRows: Record<string, any>[],
  rawOrderRows: Record<string, any>[]
): { payments: NormalizedPayment[]; stats: PaymentDashboardStats } {
  // Index non-cart Orders by id and uppercase order_number
  const orderById = new Map<string, Record<string, any>>();
  const orderByNumber = new Map<string, Record<string, any>>();

  for (const ord of rawOrderRows) {
    if (isCartRecord(ord)) continue;
    if (ord.id) orderById.set(String(ord.id), ord);
    if (ord.order_number) orderByNumber.set(String(ord.order_number).toUpperCase().trim(), ord);
  }

  // Separate refund child records from genuine order payments (ignoring loyalty & cart records completely)
  const refundsByPaymentId = new Map<string, LinkedRefundRecord[]>();
  const refundsByPaymentRef = new Map<string, LinkedRefundRecord[]>();
  const refundsByOrderNumber = new Map<string, LinkedRefundRecord[]>();
  const orderPaymentRows: Record<string, any>[] = [];

  for (const row of rawPaymentRows) {
    if (isLoyaltyRecord(row) || isCartRecord(row) || isAuthCredentialRecord(row)) continue;
    if (isRefundRecord(row)) {
      const parsedRef = parseRefundRecord(row);
      if (parsedRef.original_payment_id) {
        const list = refundsByPaymentId.get(parsedRef.original_payment_id) || [];
        list.push(parsedRef);
        refundsByPaymentId.set(parsedRef.original_payment_id, list);
      }
      if (parsedRef.original_payment_ref) {
        const list = refundsByPaymentRef.get(parsedRef.original_payment_ref) || [];
        list.push(parsedRef);
        refundsByPaymentRef.set(parsedRef.original_payment_ref, list);
      }
      if (parsedRef.order_number) {
        const key = parsedRef.order_number.toUpperCase().trim();
        const list = refundsByOrderNumber.get(key) || [];
        list.push(parsedRef);
        refundsByOrderNumber.set(key, list);
      }
      continue;
    }
    orderPaymentRows.push(row);
  }

  const payments: NormalizedPayment[] = orderPaymentRows.map((row) => {
    const id = String(row.id || "");
    const paymentRef = String(row.payment_ref || id);
    const orderId = String(row.order_id || "");
    const orderNumber = String(row.order_number || "");
    const linkedOrder =
      orderById.get(orderId) ||
      orderByNumber.get(orderNumber.toUpperCase().trim()) ||
      null;

    const status = normalizePaymentStatus(row.status);
    const provider = normalizeProvider(row.provider);
    const amount = Number(row.amount) || 0;
    const txMeta = parseTransactionField(row.transaction_id, row);

    const linkedRefunds =
      refundsByPaymentId.get(id) ||
      refundsByPaymentRef.get(paymentRef) ||
      (status === "refunded" ? refundsByOrderNumber.get(orderNumber.toUpperCase().trim()) || [] : []);

    const latestRefund = linkedRefunds.length > 0 ? linkedRefunds[linkedRefunds.length - 1] : null;

    return {
      id,
      payment_ref: paymentRef,
      order_id: orderId,
      order_number: orderNumber || (linkedOrder?.order_number ? String(linkedOrder.order_number) : "—"),
      customer_name: linkedOrder?.customer_name ? String(linkedOrder.customer_name) : "Registered Customer",
      customer_email: linkedOrder?.customer_email ? String(linkedOrder.customer_email) : null,
      customer_phone: linkedOrder?.customer_phone ?? null,
      order_status: linkedOrder?.status ? String(linkedOrder.status).trim() : null,
      order_payment_status: linkedOrder?.payment_status ? String(linkedOrder.payment_status).trim() : null,
      provider,
      payment_method: provider,
      amount,
      currency: "PHP",
      status,
      transaction_id: txMeta.primaryRef,
      provider_transaction_ref: txMeta.primaryRef,
      is_simulated: txMeta.isSimulated,
      verification_mode: txMeta.verificationMode,
      failure_reason: txMeta.failureReason,
      refund: latestRefund,
      refund_history: linkedRefunds,
      created_at: String(row.created_at || ""),
      updated_at: txMeta.updatedAt,
      verification_history: txMeta.auditEntries,
    };
  });

  // Sort newest first
  payments.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  const stats = computePaymentStats(payments);
  return { payments, stats };
}

export function computePaymentStats(payments: NormalizedPayment[]): PaymentDashboardStats {
  let totalCollected = 0;
  let completedCount = 0;
  let verifiedLiveCollected = 0;
  let simulatedDemoCollected = 0;
  let pendingCount = 0;
  let pendingAmount = 0;
  let failedCount = 0;
  let failedAmount = 0;
  let refundedCount = 0;
  let refundedAmount = 0;

  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (p.status === "completed") {
      completedCount += 1;
      totalCollected += amt;
      if (p.is_simulated) {
        simulatedDemoCollected += amt;
      } else {
        verifiedLiveCollected += amt;
      }
    } else if (p.status === "pending") {
      pendingCount += 1;
      pendingAmount += amt;
    } else if (p.status === "failed") {
      failedCount += 1;
      failedAmount += amt;
    } else if (p.status === "refunded") {
      refundedCount += 1;
      refundedAmount += p.refund?.amount ?? amt;
    }
  }

  return {
    total_count: payments.length,
    total_collected: Math.round(totalCollected * 100) / 100,
    completed_count: completedCount,
    verified_live_collected: Math.round(verifiedLiveCollected * 100) / 100,
    simulated_demo_collected: Math.round(simulatedDemoCollected * 100) / 100,
    pending_count: pendingCount,
    pending_amount: Math.round(pendingAmount * 100) / 100,
    failed_count: failedCount,
    failed_amount: Math.round(failedAmount * 100) / 100,
    refunded_count: refundedCount,
    refunded_amount: Math.round(refundedAmount * 100) / 100,
  };
}

export function normalizeLoyaltyTransactions(
  rawPaymentRows: Record<string, any>[],
  rawUserRows: Record<string, any>[]
): { transactions: NormalizedLoyaltyTransaction[]; stats: LoyaltyDashboardStats } {
  const userById = new Map<string, Record<string, any>>();
  for (const u of rawUserRows) {
    if (u.id) userById.set(String(u.id), u);
  }

  const transactions: NormalizedLoyaltyTransaction[] = rawPaymentRows
    .filter((row) => isLoyaltyRecord(row))
    .map((row) => {
      const customerId = String(row.order_id || "");
      const linkedUser = userById.get(customerId) || null;
      const rawType = String(row.order_number || "").toUpperCase().trim();
      const txId = String(row.transaction_id || "").trim();
      const pts = Math.abs(Number(row.amount) || 0);

      let txType: NormalizedLoyaltyTransaction["transaction_type"] = "adjustment";
      let description = "Loyalty Bean Points adjustment";
      let orderReference: string | null = null;
      let signedPoints = pts;

      if (rawType.includes("SIGNUP")) {
        txType = "signup_bonus";
        description = "Welcome bonus awarded upon account registration";
      } else if (rawType.includes("ORDER_EARNED") || rawType.includes("EARN")) {
        txType = "order_earned";
        // Extract order number from idempotency key e.g. ORD-recXXXX-JHE-2026-12345
        const parts = txId.split("-");
        if (parts.length >= 3 && parts[0] === "ORD") {
          orderReference = parts.slice(2).join("-");
        }
        description = orderReference
          ? `Bean Points earned from Order #${orderReference}`
          : "Bean Points earned from completed checkout order";
      } else if (rawType.includes("REDEEM")) {
        txType = "redemption";
        signedPoints = -pts;
        description = "Bean Points redeemed by customer";
      }

      return {
        id: String(row.id || ""),
        transaction_ref: String(row.payment_ref || row.id || ""),
        customer_id: customerId,
        customer_name: linkedUser?.full_name ? String(linkedUser.full_name) : "Registered Member",
        customer_email: linkedUser?.email ? String(linkedUser.email) : null,
        transaction_type: txType,
        points: pts,
        signed_points: signedPoints,
        unit: "Bean Points",
        order_reference: orderReference,
        idempotency_key: txId,
        description,
        created_at: String(row.created_at || ""),
      };
    });

  transactions.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  let totalIssued = 0;
  let signupBonus = 0;
  let orderEarned = 0;
  let redeemed = 0;

  for (const tx of transactions) {
    if (tx.transaction_type === "redemption") {
      redeemed += tx.points;
    } else {
      totalIssued += tx.points;
      if (tx.transaction_type === "signup_bonus") signupBonus += tx.points;
      if (tx.transaction_type === "order_earned") orderEarned += tx.points;
    }
  }

  return {
    transactions,
    stats: {
      total_transactions: transactions.length,
      total_points_issued: totalIssued,
      signup_bonus_points: signupBonus,
      order_earned_points: orderEarned,
      redeemed_points: redeemed,
      net_points: Math.max(0, totalIssued - redeemed),
    },
  };
}
