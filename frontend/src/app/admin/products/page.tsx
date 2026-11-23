"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Package, Plus, X, Check, RefreshCw } from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState("Signature Espresso");
  const [price, setPrice] = useState("210");
  const [origin, setOrigin] = useState("Benguet, Philippines");
  const [roastLevel, setRoastLevel] = useState("Medium Roast");
  const [notes, setNotes] = useState("Caramel, milk chocolate, citrus sweetness");

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/catalog/products`, { cache: "no-store" });
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (err) {
      console.warn("Using products fallback", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/catalog/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category_name: categoryName,
          price: Number(price) || 200,
          origin: origin.trim(),
          roast_level: roastLevel,
          tasting_notes: notes.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setProducts((prev) => [created, ...prev]);
        setIsModalOpen(false);
        setName("");
      } else {
        alert("Could not create product in Airtable.");
      }
    } catch {
      alert("Error adding product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Products Catalog</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Live synchronization with Airtable Products table (<code className="font-mono text-[#173D2B]">tblcQD4QoANpq0ytK</code>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadProducts}
            className="p-2.5 rounded-full border border-[#E5DACB] bg-white text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer"
            title="Refresh Products"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9AE8B]" />
            <span>Add Coffee Blend</span>
          </button>
        </div>
      </div>

      {/* Modal Dialog for Adding Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#E5DACB] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#173D2B]">Add New Coffee Blend</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#573B2C] hover:bg-[#F5F0E7] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Blend / Drink Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Benguet Typica Honey Roast"
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
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
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
                  >
                    <option value="Signature Espresso">Signature Espresso</option>
                    <option value="Cold Brews">Cold Brews</option>
                    <option value="Warm Classics">Warm Classics</option>
                    <option value="Artisanal Pastries">Artisanal Pastries</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Price (₱ PHP)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] font-mono bg-[#FFFCF7] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Origin
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                    Roast Profile
                  </label>
                  <select
                    value={roastLevel}
                    onChange={(e) => setRoastLevel(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
                  >
                    <option value="Light Roast">Light Roast</option>
                    <option value="Medium Roast">Medium Roast</option>
                    <option value="Medium Dark">Medium Dark</option>
                    <option value="Dark Italian">Dark Italian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#173D2B] block mb-1">
                  Artisanal Tasting Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden"
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
                  className="px-6 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {submitting ? "Saving to Airtable..." : "Publish to Storefront"}
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
                <th className="p-4">Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Origin</th>
                <th className="p-4">Roast</th>
                <th className="p-4">Tasting Notes</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                  <td className="p-4 font-bold">{p.name}</td>
                  <td className="p-4">{p.category_name}</td>
                  <td className="p-4 font-mono font-bold text-sm">₱{p.price}</td>
                  <td className="p-4 font-mono text-[11px] text-[#573B2C]">{p.origin}</td>
                  <td className="p-4">{p.roast_level}</td>
                  <td className="p-4 max-w-xs truncate text-[#573B2C]" title={p.tasting_notes}>
                    {p.tasting_notes}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase">
                      Available
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
