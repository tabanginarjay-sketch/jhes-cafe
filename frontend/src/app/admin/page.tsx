import Link from "next/link";
import { ShoppingBag, Package, Boxes, Users, ArrowUpRight, TrendingUp } from "lucide-react";

export default function AdminDashboardPage() {
  const stats = [
    { label: "Today's Orders", val: "48 cups", delta: "+18%", icon: ShoppingBag },
    { label: "Gross Coffee Sales", val: "₱14,820", delta: "+24%", icon: TrendingUp },
    { label: "Active Roasts", val: "6 blends", delta: "100% available", icon: Package },
    { label: "Low Stock Alerts", val: "2 items", delta: "Action needed", icon: Boxes },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
          Store Overview &amp; Barista Control
        </h1>
        <p className="text-xs text-[#573B2C] mt-1">
          Connected to Airtable Base <code className="font-mono text-[#173D2B]">appggtW264wuDdGKl</code>
        </p>
      </div>

      {/* KPI Cards */}
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
              <p className="font-serif text-2xl font-bold text-[#173D2B]">{s.val}</p>
              <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                {s.delta}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg font-bold text-[#173D2B]">Live Barista Queue</h3>
            <Link href="/admin/orders" className="text-xs font-semibold text-[#173D2B] hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              { code: "ORD-1001", customer: "Juan Ramos", items: "Spanish Latte (16oz), Cloud Cold Brew", status: "Preparing" },
              { code: "ORD-1002", customer: "Patricia Valdez", items: "Barako Espresso Romano", status: "Ready" },
            ].map((o) => (
              <div key={o.code} className="p-3.5 rounded-2xl bg-[#F5F0E7] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#173D2B]">{o.code} — {o.customer}</p>
                  <p className="text-[10px] text-[#573B2C]">{o.items}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-200 text-amber-900">
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg font-bold text-[#173D2B]">Inventory Restock Warning</h3>
            <Link href="/admin/inventory" className="text-xs font-semibold text-[#173D2B] hover:underline flex items-center gap-1">
              <span>Manage Stock</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#F5F0E7] flex justify-between items-center">
              <div>
                <p className="font-bold text-[#173D2B]">Barista Oat Milk 1L</p>
                <p className="text-[10px] text-[#573B2C]">Current: 8 pcs · Min Threshold: 8 pcs</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-900">
                Low Stock
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F5F0E7] flex justify-between items-center">
              <div>
                <p className="font-bold text-[#173D2B]">Wild Tagaytay Honey 500ml</p>
                <p className="text-[10px] text-[#573B2C]">Current: 3 pcs · Min Threshold: 3 pcs</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-900">
                Low Stock
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
