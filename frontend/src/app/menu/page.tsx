"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sliders, Search, X, Sparkles, ArrowUpRight, Coffee } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";
import {
  CENTRALIZED_CATALOG,
  dedupeAndMergeCatalog,
  getProductImage,
  CatalogProduct,
} from "@/lib/productRegistry";

const DEFAULT_CATEGORIES = [
  "All",
  "Signature Espresso",
  "Cold Brews",
  "Warm Classics",
  "Artisanal Pastries",
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [menuItems, setMenuItems] = useState<CatalogProduct[]>(CENTRALIZED_CATALOG);
  const { setQuickCustomizeProduct } = useCart();

  useEffect(() => {
    let isActive = true;
    async function loadMenu() {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_BASE_URL}/catalog/products`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/catalog/categories`, { cache: "no-store" }),
        ]);

        if (prodRes.ok && isActive) {
          const data = await prodRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setMenuItems(dedupeAndMergeCatalog(data, { includeMissingCanonical: false }));
          }
        }

        if (catRes.ok && isActive) {
          const catData = await catRes.json();
          if (Array.isArray(catData) && catData.length > 0) {
            const activeNames = catData
              .filter((c: any) => c.is_active !== false && c.name)
              .map((c: any) => String(c.name).trim());
            if (activeNames.length > 0) {
              setCategories(["All", ...Array.from(new Set(activeNames))]);
            }
          }
        }
      } catch {
        // Keep CENTRALIZED_CATALOG fallback on network failure
      }
    }
    void loadMenu();
    return () => {
      isActive = false;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: menuItems.length };
    for (const cat of categories.slice(1)) {
      counts[cat] = menuItems.filter((item) => item.category_name === cat).length;
    }
    return counts;
  }, [menuItems, categories]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCat = activeCategory === "All" || item.category_name === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.tasting_notes.toLowerCase().includes(q) ||
        item.origin.toLowerCase().includes(q) ||
        item.category_name.toLowerCase().includes(q) ||
        (item.tag && item.tag.toLowerCase().includes(q))
      );
    });
  }, [menuItems, activeCategory, searchQuery]);

  const handleCustomize = (item: CatalogProduct) => {
    setQuickCustomizeProduct(item);
  };

  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">

        {/* Page Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-4 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F5F0E7] border border-[#E5DACB] text-[10px] font-semibold uppercase tracking-[0.22em] text-[#315640]">
            <Sparkles className="w-3 h-3 text-[#C9AE8B]" />
            <span>Handcrafted Reserve Bar</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#173D2B] tracking-tight">
            Our Coffee &amp; Bakery Menu
          </h1>
          <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
            Every drink is pulled to order on our manual espresso bar using single-origin beans and slow-steeped highland extractions. Customize to your exact taste.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="space-y-5 animate-fade-up animation-delay-100">
          {/* Search Input */}
          <div className="max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-[#573B2C]/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search espresso, cold brew, matcha, croissant..."
              aria-label="Search menu items"
              className="w-full pl-11 pr-10 py-3 rounded-full border border-[#E5DACB] bg-white text-xs sm:text-sm text-[#173D2B] placeholder:text-[#573B2C]/50 shadow-2xs focus:outline-hidden focus:border-[#173D2B] focus:ring-2 focus:ring-[#173D2B]/15 transition-all duration-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#573B2C]/70 hover:text-[#173D2B] hover:bg-[#F5F0E7] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills Filter with Live Counts */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {categories.map((category) => {
              const isActive = activeCategory === category;
              const count = categoryCounts[category] ?? 0;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center gap-2 active:scale-95 ${
                    isActive
                      ? "bg-[#173D2B] text-white shadow-md ring-2 ring-[#C9AE8B]/70 scale-[1.02]"
                      : "bg-[#F5F0E7] text-[#573B2C] hover:bg-[#E5DACB] hover:text-[#173D2B] hover:-translate-y-0.5"
                  }`}
                >
                  <span>{category}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono transition-colors duration-300 ${
                      isActive
                        ? "bg-white/20 text-[#DECDB8]"
                        : "bg-white/80 text-[#573B2C]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Grid or Empty Search State */}
        {filteredItems.length === 0 ? (
          <div className="max-w-md mx-auto rounded-3xl border border-[#E5DACB] bg-white p-10 text-center space-y-4 animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-[#F5F0E7] mx-auto flex items-center justify-center text-[#173D2B]">
              <Coffee className="w-7 h-7 text-[#C9AE8B]" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                No menu items found
              </h2>
              <p className="text-xs text-[#573B2C]">
                We couldn&apos;t find any drinks or pastries matching &ldquo;{searchQuery}&rdquo; in {activeCategory}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
              }}
              className="px-5 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              Show Full Menu
            </button>
          </div>
        ) : (
          <div
            key={`${activeCategory}-${searchQuery.trim().toLowerCase()}`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 sm:gap-8"
          >
            {filteredItems.map((item, idx) => {
              const imageUrl = getProductImage(item);
              const staggerDelay = Math.min(idx * 45, 320);
              const isAvailable = item.is_available !== false;

              return (
                <article
                  key={item.slug}
                  style={{ animationDelay: `${staggerDelay}ms` }}
                  className={`group rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-xs hover-card-elevate hover:border-[#C9AE8B] flex flex-col justify-between animate-card-enter ${
                    !isAvailable ? "opacity-80" : ""
                  }`}
                >
                  {/* Clickable Photo & Tag Header */}
                  <Link
                    href={`/menu/${item.slug}`}
                    className="relative h-60 w-full overflow-hidden bg-[#173D2B] block"
                  >
                    <img
                      src={imageUrl}
                      alt={item.name}
                      loading={idx < 6 ? "eager" : "lazy"}
                      className={`w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108 ${
                        !isAvailable ? "grayscale-[45%] brightness-75" : ""
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent transition-opacity duration-500 group-hover:from-black/75 pointer-events-none" />

                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] text-[10px] font-mono font-bold uppercase tracking-widest shadow-xs">
                          {item.category_name}
                        </span>
                        {!isAvailable ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-700/95 text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                            Sold Out
                          </span>
                        ) : item.tag ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#FFFCF7]/92 backdrop-blur-md text-[#573B2C] text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                            {item.tag}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                      <p className="text-[11px] text-white/90 font-mono truncate pr-2">
                        {item.origin}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#DECDB8] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shrink-0">
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>

                  {/* Details Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-xl font-bold text-[#173D2B] leading-tight group-hover:text-[#315640] transition-colors duration-300">
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
                    <div className="pt-3.5 border-t border-[#F5F0E7] flex items-center justify-between gap-3">
                      <Link
                        href={`/menu/${item.slug}`}
                        className="text-xs font-semibold text-[#173D2B] hover:text-[#315640] transition-colors nav-link-underline"
                      >
                        View Recipe Details
                      </Link>

                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => isAvailable && handleCustomize(item)}
                        className={`px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                          isAvailable
                            ? "bg-[#173D2B] hover:bg-[#315640] text-white shadow-xs hover:shadow-md cursor-pointer hover:scale-[1.03] active:scale-95"
                            : "bg-[#E5DACB] text-[#573B2C]/70 cursor-not-allowed"
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#C9AE8B]" />
                        <span>{isAvailable ? "Customize" : "Unavailable"}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
