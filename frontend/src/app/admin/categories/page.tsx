"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Plus, X, RefreshCw, Trash2 } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const [catRes, prodRes] = await Promise.all([
        fetch(`${API_BASE_URL}/catalog/categories`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_BASE_URL}/catalog/products`, { credentials: "include", cache: "no-store" }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch {
      setFeedback("Unable to load categories from Airtable.");
    } finally {
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
      setFeedback(null);
      const res = await fetch(`${API_BASE_URL}/catalog/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          display_order: Number(order) || 5,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setCategories((prev) =>
          [...prev, created].sort((a, b) => (a.display_order || 99) - (b.display_order || 99))
        );
        setIsModalOpen(false);
        setName("");
        setDescription("");
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Could not create category.");
      }
    } catch {
      setFeedback("Error adding category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!window.confirm(`Delete category "${cat.name}" from Airtable?`)) return;
    const res = await fetch(`${API_BASE_URL}/catalog/categories/${cat.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Category Management</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Live Airtable <code className="font-mono text-[#173D2B]">Category</code> table ({categories.length} categories).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCategories()}
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

      {feedback && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {feedback}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
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
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short section summary"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
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
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] font-mono bg-[#FFFCF7]"
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

      {categories.length === 0 ? (
        <div className="p-10 rounded-3xl border border-[#E5DACB] bg-white text-center text-xs text-[#573B2C]">
          {loading ? "Loading categories from Airtable..." : "No categories found in Airtable."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((c) => {
            const liveCount = products.filter((p) => p.category_name === c.name).length;
            return (
              <div key={c.id} className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-2 shadow-2xs flex justify-between items-start gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#573B2C]">
                      Sequence #{c.display_order || 1}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#F5F0E7] text-[#173D2B]">
                      {liveCount} {liveCount === 1 ? "product" : "products"}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#173D2B]">{c.name}</h3>
                  {c.description && <p className="text-xs text-[#573B2C]">{c.description}</p>}
                  <p className="text-[11px] text-[#573B2C]">
                    Slug: <code className="font-mono text-[#173D2B]">/{c.slug}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(c)}
                  className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white cursor-pointer shrink-0"
                  title="Delete category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
