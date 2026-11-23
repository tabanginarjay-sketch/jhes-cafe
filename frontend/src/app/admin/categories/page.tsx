"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Layers, Plus, X, RefreshCw } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("5");
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/catalog/categories`, { cache: "no-store" });
      if (res.ok) setCategories(await res.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/catalog/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          display_order: Number(order) || 5,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setCategories((prev) => [...prev, created]);
        setIsModalOpen(false);
        setName("");
      } else {
        alert("Could not create category.");
      }
    } catch {
      alert("Error adding category.");
    } finally {
      setSubmitting(false);
    }
  };

  const list = categories.length > 0 ? categories : [
    { name: "Signature Espresso", slug: "signature-espresso", count: 2, display_order: 1 },
    { name: "Cold Brews", slug: "cold-brews", count: 1, display_order: 2 },
    { name: "Warm Classics", slug: "warm-classics", count: 1, display_order: 3 },
    { name: "Artisanal Pastries", slug: "artisanal-pastries", count: 2, display_order: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Category Management</h1>
          <p className="text-xs text-[#573B2C] mt-1">Organize storefront menu sections and sequence order.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCategories}
            className="p-2.5 rounded-full border border-[#E5DACB] bg-white text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer"
            title="Refresh Categories"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9AE8B]" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E5DACB] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">Add Menu Category</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#573B2C] hover:bg-[#F5F0E7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Seasonal Reserve Blends"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] font-mono bg-[#FFFCF7] focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E5DACB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#E5DACB] text-[#573B2C] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold cursor-pointer"
                >
                  {submitting ? "Saving..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {list.map((c) => (
          <div key={c.id || c.name} className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2 shadow-2xs">
            <span className="text-[10px] font-mono text-[#573B2C]">
              Sequence #{c.display_order || c.order || 1}
            </span>
            <h3 className="font-serif text-xl font-bold text-[#173D2B]">{c.name}</h3>
            <p className="text-xs text-[#573B2C]">
              Slug: <code className="font-mono text-[#173D2B]">/{c.slug || c.name.toLowerCase().replace(/\s+/g, "-")}</code>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
