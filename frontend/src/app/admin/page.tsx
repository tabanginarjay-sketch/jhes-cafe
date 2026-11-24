"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import {
  ShoppingBag,
  Package,
  Boxes,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Coffee,
  CheckCircle2,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState<{ total_collected: number; pending_amount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordRes, prodRes, invRes, payRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_BASE_URL}/catalog/products`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_BASE_URL}/inventory`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_BASE_URL}/payments?include_meta=true`, { credentials: "include", cache: "no-store" }),
      ]);

      if (ordRes.ok) setOrders(await ordRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData?.stats) setPaymentStats(payData.stats);
      }

      if (!ordRes.ok || !prodRes.ok || !invRes.ok) {
        setError("One or more Airtable data feeds returned an error. Click Refresh to retry.");
      }
    } catch {
      setError("Failed to connect to live Airtable data feeds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const paidSales = paymentStats
    ? paymentStats.total_collected
    : orders
        .filter((o) => String(o.payment_status || "").trim().toLowerCase() === "paid")
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const orderCount = orders.length;
  const activeProducts = products.filter((p) => p.is_available !== false).length;
  const lowStockItems = inventory.filter(
    (i) => (Number(i.stock_quantity) || 0) <= (Number(i.reorder_threshold) || 5)
  );

  const stats = [
    {
      label: "Total Recorded Orders",
      val: `${orderCount}`,
      delta: `${orders.filter((o) => ["pending", "preparing", "ready"].includes(String(o.status || "").toLowerCase())).length} active in queue`,
      icon: ShoppingBag,
    },
    {
      label: "Gross Order Value",
      val: `₱${totalSales.toLocaleString()}`,
      delta: `₱${paidSales.toLocaleString()} confirmed paid`,
      icon: TrendingUp,
    },
    {
      label: "Catalog Products",
      val: `${activeProducts} / ${products.length}`,
      delta: `${products.length - activeProducts} marked unavailable`,
      icon: Package,
    },
    {
      label: "Low Stock Alerts",
      val: `${lowStockItems.length}`,
      delta: lowStockItems.length > 0 ? "Action needed" : "All stock above threshold",
      icon: Boxes,
    },
  ];

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
            Store Overview &amp; Live Operations
          </h1>
          <p className="text-xs text-[#573B2C] mt-1">
            100% live metrics calculated directly from Airtable records (no placeholder statistics).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Store</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
          {error}
        </div>
      )}

      {/* Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                  {s.label}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-bold text-[#173D2B]">
                {loading ? "—" : s.val}
              </p>
              <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                {loading ? "Syncing..." : s.delta}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live Queue & Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-[#173D2B]" />
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">Recent Airtable Orders</h3>
            </div>
            <Link href="/admin/orders" className="text-xs font-semibold text-[#173D2B] hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-[#573B2C] py-6 text-center">
              {loading ? "Loading live orders..." : "No orders recorded in Airtable yet."}
            </p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {recentOrders.map((o) => (
                <div key={o.id} className="p-3.5 rounded-2xl bg-[#F5F0E7] flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#173D2B]">
                      {o.order_number} — {o.customer_name}
                    </p>
                    <p className="text-[10px] text-[#573B2C]">
                      ₱{Number(o.total_amount || 0).toFixed(2)} · {o.dining_option} · Payment: {o.payment_status || "pending"}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    {o.status || "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">Inventory Stock Warnings</h3>
            </div>
            <Link href="/admin/inventory" className="text-xs font-semibold text-[#173D2B] hover:underline flex items-center gap-1">
              <span>Manage Stock</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" />
              <p className="text-xs font-semibold text-emerald-900">
                {loading ? "Checking stock levels..." : "All inventory items are above reorder thresholds."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {lowStockItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-[#F5F0E7] flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#173D2B]">{item.item_name}</p>
                    <p className="text-[10px] text-[#573B2C]">
                      Current: {item.stock_quantity} {item.unit} · Threshold: {item.reorder_threshold} {item.unit}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-900 border border-rose-300">
                    Restock Alert
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
