"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Boxes } from "lucide-react";

export default function AdminInventoryPage() {
  const [stock, setStock] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/inventory`);
        if (res.ok) setStock(await res.json());
      } catch {}
    }
    void load();
  }, []);

  const items = stock.length > 0 ? stock : [
    { item_name: "Amadeo Cavite Liberica Beans 1kg", sku: "BEAN-LIB-01", stock_quantity: 15, unit: "kg", reorder_threshold: 5 },
    { item_name: "Benguet Typica Whole Beans 1kg", sku: "BEAN-TYP-01", stock_quantity: 12, unit: "kg", reorder_threshold: 4 },
    { item_name: "Barista Oat Milk 1L", sku: "MILK-OAT-01", stock_quantity: 24, unit: "pcs", reorder_threshold: 8 },
    { item_name: "Wild Tagaytay Honey 500ml", sku: "SYR-HNY-01", stock_quantity: 10, unit: "pcs", reorder_threshold: 3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Inventory &amp; Supplies</h1>
        <p className="text-xs text-[#573B2C] mt-1">Real-time coffee bean bags, milk cartons, and syrups stock levels.</p>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
            <tr>
              <th className="p-4">Item Name</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Stock Level</th>
              <th className="p-4">Unit</th>
              <th className="p-4">Reorder Alert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
            {items.map((i) => (
              <tr key={i.sku} className="hover:bg-[#F5F0E7]/40">
                <td className="p-4 font-bold">{i.item_name}</td>
                <td className="p-4 font-mono text-[11px] text-[#573B2C]">{i.sku}</td>
                <td className="p-4 font-mono font-bold text-sm">{i.stock_quantity}</td>
                <td className="p-4">{i.unit}</td>
                <td className="p-4 font-mono text-[11px]">{i.reorder_threshold} {i.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
