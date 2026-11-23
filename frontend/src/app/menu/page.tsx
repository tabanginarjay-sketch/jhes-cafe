"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Check, Filter, Sliders, Sparkles, Coffee } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";
import { CENTRALIZED_CATALOG, getProductImage, CatalogProduct } from "@/lib/productRegistry";

const CATEGORIES = [
  "All",
  "Signature Espresso",
  "Cold Brews",
  "Warm Classics",
  "Artisanal Pastries",
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [menuItems, setMenuItems] = useState<CatalogProduct[]>(CENTRALIZED_CATALOG);
  const { setQuickCustomizeProduct } = useCart();

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: CatalogProduct[] = data.map((item: any) => ({
              id: item.id,
              name: item.name,
              slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              category_name: item.category_name || "Signature Espresso",
              product_type: item.product_type || "coffee",
              price: Number(item.price) || 200,
              origin: item.origin || "Highland Harvest",
              roast_level: item.roast_level || "Medium Roast",
              tasting_notes: item.tasting_notes || "Artisanal single origin roast",
              is_available: item.is_available !== false,
              tag: item.tag || "Fresh",
              image_url: getProductImage(item),
            }));

            // Merge with centralized catalog items so items not yet in API table are still available
            const existingSlugs = new Set(mapped.map((m) => m.slug));
            const merged = [...mapped];
            for (const item of CENTRALIZED_CATALOG) {
              if (!existingSlugs.has(item.slug)) {
                merged.push(item);
              }
            }
            setMenuItems(merged);
          }
        }
      } catch {
        // Keep CENTRALIZED_CATALOG
      }
    }
    void loadMenu();
  }, []);

  const filteredItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter((i) => i.category_name === activeCategory);

  const handleCustomize = (item: CatalogProduct) => {
    setQuickCustomizeProduct(item);
  };

  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#315640]">
            Handcrafted Reserve Bar
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#173D2B] tracking-tight">
            Our Coffee &amp; Bakery Menu
          </h1>
          <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
            Every drink is pulled to order on our manual espresso bar using single-origin beans and slow-steeped highland extractions. Customize to your exact taste.
          </p>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#173D2B] text-white shadow-sm ring-1 ring-[#173D2B]"
                    : "bg-[#F5F0E7] text-[#573B2C] hover:bg-[#E5DACB] hover:text-[#173D2B]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => {
            const imageUrl = getProductImage(item);
            return (
              <div
                key={item.id || item.slug}
                className="group rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Photo & Tag Header */}
                <div className="relative h-60 w-full overflow-hidden bg-[#173D2B]">
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] text-[10px] font-mono font-bold uppercase tracking-widest">
                      {item.category_name}
                    </span>
                    {item.tag && (
                      <span className="px-3 py-1 rounded-full bg-[#E5DACB]/90 backdrop-blur-md text-[#573B2C] text-[10px] font-mono font-bold uppercase tracking-wider">
                        {item.tag}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <p className="text-xs text-white/80 font-mono">
                      {item.origin}
                    </p>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-xl font-bold text-[#173D2B] leading-tight group-hover:text-[#315640] transition-colors">
                        <Link href={`/menu/${item.slug}`}>
                          {item.name}
                        </Link>
                      </h3>
                      <span className="font-mono text-lg font-bold text-[#173D2B] shrink-0">
                        ₱{item.price}
                      </span>
                    </div>

                    <p className="text-xs text-[#573B2C] leading-relaxed line-clamp-2">
                      {item.tasting_notes}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-[#F5F0E7] flex items-center justify-between gap-3">
                    <Link
                      href={`/menu/${item.slug}`}
                      className="text-xs font-semibold text-[#173D2B] hover:text-[#315640] transition-colors underline underline-offset-4"
                    >
                      View Recipe Details
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleCustomize(item)}
                      className="px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#C9AE8B]" />
                      <span>Customize</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
