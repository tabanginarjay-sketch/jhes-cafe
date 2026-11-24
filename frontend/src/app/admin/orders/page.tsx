"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, type OrderData } from "@/lib/api";
import { RefreshCw } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/orders`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        setOrders(await res.json());
      } else {
        setFeedback("Failed to load live orders from Airtable.");
      }
    } catch {
      setFeedback("Unable to connect to the orders API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

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

  const filtered =
    filterStatus === "all"
      ? orders
      : orders.filter((o) => (o.status || "pending").toLowerCase() === filterStatus.toLowerCase());

  const getStatusBadge = (status: string) => {
    switch ((status || "").toLowerCase()) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Order Management Queue</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Live barista queue persisted directly to Airtable Orders ({orders.length} records).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {feedback}
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
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
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
                  const statusLower = (ord.status || "pending").toLowerCase();
                  return (
                    <tr key={ord.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#173D2B]">
                        {ord.order_number}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">{ord.customer_name}</p>
                        {ord.customer_email && (
                          <p className="text-[10px] text-[#573B2C]/70 font-mono">{ord.customer_email}</p>
                        )}
                      </td>
                      <td className="p-4 font-medium">{ord.dining_option}</td>
                      <td className="p-4 font-mono font-bold text-sm">
                        ₱{Number(ord.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className="uppercase font-mono text-[10px] block font-semibold">
                          {ord.payment_method}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold ${
                            ord.payment_status === "paid"
                              ? "text-emerald-700"
                              : ord.payment_status === "failed"
                                ? "text-rose-700"
                                : "text-amber-700"
                          }`}
                        >
                          {ord.payment_status || "pending"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(statusLower)}`}>
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
                          {(statusLower === "pending" || statusLower === "confirmed" || statusLower === "preparing") && (
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
    </div>
  );
}
