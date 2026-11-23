"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Boxes, Plus, Minus, AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminInventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const loadStock = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/inventory`, { cache: "no-store" });
      if (res.ok) setStock(await res.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStock();
  }, []);

  const handleAdjust = async (id: string, delta: number) => {
    try {
      setAdjustingId(id);
      // Optimistic update
      setStock((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, stock_quantity: Math.max(0, (i.stock_quantity || 0) + delta) } : i
        )
      );

      await fetch(`${API_BASE_URL}/inventory`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, delta }),
      });
    } catch {
      void loadStock();
    } finally {
      setAdjustingId(null);
    }
  };

  const items = stock.length > 0 ? stock : [
    { id: "inv-1", item_name: "Amadeo Cavite Liberica Beans 1kg", sku: "BEAN-LIB-01", stock_quantity: 15, unit: "kg", reorder_threshold: 5 },
    { id: "inv-2", item_name: "Benguet Typica Whole Beans 1kg", sku: "BEAN-TYP-01", stock_quantity: 4, unit: "kg", reorder_threshold: 5 },
    { id: "inv-3", item_name: "Barista Oat Milk 1L", sku: "MILK-OAT-01", stock_quantity: 24, unit: "pcs", reorder_threshold: 8 },
    { id: "inv-4", item_name: "Wild Tagaytay Honey 500ml", sku: "SYR-HNY-01", stock_quantity: 3, unit: "pcs", reorder_threshold: 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Inventory &amp; Supplies</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Real-time stock tracking with one-click barista replenishment controls.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStock}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Sync Stock</span>
        </button>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Item Name</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Stock Level</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Reorder Status</th>
                <th className="p-4 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {items.map((i) => {
                const isLow = i.stock_quantity <= (i.reorder_threshold || 5);
                const isAdjusting = adjustingId === i.id;
                return (
                  <tr key={i.id || i.sku} className="hover:bg-[#F5F0E7]/40 transition-colors">
                    <td className="p-4 font-bold">{i.item_name}</td>
                    <td className="p-4 font-mono text-[11px] text-[#573B2C]">{i.sku}</td>
                    <td className="p-4 font-mono font-bold text-sm">
                      {i.stock_quantity}
                    </td>
                    <td className="p-4">{i.unit}</td>
                    <td className="p-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold uppercase text-[10px] border border-rose-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Reorder Alert (&lt;= {i.reorder_threshold})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px]">
                          Adequate
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isAdjusting || i.stock_quantity <= 0}
                          onClick={() => handleAdjust(i.id, -1)}
                          className="w-7 h-7 rounded-lg border border-[#E5DACB] bg-[#F5F0E7] hover:bg-[#E5DACB] text-[#173D2B] flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
                          title="Deduct 1 unit"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isAdjusting}
                          onClick={() => handleAdjust(i.id, 1)}
                          className="w-7 h-7 rounded-lg border border-[#173D2B] bg-[#173D2B] hover:bg-[#315640] text-white flex items-center justify-center transition-all cursor-pointer"
                          title="Add 1 unit"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
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
