"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Check, ArrowRight, Sparkles, Sliders } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";
import { CENTRALIZED_CATALOG, getProductImage, CatalogProduct } from "@/lib/productRegistry";

export function BestSellers() {
  const [products, setProducts] = useState<CatalogProduct[]>(CENTRALIZED_CATALOG);
  const { setQuickCustomizeProduct } = useCart();

  useEffect(() => {
    async function loadLiveProducts() {
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
              tag: item.tag || "Bestseller",
              image_url: getProductImage(item),
            }));

            // Merge so we maintain our full curated list with verified photos
            const existingSlugs = new Set(mapped.map((m) => m.slug));
            const merged = [...mapped];
            for (const item of CENTRALIZED_CATALOG) {
              if (!existingSlugs.has(item.slug)) {
                merged.push(item);
              }
            }
            setProducts(merged);
          }
        }
      } catch {
        // Keep CENTRALIZED_CATALOG
      }
    }
    void loadLiveProducts();
  }, []);

  const handleCustomize = (product: CatalogProduct) => {
    setQuickCustomizeProduct(product);
  };

  return (
    <section className="py-20 lg:py-28 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#E5DACB] pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
              <Sparkles className="w-3.5 h-3.5 text-[#C9AE8B]" />
              <span>Seasonal Reserve Selections</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight">
              Best Sellers &amp; Signatures
            </h2>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] transition-colors"
          >
            <span>View Full Menu</span>
            <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.slice(0, 6).map((product) => {
            const imageUrl = getProductImage(product);
            return (
              <div
                key={product.id || product.slug}
                className="group flex flex-col rounded-3xl overflow-hidden border border-[#E5DACB] bg-[#F5F0E7]/40 hover:bg-[#F5F0E7]/80 hover:border-[#C9AE8B] transition-all duration-300 shadow-2xs hover:shadow-md"
              >
                {/* Photo Frame */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-[#173D2B]">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B]/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Badge */}
                  {product.tag && (
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#FFFCF7] text-[10px] font-semibold tracking-wider uppercase">
                      {product.tag}
                    </span>
                  )}

                  {/* Origin */}
                  {product.origin && (
                    <span className="absolute bottom-3 left-4 px-2.5 py-0.5 rounded-md bg-[#FFFCF7]/90 backdrop-blur-md text-[#573B2C] text-[10px] font-medium font-mono">
                      {product.origin}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#315640]">
                      {product.category_name || "Specialty Drink"}
                    </span>
                    <h3 className="font-serif text-xl font-bold text-[#173D2B] group-hover:text-[#315640] transition-colors">
                      <Link href={`/menu/${product.slug}`}>
                        {product.name}
                      </Link>
                    </h3>
                    <p className="text-xs leading-relaxed text-[#573B2C] line-clamp-2">
                      {product.tasting_notes}
                    </p>
                  </div>

                  {/* Price & Customize Action */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#E5DACB]">
                    <div>
                      <span className="text-[10px] text-[#573B2C]/70 block font-mono">From</span>
                      <span className="font-serif text-xl font-bold text-[#173D2B]">
                        ₱{product.price}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCustomize(product)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer bg-[#173D2B] hover:bg-[#315640] text-[#FFFCF7] shadow-xs hover:shadow-md active:scale-95"
                      aria-label={`Customize ${product.name}`}
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
    </section>
  );
}
