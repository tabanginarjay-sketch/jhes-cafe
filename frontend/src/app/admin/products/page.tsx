"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { getProductImage } from "@/lib/productRegistry";
import { Package, Plus, X, RefreshCw, Pencil, Trash2, Power } from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "Signature Espresso",
    "Cold Brews",
    "Warm Classics",
    "Artisanal Pastries",
  ]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState("Signature Espresso");
  const [price, setPrice] = useState("210");
  const [origin, setOrigin] = useState("Benguet, Philippines");
  const [roastLevel, setRoastLevel] = useState("Medium");
  const [notes, setNotes] = useState("");
  const [tag, setTag] = useState("Fresh");
  const [isAvailable, setIsAvailable] = useState(true);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/catalog/products`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_BASE_URL}/catalog/categories`, { credentials: "include", cache: "no-store" }),
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) {
        const cats = await catRes.json();
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats.map((c: any) => String(c.name)));
        }
      }
    } catch {
      setFeedback("Unable to load products from Airtable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setCategoryName(categories[0] || "Signature Espresso");
    setPrice("210");
    setOrigin("Tagaytay Ridge");
    setRoastLevel("Medium");
    setNotes("");
    setTag("Fresh");
    setIsAvailable(true);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setName(product.name || "");
    setCategoryName(product.category_name || categories[0] || "Signature Espresso");
    setPrice(String(product.price ?? 200));
    setOrigin(product.origin || "");
    setRoastLevel(product.roast_level || "None");
    setNotes(product.tasting_notes || "");
    setTag(product.tag || "Fresh");
    setIsAvailable(product.is_available !== false);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setFeedback(null);

      const payload = {
        name: name.trim(),
        category_name: categoryName,
        price: Number(price) || 200,
        origin: origin.trim(),
        roast_level: roastLevel,
        tasting_notes: notes.trim(),
        tag: tag.trim() || "Fresh",
        is_available: isAvailable,
      };

      const url = editingProduct
        ? `${API_BASE_URL}/catalog/products/${editingProduct.id}`
        : `${API_BASE_URL}/catalog/products`;
      const method = editingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        if (editingProduct) {
          setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? saved : p)));
        } else {
          setProducts((prev) => [saved, ...prev]);
        }
        setIsModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Could not save product to Airtable.");
      }
    } catch {
      setFeedback("Network error saving product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (product: any) => {
    try {
      setBusyId(product.id);
      const nextAvailable = !(product.is_available !== false);
      const res = await fetch(`${API_BASE_URL}/catalog/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_available: nextAvailable }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    if (!window.confirm(`Delete "${product.name}" from Airtable permanently?`)) return;
    try {
      setBusyId(product.id);
      const res = await fetch(`${API_BASE_URL}/catalog/products/${product.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback(err.detail || "Failed to delete product.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Products Catalog</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Full Create / Edit / Availability / Delete sync with Airtable Product table ({products.length} items).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="p-2.5 rounded-full border border-[#E5DACB] bg-white text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer"
            title="Refresh Products"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9AE8B]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {feedback}
        </div>
      )}

      {/* Modal Dialog for Adding / Editing Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#E5DACB] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#173D2B]">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#573B2C] hover:bg-[#F5F0E7] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Benguet Typica Pour-Over"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Price (₱ PHP)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] font-mono bg-[#FFFCF7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Origin / Source
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                  />
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Roast Level (or None for Food)
                  </label>
                  <select
                    value={roastLevel}
                    onChange={(e) => setRoastLevel(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                  >
                    <option value="Light">Light</option>
                    <option value="Medium">Medium</option>
                    <option value="Dark">Dark</option>
                    <option value="None">None (Bakery / Non-Coffee)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                  />
                </div>

                <label className="flex items-center gap-2 pt-5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 accent-[#173D2B]"
                  />
                  <span className="font-semibold text-[#173D2B]">Available for Ordering</span>
                </label>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Description &amp; Tasting Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#E5DACB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-[#E5DACB] text-[#573B2C] hover:bg-[#F5F0E7] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold cursor-pointer"
                >
                  {submitting ? "Saving to Airtable..." : editingProduct ? "Save Changes" : "Publish Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Origin</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[#573B2C]">
                    {loading ? "Loading products from Airtable..." : "No products found in Airtable."}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const avail = p.is_available !== false;
                  const isBusy = busyId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getProductImage(p)}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E5DACB] shrink-0"
                          />
                          <div>
                            <p className="font-bold text-[#173D2B]">{p.name}</p>
                            <p className="text-[10px] text-[#573B2C] max-w-xs truncate">{p.tasting_notes}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{p.category_name}</td>
                      <td className="p-4 font-mono font-bold text-sm">₱{p.price}</td>
                      <td className="p-4 font-mono text-[11px] text-[#573B2C]">{p.origin}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            avail
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-rose-100 text-rose-900"
                          }`}
                        >
                          {avail ? "Available" : "Sold Out"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleAvailability(p)}
                            className="p-1.5 rounded-lg border border-[#E5DACB] bg-[#FFFCF7] hover:bg-[#F5F0E7] text-[#173D2B] cursor-pointer"
                            title={avail ? "Mark Unavailable" : "Mark Available"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-[#E5DACB] bg-[#FFFCF7] hover:bg-[#F5F0E7] text-[#173D2B] cursor-pointer"
                            title="Edit product"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeleteProduct(p)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-800 cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
