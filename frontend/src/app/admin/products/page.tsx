"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Package, Plus } from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`);
        if (res.ok) setProducts(await res.json());
      } catch {}
    }
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Products Catalog</h1>
          <p className="text-xs text-[#573B2C] mt-1">Synchronized with Airtable Products table.</p>
        </div>
        <button className="px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4 text-[#C9AE8B]" />
          <span>Add Coffee Blend</span>
        </button>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Origin</th>
              <th className="p-4">Roast</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-[#F5F0E7]/40">
                <td className="p-4 font-bold">{p.name}</td>
                <td className="p-4">{p.category_name}</td>
                <td className="p-4 font-mono font-bold">₱{p.price}</td>
                <td className="p-4 font-mono text-[11px]">{p.origin}</td>
                <td className="p-4">{p.roast_level}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                    Available
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
