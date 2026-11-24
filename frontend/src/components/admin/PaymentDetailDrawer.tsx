"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import type { NormalizedPayment } from "@/lib/paymentLedger";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Calendar,
  ShieldAlert,
  Lock,
  X,
  AlertTriangle,
  FileText,
  FlaskConical,
  Banknote,
  Receipt,
  History,
} from "lucide-react";

export function formatPhp(val: number): string {
  return `₱${Number(val || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPaymentDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMethodLabel(provider: string): string {
  switch (String(provider || "").toLowerCase()) {
    case "gcash":
      return "GCash";
    case "maya":
      return "Maya";
    case "card":
      return "Card";
    case "cash":
      return "Counter Cash";
    default:
      return String(provider || "—").toUpperCase();
  }
}

export function renderPaymentStatusBadge(status: NormalizedPayment["status"]) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px] tracking-wider">
        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
        <span>Completed</span>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-bold uppercase text-[10px] tracking-wider">
        <XCircle className="w-3 h-3 text-rose-700" />
        <span>Failed</span>
      </span>
    );
  }
  if (status === "refunded") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-900 font-bold uppercase text-[10px] tracking-wider">
        <RotateCcw className="w-3 h-3 text-slate-700" />
        <span>Refunded</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold uppercase text-[10px] tracking-wider">
      <Clock className="w-3 h-3 text-amber-700" />
      <span>Pending</span>
    </span>
  );
}

interface PaymentDetailDrawerProps {
  payment: NormalizedPayment | null;
  onClose: () => void;
  onUpdated?: (updated: NormalizedPayment, message: string) => void | Promise<void>;
}

export function PaymentDetailDrawer({
  payment,
  onClose,
  onUpdated,
}: PaymentDetailDrawerProps) {
  const [livePayment, setLivePayment] = useState<NormalizedPayment | null>(payment);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const [activeActionPanel, setActiveActionPanel] = useState<
    "none" | "confirm_cash" | "verify_demo" | "mark_failed" | "refund"
  >("none");
  const [cashReceiptRef, setCashReceiptRef] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [demoRef, setDemoRef] = useState("");
  const [demoAck, setDemoAck] = useState(false);
  const [demoNote, setDemoNote] = useState("");
  const [failReason, setFailReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const resetForms = (target?: NormalizedPayment | null) => {
    setActiveActionPanel("none");
    setModalError(null);
    setModalSuccess(null);
    setCashReceiptRef("");
    setCashNote("");
    setDemoRef("");
    setDemoAck(false);
    setDemoNote("");
    setFailReason("");
    setRefundAmount(target ? String(target.amount) : "");
    setRefundReason("");
  };

  useEffect(() => {
    setLivePayment(payment);
    resetForms(payment);
    if (!payment) return;

    let cancelled = false;
    setDetailLoading(true);
    fetch(`${API_BASE_URL}/payments/${payment.id}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh: NormalizedPayment | null) => {
        if (!cancelled && fresh) {
          setLivePayment(fresh);
          setRefundAmount(String(fresh.amount));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [payment]);

  if (!livePayment) return null;

  const submitPaymentAction = async (payload: Record<string, unknown>, successMsg: string) => {
    try {
      setSubmittingAction(true);
      setModalError(null);
      setModalSuccess(null);

      const res = await fetch(`${API_BASE_URL}/payments/${livePayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModalError(data.detail || "Payment action rejected by server security checks.");
        return;
      }

      setLivePayment(data);
      resetForms(data);
      setModalSuccess(successMsg);
      if (onUpdated) {
        await onUpdated(data, successMsg);
      }
    } catch {
      setModalError("Network error while communicating with Payments API.");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F2A1D]/55 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Transaction Details"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFCF7] h-full overflow-y-auto shadow-2xl border-l border-[#E5DACB] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-[#173D2B] text-white px-6 py-5 flex items-start justify-between gap-4 border-b border-[#0F2A1D]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9AE8B]">
                Payment Audit Record
              </span>
              {livePayment.is_simulated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-300/40 text-purple-100 text-[10px] font-semibold">
                  <FlaskConical className="w-3 h-3" />
                  Simulated Portfolio Demo
                </span>
              )}
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#FFFCF7]">
              {livePayment.payment_ref}
            </h2>
            <p className="text-[11px] font-mono text-[#DECDB8]">
              Record ID: {livePayment.id} · Order: {livePayment.order_number}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment details"
            className="p-2 rounded-full bg-[#315640] hover:bg-[#3e6d51] text-[#FFFCF7] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {detailLoading && (
            <div className="text-xs font-mono text-[#573B2C] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing live Airtable record...</span>
            </div>
          )}

          {modalError && (
            <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
              <span>{modalError}</span>
            </div>
          )}
          {modalSuccess && (
            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
              <span className="font-medium">{modalSuccess}</span>
            </div>
          )}

          {/* Primary Financial & Status Summary Card */}
          <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACB] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">
                  Payment Amount ({livePayment.currency})
                </span>
                <p className="font-serif text-3xl font-bold text-[#173D2B] mt-0.5">
                  {formatPhp(livePayment.amount)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {renderPaymentStatusBadge(livePayment.status)}
                <span className="text-[10px] font-mono text-[#573B2C]">
                  Method: {formatMethodLabel(livePayment.provider)}
                </span>
              </div>
            </div>

            {/* Structured Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                  Payment ID
                </span>
                <span className="font-mono text-[#173D2B] font-semibold break-all">
                  {livePayment.id}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                  Order Reference
                </span>
                <div className="font-mono text-[#173D2B] font-semibold">
                  {livePayment.order_number}
                </div>
                <div className="text-[10px] font-mono text-[#573B2C]/75">
                  Order ID: {livePayment.order_id || "—"}
                  {livePayment.order_status ? ` · Prep: ${livePayment.order_status}` : ""}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                  Customer
                </span>
                <div className="font-semibold text-[#173D2B]">
                  {livePayment.customer_name}
                </div>
                <div className="text-[11px] font-mono text-[#573B2C]/80">
                  {livePayment.customer_email || "No email linked"}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                  Currency &amp; Verification Channel
                </span>
                <div className="font-semibold text-[#173D2B]">
                  PHP (Philippine Peso)
                </div>
                <div className="text-[11px] text-[#573B2C]">
                  {livePayment.verification_mode === "cashier_counter"
                    ? "Authorized Counter Cashier"
                    : livePayment.verification_mode === "provider_webhook"
                      ? "Signed Provider Webhook"
                      : livePayment.verification_mode === "demo_simulated"
                        ? "Portfolio Demo Simulation (Not Real Funds)"
                        : "Awaiting Verification"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                  Provider Transaction Reference
                </span>
                <div className="mt-1 px-3 py-2 rounded-xl bg-[#F5F0E7] font-mono text-[11px] text-[#173D2B] break-all">
                  {livePayment.provider_transaction_ref || "Not yet issued"}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                  Created Date
                </span>
                <span className="text-[#173D2B] font-medium inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#573B2C]" />
                  {formatPaymentDate(livePayment.created_at)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                  Last Updated Date
                </span>
                <span className="text-[#173D2B] font-medium inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#573B2C]" />
                  {formatPaymentDate(livePayment.updated_at)}
                </span>
              </div>
            </div>

            {/* Immutability Policy Notice */}
            <div className="pt-3 border-t border-[#E5DACB] flex items-center gap-2 text-[11px] text-[#573B2C]">
              <Lock className="w-3.5 h-3.5 text-[#173D2B] shrink-0" />
              <span>
                Amounts, payment methods, and references are locked against arbitrary edits. Payment status is strictly separated from order preparation status.
              </span>
            </div>
          </div>

          {/* FAILED card */}
          {livePayment.status === "failed" && (
            <div className="p-5 rounded-3xl border border-rose-200 bg-rose-50/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-900">
                <ShieldAlert className="w-4 h-4 text-rose-700" />
                <span>Payment Failure Reason</span>
              </div>
              <p className="text-xs text-rose-900 leading-relaxed">
                {livePayment.failure_reason || "Payment declined or failed to verify."}
              </p>
              <p className="text-[11px] text-rose-800/80">
                This failed payment is excluded from collected revenue and preserved as an immutable audit record.
              </p>
            </div>
          )}

          {/* REFUNDED card */}
          {livePayment.status === "refunded" && (
            <div className="p-5 rounded-3xl border border-slate-300 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
                  <RotateCcw className="w-4 h-4 text-slate-700" />
                  <span>Linked Refund Record</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {livePayment.refund?.refund_ref || "Refund Linked"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Original Transaction
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {livePayment.payment_ref} ({formatPhp(livePayment.amount)})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Refund Amount
                  </span>
                  <span className="font-mono font-bold text-rose-800">
                    {formatPhp(livePayment.refund?.amount ?? livePayment.amount)} PHP
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Refund Record ID
                  </span>
                  <span className="font-mono text-slate-800">
                    {livePayment.refund?.id || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Processed By &amp; Date
                  </span>
                  <span className="text-slate-800">
                    {livePayment.refund?.refunded_by || "Administrator"} ·{" "}
                    {formatPaymentDate(livePayment.refund?.refunded_at || livePayment.updated_at)}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Refund Reason
                  </span>
                  <p className="text-slate-900 mt-0.5">
                    {livePayment.refund?.reason || "Audited refund issued."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETED evidence card */}
          {livePayment.status === "completed" && (
            <div className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>Verification Evidence</span>
              </div>
              <p className="text-xs text-emerald-950 font-mono break-all">
                Ref: {livePayment.provider_transaction_ref}
              </p>
              {livePayment.is_simulated ? (
                <p className="text-[11px] text-purple-900 bg-purple-100/80 border border-purple-200 rounded-xl px-3 py-2">
                  <strong>Portfolio Demo Simulation:</strong> Verified using the controlled demo workflow — does not represent real settled gateway funds.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-900/90">
                  Verified through{" "}
                  {livePayment.verification_mode === "provider_webhook"
                    ? "cryptographically signed provider webhook"
                    : "authorized counter cashier confirmation"}
                  .
                </p>
              )}
            </div>
          )}

          {/* PENDING actions */}
          {livePayment.status === "pending" && (
            <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                  Authorized Verification Actions
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Pending Review
                </span>
              </div>

              {livePayment.provider !== "cash" && (
                <div className="p-3.5 rounded-2xl bg-[#F5F0E7] border border-[#E5DACB] text-[11px] text-[#573B2C] space-y-1">
                  <p className="font-bold text-[#173D2B]">
                    Online Payment Security ({formatMethodLabel(livePayment.provider)}):
                  </p>
                  <p>
                    Generic one-click confirmation is disabled. Real online payments require a signed provider webhook (<code className="font-mono">/api/v1/payments/webhook</code>). For portfolio demos, use the clearly labeled Controlled Demo Verification below.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {livePayment.provider === "cash" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveActionPanel(
                        activeActionPanel === "confirm_cash" ? "none" : "confirm_cash"
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeActionPanel === "confirm_cash"
                        ? "bg-[#173D2B] text-white"
                        : "bg-emerald-100 text-emerald-950 hover:bg-emerald-800 hover:text-white"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Confirm Counter Cash Received</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveActionPanel(
                        activeActionPanel === "verify_demo" ? "none" : "verify_demo"
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeActionPanel === "verify_demo"
                        ? "bg-purple-900 text-white"
                        : "bg-purple-100 text-purple-950 hover:bg-purple-800 hover:text-white"
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Controlled Demo Verification</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setActiveActionPanel(
                      activeActionPanel === "mark_failed" ? "none" : "mark_failed"
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeActionPanel === "mark_failed"
                      ? "bg-rose-800 text-white"
                      : "bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-700 hover:text-white"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Mark Payment Failed</span>
                </button>
              </div>

              {activeActionPanel === "confirm_cash" && livePayment.provider === "cash" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitPaymentAction(
                      {
                        action: "confirm_cash",
                        receipt_reference: cashReceiptRef.trim(),
                        note: cashNote.trim() || "Counter cash received and verified by cashier.",
                      },
                      `Counter cash payment ${livePayment.payment_ref} confirmed with cashier audit trail.`
                    );
                  }}
                  className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3"
                >
                  <p className="text-xs font-bold text-emerald-950">
                    Authorized Cashier Confirmation ({formatPhp(livePayment.amount)})
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-emerald-950 block">
                      POS / Counter Receipt Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={cashReceiptRef}
                      onChange={(e) => setCashReceiptRef(e.target.value)}
                      placeholder="e.g. RCPT-0412"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs text-[#173D2B] font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-emerald-950 block">
                      Cashier Verification Note
                    </label>
                    <input
                      type="text"
                      value={cashNote}
                      onChange={(e) => setCashNote(e.target.value)}
                      placeholder="Exact cash received at front register"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs text-[#173D2B]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAction ? "Recording Verification..." : "Record Cashier Cash Confirmation"}
                  </button>
                </form>
              )}

              {activeActionPanel === "verify_demo" && livePayment.provider !== "cash" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitPaymentAction(
                      {
                        action: "verify_demo",
                        verification_reference: demoRef.trim(),
                        demo_acknowledgement: demoAck,
                        note:
                          demoNote.trim() ||
                          "Controlled portfolio demo verification (simulated — no real funds settled).",
                      },
                      `Simulated demo verification recorded for ${livePayment.payment_ref}.`
                    );
                  }}
                  className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3"
                >
                  <p className="text-xs font-bold text-purple-950">
                    Controlled Portfolio Demo Verification ({formatMethodLabel(livePayment.provider)})
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-purple-950 block">
                      Simulated Provider Reference (Required, min 4 chars)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={4}
                      value={demoRef}
                      onChange={(e) => setDemoRef(e.target.value)}
                      placeholder="e.g. SIM-GCASH-9921"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs text-[#173D2B] font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-purple-950 block">
                      Audit Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={demoNote}
                      onChange={(e) => setDemoNote(e.target.value)}
                      placeholder="Simulated online checkout walkthrough"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs text-[#173D2B]"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-purple-950 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={demoAck}
                      onChange={(e) => setDemoAck(e.target.checked)}
                      className="mt-0.5 accent-purple-800"
                    />
                    <span>
                      I acknowledge this is a <strong>simulated portfolio demo payment</strong> and will be visibly labeled as demo data, not actual settled gateway funds.
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={submittingAction || !demoAck || demoRef.trim().length < 4}
                    className="px-5 py-2.5 rounded-full bg-purple-900 hover:bg-purple-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAction ? "Verifying Simulation..." : "Complete Controlled Demo Verification"}
                  </button>
                </form>
              )}

              {activeActionPanel === "mark_failed" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitPaymentAction(
                      {
                        action: "mark_failed",
                        reason: failReason.trim(),
                      },
                      `Payment ${livePayment.payment_ref} marked as failed and excluded from revenue.`
                    );
                  }}
                  className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3"
                >
                  <p className="text-xs font-bold text-rose-950">
                    Mark Payment Failed (Mandatory Audit Reason)
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-rose-950 block">
                      Failure Reason (Required)
                    </label>
                    <textarea
                      required
                      minLength={3}
                      rows={2}
                      value={failReason}
                      onChange={(e) => setFailReason(e.target.value)}
                      placeholder="e.g. Customer canceled at counter / GCash transfer expired / insufficient funds"
                      className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs text-[#173D2B]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingAction || failReason.trim().length < 3}
                    className="px-5 py-2.5 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAction ? "Updating Status..." : "Confirm Mark as Failed"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* COMPLETED refund workflow */}
          {livePayment.status === "completed" && (
            <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                  Auditable Refund Workflow
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setActiveActionPanel(activeActionPanel === "refund" ? "none" : "refund")
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-900 text-xs font-semibold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{activeActionPanel === "refund" ? "Cancel Refund" : "Initiate Refund"}</span>
                </button>
              </div>

              {activeActionPanel !== "refund" ? (
                <p className="text-xs text-[#573B2C]">
                  Completed payments cannot be edited directly. Initiate an auditable refund to create a linked <code className="font-mono">REF-*</code> record while preserving the original payment intact.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitPaymentAction(
                      {
                        action: "refund",
                        refund_amount: Number(refundAmount),
                        reason: refundReason.trim(),
                      },
                      `Refund issued and linked to original payment ${livePayment.payment_ref}.`
                    );
                  }}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-900 block">
                        Refund Amount (PHP, max {formatPhp(livePayment.amount)})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={livePayment.amount}
                        required
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-[#173D2B] font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-900 block">
                        Original Payment Protected
                      </label>
                      <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-700">
                        {livePayment.payment_ref} · {formatPhp(livePayment.amount)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-900 block">
                      Refund Reason (Required for Audit Trail)
                    </label>
                    <textarea
                      required
                      minLength={3}
                      rows={2}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="e.g. Wrong drink prepared / customer requested cancellation before pickup"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-[#173D2B]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingAction || refundReason.trim().length < 3}
                    className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAction ? "Creating Linked Refund..." : "Issue Linked Refund Record"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Verification History */}
          <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#173D2B]" />
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                Payment Verification History
              </h3>
            </div>

            {livePayment.verification_history.length === 0 ? (
              <p className="text-xs text-[#573B2C]">No verification events logged yet.</p>
            ) : (
              <ol className="relative border-l-2 border-[#E5DACB] ml-2 space-y-4">
                {livePayment.verification_history.map((entry, idx) => (
                  <li key={`${entry.at}-${idx}`} className="ml-5 space-y-1">
                    <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-[#173D2B] border-2 border-[#FFFCF7] flex items-center justify-center">
                      <FileText className="w-2 h-2 text-[#C9AE8B]" />
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#173D2B] capitalize">
                        {entry.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] font-mono text-[#573B2C]">
                        {formatPaymentDate(entry.at)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#573B2C]">
                      Actor: <span className="font-semibold text-[#173D2B]">{entry.by}</span>
                      {entry.role ? ` (${entry.role})` : ""}
                      {entry.is_simulated ? " · [Simulated Demo]" : ""}
                    </div>
                    {entry.ref && (
                      <div className="text-[10px] font-mono text-[#315640] break-all">
                        Ref: {entry.ref}
                      </div>
                    )}
                    {entry.reason && (
                      <p className="text-[11px] text-[#573B2C] bg-[#F5F0E7]/70 rounded-lg px-2.5 py-1.5">
                        {entry.reason}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
