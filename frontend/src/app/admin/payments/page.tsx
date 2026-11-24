"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/payments`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        setPayments(await res.json());
      } else {
        setFeedback("Failed to load payment records from Airtable.");
      }
    } catch {
      setFeedback("Unable to connect to payments API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, []);

  const handleUpdatePayment = async (paymentId: string, status: "completed" | "failed" | "refunded") => {
    try {
      setUpdatingId(paymentId);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPayments((prev) => prev.map((p) => (p.id === paymentId ? updated : p)));
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Failed to update payment status.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusBadge = (rawStatus?: string) => {
    const s = String(rawStatus || "pending").toLowerCase();
    if (s === "completed" || s === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          <span>{s}</span>
        </span>
      );
    }
    if (s === "failed" || s === "refunded") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold uppercase text-[10px]">
          <XCircle className="w-3 h-3 text-rose-700" />
          <span>{s}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold uppercase text-[10px]">
        <Clock className="w-3 h-3 text-amber-700" />
        <span>{s}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Payment Transactions</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Live Airtable Payments ledger ({payments.length} records). Payments remain pending until confirmed here.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPayments()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Transactions</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {feedback}
        </div>
      )}

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Payment Ref</th>
                <th className="p-4">Order Code</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Recorded</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#573B2C]">
                    {loading ? "Loading payments from Airtable..." : "No payment transactions recorded yet."}
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const statusLower = String(p.status || "pending").toLowerCase();
                  const isUpdating = updatingId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#173D2B]">
                        {p.payment_ref || p.id}
                      </td>
                      <td className="p-4 font-mono">{p.order_number || p.order_id || "—"}</td>
                      <td className="p-4 font-mono font-bold text-sm">
                        ₱{Number(p.amount || 0).toFixed(2)}
                      </td>
                      <td className="p-4 font-semibold uppercase">{p.provider || "—"}</td>
                      <td className="p-4 text-[#573B2C]">
                        {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-4">{renderStatusBadge(p.status)}</td>
                      <td className="p-4 text-right">
                        {statusLower === "pending" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleUpdatePayment(p.id, "completed")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 hover:bg-emerald-800 hover:text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Confirm Paid
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleUpdatePayment(p.id, "failed")}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-700 hover:text-white font-medium text-[11px] cursor-pointer"
                            >
                              Mark Failed
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-[#573B2C]">
                            {p.transaction_id || "Verified"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
