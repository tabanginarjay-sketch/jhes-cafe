"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, type OrderData } from "@/lib/api";
import {
  ShoppingBag,
  CheckCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Coffee,
  CheckCheck,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/orders`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.warn("Using sample orders fallback", err);
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
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        // Optimistic update
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId || o.order_number === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const displayOrders = orders.length > 0 ? orders : [
    { id: "demo-1", order_number: "BNC-001001", customer_name: "Juan Ramos", customer_phone: "+639171234567", dining_option: "Dine-in", total_amount: 440, payment_method: "gcash", payment_status: "paid", status: "preparing", created_at: "2026-11-23T08:30:00Z" },
    { id: "demo-2", order_number: "BNC-001002", customer_name: "Patricia Valdez", customer_phone: "+639189876543", dining_option: "Takeaway", total_amount: 190, payment_method: "cash", payment_status: "pending", status: "ready", created_at: "2026-11-23T08:45:00Z" },
    { id: "demo-3", order_number: "BNC-001003", customer_name: "Maria Santos", customer_phone: "+639178889900", dining_option: "Dine-in", total_amount: 510, payment_method: "maya", payment_status: "paid", status: "completed", created_at: "2026-11-23T09:00:00Z" },
  ];

  const filtered = filterStatus === "all"
    ? displayOrders
    : displayOrders.filter((o) => o.status.toLowerCase() === filterStatus.toLowerCase());

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "completed":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "preparing":
        return "bg-amber-100 text-amber-900 border-amber-300";
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
            Live barista queue with real-time status progression linked to Airtable Orders table.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {["all", "pending", "preparing", "ready", "completed"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterStatus(tab)}
            className={`px-3.5 py-1.5 rounded-full capitalize transition-all cursor-pointer ${filterStatus === tab
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
                <th className="p-4 text-right">Quick Barista Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {filtered.map((ord) => {
                const isUpdating = updatingId === ord.id;
                return (
                  <tr key={ord.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#173D2B]">
                      {ord.order_number}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{ord.customer_name}</p>
                      {ord.customer_phone && (
                        <p className="text-[10px] text-[#573B2C]/70 font-mono">{ord.customer_phone}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{ord.dining_option}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-sm">
                      ₱{ord.total_amount}
                    </td>
                    <td className="p-4">
                      <span className="uppercase font-mono text-[10px] block font-semibold">
                        {ord.payment_method}
                      </span>
                      <span className={`text-[9px] uppercase font-bold ${ord.payment_status === "paid" ? "text-emerald-700" : "text-amber-700"}`}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(ord.status)}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {ord.status !== "preparing" && ord.status !== "ready" && ord.status !== "completed" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(ord.id, "preparing")}
                            className="px-2.5 py-1 rounded-lg bg-[#F5F0E7] text-[#173D2B] hover:bg-[#173D2B] hover:text-white font-medium text-[11px] transition-all cursor-pointer"
                          >
                            Brew
                          </button>
                        )}
                        {ord.status !== "ready" && ord.status !== "completed" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(ord.id, "ready")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 hover:bg-emerald-800 hover:text-white font-semibold text-[11px] transition-all cursor-pointer"
                          >
                            Mark Ready
                          </button>
                        )}
                        {ord.status !== "completed" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(ord.id, "completed")}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-800 hover:text-white font-medium text-[11px] transition-all cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
