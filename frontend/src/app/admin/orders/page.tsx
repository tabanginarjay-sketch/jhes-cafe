"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, type OrderData } from "@/lib/api";
import type { NormalizedPayment } from "@/lib/paymentLedger";
import {
  PaymentDetailDrawer,
  formatMethodLabel,
  renderPaymentStatusBadge,
} from "@/components/admin/PaymentDetailDrawer";
import {
  RefreshCw,
  CreditCard,
  Banknote,
  ShieldCheck,
  Clock,
  FlaskConical,
  ChevronRight,
  X,
  PlusCircle,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [payments, setPayments] = useState<NormalizedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [creatingPaymentForOrderId, setCreatingPaymentForOrderId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<NormalizedPayment | null>(null);

  const loadOrdersAndPayments = useCallback(async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const [ordRes, payRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/payments?include_meta=true&page=1&page_size=100`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (ordRes.ok) {
        setOrders(await ordRes.json());
      } else {
        setFeedback("Failed to load live orders from Airtable.");
      }

      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(Array.isArray(payData?.payments) ? payData.payments : []);
      }
    } catch {
      setFeedback("Unable to connect to the live orders API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrdersAndPayments();
  }, [loadOrdersAndPayments]);

  // Map each order to its linked PHP order payment record
  const paymentByOrder = useMemo(() => {
    const byId = new Map<string, NormalizedPayment>();
    const byNum = new Map<string, NormalizedPayment>();
    for (const p of payments) {
      if (p.order_id) byId.set(p.order_id, p);
      if (p.order_number) byNum.set(p.order_number.toUpperCase().trim(), p);
    }
    return { byId, byNum };
  }, [payments]);

  const getLinkedPayment = (ord: OrderData): NormalizedPayment | null => {
    if (ord.id && paymentByOrder.byId.has(ord.id)) {
      return paymentByOrder.byId.get(ord.id) || null;
    }
    if (ord.order_number) {
      const key = ord.order_number.toUpperCase().trim();
      if (paymentByOrder.byNum.has(key)) {
        return paymentByOrder.byNum.get(key) || null;
      }
    }
    return null;
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      setUpdatingId(orderId);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.order_number === orderId ? { ...o, status: nextStatus } : o
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Failed to update order status.");
      }
    } catch {
      setFeedback("Error updating status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  /**
   * For older legacy orders submitted prior to automatic payment ledger creation,
   * allows cashier/manager to initialize a PENDING linked payment record and immediately inspect/verify it.
   */
  const handleInitLegacyPayment = async (ord: OrderData) => {
    try {
      setCreatingPaymentForOrderId(ord.id);
      setFeedback(null);
      const method = String(ord.payment_method || "cash").toLowerCase().trim();
      const safeProvider = ["cash", "cod", "gcash", "maya", "card"].includes(method) ? method : "cash";
      const res = await fetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: ord.id,
          order_number: ord.order_number,
          amount: Number(ord.total_amount) || 0,
          provider: safeProvider,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Failed to initialize pending payment record.");
        return;
      }
      const created = await res.json();
      await loadOrdersAndPayments();
      const detailRes = await fetch(`${API_BASE_URL}/payments/${created.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (detailRes.ok) {
        setSelectedPayment(await detailRes.json());
      }
    } catch {
      setFeedback("Unable to create pending payment record.");
    } finally {
      setCreatingPaymentForOrderId(null);
    }
  };

  const pendingPaymentsCount = useMemo(
    () => payments.filter((p) => p.status === "pending" || p.status === "cod_pending").length,
    [payments]
  );

  const filtered =
    filterStatus === "all"
      ? orders
      : orders.filter((o) => (o.status || "pending").trim().toLowerCase() === filterStatus.toLowerCase());

  const getStatusBadge = (status: string) => {
    switch ((status || "").trim().toLowerCase()) {
      case "ready":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "completed":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "confirmed":
        return "bg-sky-100 text-sky-900 border-sky-300";
      case "preparing":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "cancelled":
        return "bg-rose-100 text-rose-900 border-rose-300";
      default:
        return "bg-stone-100 text-stone-800 border-stone-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#315640] bg-[#173D2B]/10 px-2.5 py-1 rounded-full mb-2">
            <ShieldCheck className="w-3 h-3" />
            <span>Barista Queue + Inline Payment Verification</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Order Management Queue</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Live barista queue ({orders.length} submitted orders). Click any order&apos;s payment pill to confirm counter cash, verify demo payments, fail, or refund directly here.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {pendingPaymentsCount > 0 && (
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-semibold hover:bg-amber-200 transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-amber-800" />
              <span>{pendingPaymentsCount} Pending Payment{pendingPaymentsCount > 1 ? "s" : ""}</span>
            </Link>
          )}
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#573B2C] hover:text-[#173D2B] hover:bg-[#F5F0E7] transition-all"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#315640]" />
            <span>Full Payment Ledger</span>
          </Link>
          <button
            type="button"
            onClick={() => void loadOrdersAndPayments()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D2B] text-white text-xs font-semibold hover:bg-[#315640] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center justify-between gap-3">
          <span className="font-medium">{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {["all", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterStatus(tab)}
            className={`px-3.5 py-1.5 rounded-full capitalize transition-all cursor-pointer ${
              filterStatus === tab
                ? "bg-[#173D2B] text-white"
                : "bg-white text-[#573B2C] border border-[#E5DACB] hover:border-[#173D2B]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders Table Container */}
      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Order Code</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Dining</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Payment &amp; Verification</th>
                <th className="p-4">Prep Status</th>
                <th className="p-4 text-right">Barista Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#573B2C]">
                    {loading ? "Loading live orders from Airtable..." : "No orders found for this filter."}
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => {
                  const isUpdating = updatingId === ord.id;
                  const statusLower = (ord.status || "pending").trim().toLowerCase();
                  const linkedPay = getLinkedPayment(ord);
                  const payMethod = linkedPay?.provider || String(ord.payment_method || "cash").toLowerCase();
                  const isCreatingLegacy = creatingPaymentForOrderId === ord.id;

                  return (
                    <tr key={ord.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#173D2B]">
                        <div>{ord.order_number}</div>
                        {linkedPay && (
                          <div className="text-[10px] font-normal text-[#573B2C]/75">
                            {linkedPay.payment_ref}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">{ord.customer_name}</p>
                        {ord.customer_email && (
                          <p className="text-[10px] text-[#573B2C]/70 font-mono">{ord.customer_email}</p>
                        )}
                      </td>
                      <td className="p-4 font-medium">
                        <div>{ord.dining_option}</div>
                        {String(ord.dining_option || "").toLowerCase() === "delivery" && (
                          <Link
                            href="/admin/deliveries"
                            className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#173D2B]/10 text-[#173D2B] text-[10px] font-semibold hover:bg-[#173D2B] hover:text-white transition-colors"
                          >
                            <span>
                              {ord.delivery?.delivery_status
                                ? ord.delivery.delivery_status.replaceAll("_", " ")
                                : "Manage Dispatch"}
                            </span>
                          </Link>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold text-sm whitespace-nowrap">
                        ₱{Number(ord.total_amount || 0).toFixed(2)}
                      </td>

                      {/* Interactive Payment Cell — opens shared PaymentDetailDrawer */}
                      <td className="p-4">
                        {linkedPay ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPayment(linkedPay)}
                            className="group text-left p-2 -m-2 rounded-2xl hover:bg-[#F5F0E7] transition-all cursor-pointer space-y-1.5"
                            title="Inspect or verify this order's payment"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {renderPaymentStatusBadge(linkedPay.status)}
                              {linkedPay.is_simulated && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 text-[9px] font-bold uppercase">
                                  <FlaskConical className="w-2.5 h-2.5" />
                                  Demo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#173D2B]">
                              {payMethod === "cash" ? (
                                <Banknote className="w-3 h-3 text-[#315640]" />
                              ) : (
                                <CreditCard className="w-3 h-3 text-[#315640]" />
                              )}
                              <span>{formatMethodLabel(payMethod)}</span>
                              <span className="text-[#315640] group-hover:underline inline-flex items-center ml-1 text-[10px]">
                                {linkedPay.status === "pending" || linkedPay.status === "cod_pending"
                                  ? payMethod === "cod"
                                    ? "Verify COD"
                                    : payMethod === "cash"
                                      ? "Verify Cash"
                                      : "Verify"
                                  : "Inspect"}
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div className="space-y-1">
                            <span className="uppercase font-mono text-[10px] block font-semibold text-[#573B2C]">
                              {formatMethodLabel(payMethod)} · {String(ord.payment_status || "pending").trim()}
                            </span>
                            <button
                              type="button"
                              disabled={isCreatingLegacy}
                              onClick={() => void handleInitLegacyPayment(ord)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F0E7] hover:bg-[#173D2B] hover:text-white text-[#173D2B] text-[10px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>{isCreatingLegacy ? "Linking..." : "Open Payment Record"}</span>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                            statusLower
                          )}`}
                        >
                          {statusLower}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {statusLower === "pending" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleUpdateStatus(ord.id, "confirmed")}
                              className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 hover:bg-sky-800 hover:text-white font-medium text-[11px] transition-all cursor-pointer"
                            >
                              Confirm
                            </button>
                          )}
                          {(statusLower === "pending" || statusLower === "confirmed") && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleUpdateStatus(ord.id, "preparing")}
                              className="px-2.5 py-1 rounded-lg bg-[#F5F0E7] text-[#173D2B] hover:bg-[#173D2B] hover:text-white font-medium text-[11px] transition-all cursor-pointer"
                            >
                              Prepare
                            </button>
                          )}
                          {(statusLower === "pending" ||
                            statusLower === "confirmed" ||
                            statusLower === "preparing") && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleUpdateStatus(ord.id, "ready")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 hover:bg-emerald-800 hover:text-white font-semibold text-[11px] transition-all cursor-pointer"
                            >
                              Mark Ready
                            </button>
                          )}
                          {statusLower !== "completed" && statusLower !== "cancelled" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleUpdateStatus(ord.id, "completed")}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-800 hover:text-white font-medium text-[11px] transition-all cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          {statusLower !== "completed" && statusLower !== "cancelled" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void handleUpdateStatus(ord.id, "cancelled")}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-700 hover:text-white font-medium text-[11px] transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Payment Detail & Verification Drawer directly inside Live Orders */}
      <PaymentDetailDrawer
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onUpdated={async (updated, message) => {
          setSelectedPayment(updated);
          setSuccessMsg(message);
          await loadOrdersAndPayments();
        }}
      />
    </div>
  );
}
