import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { airtableGet, airtableList, airtableUpdate } from "@/lib/airtable";
import { escapeFormulaString } from "@/lib/serverAuth";
import {
  encodeTransactionField,
  isAuthCredentialRecord,
  isCartRecord,
  isLoyaltyRecord,
  isRefundRecord,
  normalizePaymentStatus,
  normalizeProvider,
  ONLINE_PAYMENT_PROVIDERS,
  parseTransactionField,
  type PaymentAuditEntry,
} from "@/lib/paymentLedger";

function getWebhookSecret(): string | null {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function verifyWebhookSignature(rawBody: string, providedSig: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
  const cleanProvided = providedSig.replace(/^sha256=/i, "").trim();
  try {
    const a = Buffer.from(cleanProvided, "utf-8");
    const b = Buffer.from(expected, "utf-8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/v1/payments/webhook
 * Cryptographically signed provider webhook receiver for real online payment confirmation
 * (GCash, Maya, Card). Never trusts unsigned payloads.
 */
export async function POST(req: NextRequest) {
  const secret = getWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      {
        detail:
          "Live payment provider webhook verification is not configured on this portfolio demo deployment (PAYMENT_WEBHOOK_SECRET unset).",
      },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-payment-webhook-signature") || "";
  if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { detail: "Invalid or missing webhook HMAC signature." },
      { status: 401 }
    );
  }

  try {
    const body = JSON.parse(rawBody);
    const paymentId = String(body.payment_id || "").trim();
    const orderNumber = String(body.order_number || "").trim();
    const providerTxRef = String(body.provider_transaction_ref || "").trim();
    const eventType = String(body.event || "").toLowerCase().trim();

    if (!providerTxRef || providerTxRef.length < 6) {
      return NextResponse.json(
        { detail: "Verified provider_transaction_ref is required." },
        { status: 400 }
      );
    }

    let payment: any = null;
    if (paymentId.startsWith("rec")) {
      payment = await airtableGet("Payments", paymentId).catch(() => null);
    } else if (orderNumber) {
      const safeNum = escapeFormulaString(orderNumber);
      const matches = await airtableList("Payments", `{order_number} = '${safeNum}'`, true);
      payment =
        matches.find(
          (m: any) =>
            !isLoyaltyRecord(m) && !isRefundRecord(m) && !isCartRecord(m) && !isAuthCredentialRecord(m)
        ) || null;
    }

    if (
      !payment ||
      isLoyaltyRecord(payment) ||
      isRefundRecord(payment) ||
      isCartRecord(payment) ||
      isAuthCredentialRecord(payment)
    ) {
      return NextResponse.json({ detail: "Order payment record not found." }, { status: 404 });
    }

    const provider = normalizeProvider(payment.provider);
    if (!ONLINE_PAYMENT_PROVIDERS.has(provider)) {
      return NextResponse.json(
        { detail: "Provider webhooks apply only to online payment providers (gcash, maya, card)." },
        { status: 400 }
      );
    }

    const currentStatus = normalizePaymentStatus(payment.status);
    if (currentStatus !== "pending") {
      return NextResponse.json(
        { detail: `Payment is already in terminal/processed state '${currentStatus}'.` },
        { status: 409 }
      );
    }

    const parsedTx = parseTransactionField(payment.transaction_id, payment);
    const nowIso = new Date().toISOString();

    if (eventType === "payment.paid" || eventType === "payment.completed") {
      const verifiedRef = `WEBHOOK-VERIFIED-${provider.toUpperCase()}-${providerTxRef}`;
      const entry: PaymentAuditEntry = {
        at: nowIso,
        action: "webhook_verified",
        status: "completed",
        by: `${provider.toUpperCase()} Verified Webhook`,
        role: "gateway",
        ref: verifiedRef,
        reason: "Signature-verified payment gateway confirmation received.",
        amount: Number(payment.amount) || 0,
        is_simulated: false,
      };
      await airtableUpdate("Payments", payment.id, {
        status: "completed",
        transaction_id: encodeTransactionField(verifiedRef, [...parsedTx.auditEntries, entry]),
      });
      if (payment.order_id && String(payment.order_id).startsWith("rec")) {
        await airtableUpdate("Orders", String(payment.order_id), { payment_status: "paid" }).catch(() => {});
      }
      return NextResponse.json({ ok: true, payment_id: payment.id, status: "completed", verified_ref: verifiedRef });
    }

    if (eventType === "payment.failed") {
      const reason = String(body.failure_reason || "Declined by payment provider.").slice(0, 240);
      const entry: PaymentAuditEntry = {
        at: nowIso,
        action: "marked_failed",
        status: "failed",
        by: `${provider.toUpperCase()} Verified Webhook`,
        role: "gateway",
        ref: providerTxRef,
        reason,
        is_simulated: false,
      };
      await airtableUpdate("Payments", payment.id, {
        status: "failed",
        transaction_id: encodeTransactionField(parsedTx.primaryRef, [...parsedTx.auditEntries, entry]),
      });
      if (payment.order_id && String(payment.order_id).startsWith("rec")) {
        await airtableUpdate("Orders", String(payment.order_id), { payment_status: "failed" }).catch(() => {});
      }
      return NextResponse.json({ ok: true, payment_id: payment.id, status: "failed", reason });
    }

    return NextResponse.json({ detail: `Unsupported webhook event '${eventType}'.` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Webhook processing error" },
      { status: 500 }
    );
  }
}
