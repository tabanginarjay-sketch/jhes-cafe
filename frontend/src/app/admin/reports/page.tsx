"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, type OrderData } from "@/lib/api";
import { RefreshCw } from "lucide-react";

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState<{
    total_collected: number;
    pending_amount: number;
    refunded_amount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordRes, itemsRes, payRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_BASE_URL}/orders/items`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_BASE_URL}/payments?include_meta=true`, { credentials: "include", cache: "no-store" }),
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (itemsRes.ok) setOrderItems(await itemsRes.json());
      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData?.stats) setPaymentStats(payData.stats);
      }
      if (!ordRes.ok) setError("Could not fetch Airtable orders for reporting.");
    } catch {
      setError("Unable to reach sales analytics API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const validOrders = useMemo(
    () =>
      orders.filter((o) => {
        const st = String(o.status || "").trim().toLowerCase();
        return st !== "cancelled" && st !== "cart" && st !== "cart_cleared";
      }),
    [orders]
  );

  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const paidRevenue = paymentStats
    ? paymentStats.total_collected
    : validOrders
        .filter((o) => String(o.payment_status || "").trim().toLowerCase() === "paid")
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const pendingRevenue = paymentStats
    ? paymentStats.pending_amount
    : Math.max(0, totalRevenue - paidRevenue);
  const totalCount = validOrders.length;
  const avgTicket = totalCount > 0 ? Math.round((totalRevenue / totalCount) * 100) / 100 : 0;

  // Real Dining distribution (Dine-in, Takeaway, Delivery)
  const dineInCount = validOrders.filter((o) =>
    String(o.dining_option || "").toLowerCase().includes("dine")
  ).length;
  const takeawayCount = validOrders.filter((o) =>
    String(o.dining_option || "").toLowerCase().includes("take")
  ).length;
  const deliveryCount = validOrders.filter((o) =>
    String(o.dining_option || "").toLowerCase().includes("deliver")
  ).length;
  const diningDenom = dineInCount + takeawayCount + deliveryCount;
  const dineInPct = diningDenom > 0 ? Math.round((dineInCount / diningDenom) * 100) : 0;
  const takeawayPct = diningDenom > 0 ? Math.round((takeawayCount / diningDenom) * 100) : 0;
  const deliveryPct = diningDenom > 0 ? Math.max(0, 100 - dineInPct - takeawayPct) : 0;

  // Real Product Sales Aggregation from Airtable OrderItems
  const productRanking = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const it of orderItems) {
      const name = String(it.product_name || "").trim();
      if (!name) continue;
      const qty = Number(it.quantity) || 1;
      const sub = Number(it.subtotal ?? (Number(it.unit_price) || 0) * qty);
      const prev = map.get(name) || { name, quantity: 0, revenue: 0 };
      prev.quantity += qty;
      prev.revenue += sub;
      map.set(name, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  }, [orderItems]);

  const topProduct = productRanking[0] || null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Sales &amp; Analytics Reports</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Calculated 100% from live Airtable Orders and OrderItems (excluding cancelled orders).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {error}
        </div>
      )}

      {/* Real Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Gross Order Value
          </span>
          <p className="font-serif text-3xl font-bold text-[#173D2B]">
            ₱{totalRevenue.toLocaleString()}
          </p>
          <span className="text-xs text-[#573B2C]">Across {totalCount} valid orders</span>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Confirmed Paid Revenue
          </span>
          <p className="font-serif text-3xl font-bold text-emerald-900">
            ₱{paidRevenue.toLocaleString()}
          </p>
          <span className="text-xs text-amber-800 font-medium">
            ₱{pendingRevenue.toLocaleString()} awaiting confirmation
          </span>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Average Order Value
          </span>
          <p className="font-serif text-3xl font-bold text-[#173D2B]">
            ₱{avgTicket.toFixed(2)}
          </p>
          <span className="text-xs text-[#573B2C]">Live mean ticket size</span>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Top Ordered Item
          </span>
          <p className="font-serif text-xl font-bold text-[#173D2B] leading-snug">
            {topProduct ? topProduct.name : "No item sales yet"}
          </p>
          <span className="text-xs text-[#573B2C]">
            {topProduct
              ? `${topProduct.quantity} units sold · ₱${topProduct.revenue.toLocaleString()}`
              : "Computed from OrderItems"}
          </span>
        </div>
      </div>

      {/* Real Product Breakdown Table */}
      <div className="p-8 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#173D2B]">Item Sales Breakdown</h3>
          <p className="text-xs text-[#573B2C] mt-1">
            Aggregated directly from Airtable <code className="font-mono">OrderItems</code> ({orderItems.length} line items).
          </p>
        </div>

        {productRanking.length === 0 ? (
          <p className="text-xs text-[#573B2C] py-6 text-center">No line items recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3 rounded-l-xl">Product Name</th>
                  <th className="p-3 text-right">Units Sold</th>
                  <th className="p-3 text-right rounded-r-xl">Line Item Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
                {productRanking.map((row) => (
                  <tr key={row.name}>
                    <td className="p-3 font-semibold">{row.name}</td>
                    <td className="p-3 text-right font-mono">{row.quantity}</td>
                    <td className="p-3 text-right font-mono font-bold">₱{row.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real Dining Distribution */}
      <div className="p-8 rounded-3xl border border-[#E5DACB] bg-white space-y-6 shadow-2xs">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#173D2B]">Dining Channel Distribution</h3>
          <p className="text-xs text-[#573B2C] mt-1">
            Actual split of Dine-In, Takeaway, and Delivery orders in Airtable.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#173D2B]">
              <span>Dine-In ({dineInCount} orders)</span>
              <span>{dineInPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#F5F0E7] overflow-hidden">
              <div className="h-full bg-[#173D2B] rounded-full transition-all" style={{ width: `${dineInPct}%` }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#173D2B]">
              <span>Takeaway / Counter Pickup ({takeawayCount} orders)</span>
              <span>{takeawayPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#F5F0E7] overflow-hidden">
              <div className="h-full bg-[#C9AE8B] rounded-full transition-all" style={{ width: `${takeawayPct}%` }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[#173D2B]">
              <span>Delivery ({deliveryCount} orders)</span>
              <span>{deliveryPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#F5F0E7] overflow-hidden">
              <div className="h-full bg-[#315640] rounded-full transition-all" style={{ width: `${deliveryPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
