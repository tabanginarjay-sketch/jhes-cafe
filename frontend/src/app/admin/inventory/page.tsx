"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Plus, Minus, AlertTriangle, RefreshCw, X } from "lucide-react";

export default function AdminInventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("coffee_beans");
  const [stockQty, setStockQty] = useState("10");
  const [unit, setUnit] = useState("pcs");
  const [threshold, setThreshold] = useState("5");
  const [supplier, setSupplier] = useState("");

  const loadStock = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        setStock(await res.json());
      } else {
        setFeedback("Failed to load inventory records from Airtable.");
      }
    } catch {
      setFeedback("Unable to connect to inventory API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStock();
  }, []);

  const handleAdjust = async (id: string, delta: number) => {
    try {
      setAdjustingId(id);
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, delta }),
      });

      if (res.ok) {
        const updated = await res.json();
        setStock((prev) => prev.map((i) => (i.id === id ? updated : i)));
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Failed to persist stock adjustment.");
      }
    } catch {
      setFeedback("Network error adjusting stock.");
    } finally {
      setAdjustingId(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          item_name: itemName.trim(),
          sku: sku.trim() || undefined,
          category,
          stock_quantity: Number(stockQty) || 0,
          unit,
          reorder_threshold: Number(threshold) || 5,
          supplier: supplier.trim() || "Local Supplier",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setStock((prev) => [created, ...prev]);
        setIsModalOpen(false);
        setItemName("");
        setSku("");
        setSupplier("");
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Could not create inventory item.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Inventory &amp; Supplies</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Real-time Airtable Inventory stock levels ({stock.length} SKUs) with automatic order deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadStock()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9AE8B]" />
            <span>Add Supply</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {feedback}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#E5DACB] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">Add Inventory Supply</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 cursor-pointer">
                <X className="w-5 h-5 text-[#573B2C]" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">Item Name</label>
                <input
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Uji Ceremonial Matcha Tin 100g"
                  className="w-full rounded-xl border border-[#E5DACB] p-2.5 bg-[#FFFCF7]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">SKU</label>
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="TEA-UJI-01"
                    className="w-full rounded-xl border border-[#E5DACB] p-2.5 bg-[#FFFCF7] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">Unit</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-xl border border-[#E5DACB] p-2.5 bg-[#FFFCF7]">
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">Opening Stock</label>
                  <input type="number" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="w-full rounded-xl border border-[#E5DACB] p-2.5 bg-[#FFFCF7] font-mono" />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">Reorder Threshold</label>
                  <input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full rounded-xl border border-[#E5DACB] p-2.5 bg-[#FFFCF7] font-mono" />
                </div>
              </div>
              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">Supplier</label>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" className="w-full rounded-xl border border-[#E5DACB] p-2.5 bg-[#FFFCF7]" />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-[#E5DACB]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-full border border-[#E5DACB] text-[#573B2C] cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-full bg-[#173D2B] text-white font-semibold cursor-pointer">
                  {submitting ? "Saving..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Item Name</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Stock Level</th>
                <th className="p-4">Supplier / Restocked</th>
                <th className="p-4">Reorder Status</th>
                <th className="p-4 text-right">Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {stock.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#573B2C]">
                    {loading ? "Loading live Airtable inventory..." : "No inventory records found."}
                  </td>
                </tr>
              ) : (
                stock.map((i) => {
                  const isLow = (Number(i.stock_quantity) || 0) <= (Number(i.reorder_threshold) || 5);
                  const isAdjusting = adjustingId === i.id;
                  return (
                    <tr key={i.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                      <td className="p-4 font-bold">{i.item_name}</td>
                      <td className="p-4 font-mono text-[11px] text-[#573B2C]">{i.sku}</td>
                      <td className="p-4 font-mono font-bold text-sm">
                        {i.stock_quantity} <span className="font-normal text-xs text-[#573B2C]">{i.unit}</span>
                      </td>
                      <td className="p-4 text-[#573B2C]">
                        <p>{i.supplier || "—"}</p>
                        {i.last_restocked && <p className="text-[10px] font-mono">Restocked: {i.last_restocked}</p>}
                      </td>
                      <td className="p-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold uppercase text-[10px] border border-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Reorder (&lt;= {i.reorder_threshold})</span>
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
                            disabled={isAdjusting || (Number(i.stock_quantity) || 0) <= 0}
                            onClick={() => void handleAdjust(i.id, -1)}
                            className="w-7 h-7 rounded-lg border border-[#E5DACB] bg-[#F5F0E7] hover:bg-[#E5DACB] text-[#173D2B] flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
                            title="Deduct 1 unit"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isAdjusting}
                            onClick={() => void handleAdjust(i.id, 1)}
                            className="w-7 h-7 rounded-lg border border-[#173D2B] bg-[#173D2B] hover:bg-[#315640] text-white flex items-center justify-center transition-all cursor-pointer"
                            title="Add 1 unit"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
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
