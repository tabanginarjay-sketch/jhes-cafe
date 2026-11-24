"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Sliders, ArrowUpRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";
import {
  CENTRALIZED_CATALOG,
  dedupeAndMergeCatalog,
  getProductImage,
  CatalogProduct,
} from "@/lib/productRegistry";
import { ScrollReveal } from "@/components/common/ScrollReveal";

const CURATED_BESTSELLER_SLUGS = [
  "spanish-latte-dulce",
  "tagaytay-cloud-coldbrew",
  "iced-brown-sugar-shaken-espresso",
  "salted-honey-latte",
  "burnt-basque-cheesecake",
  "strawberry-pistachio-croissant",
];

function selectFeaturedSix(items: CatalogProduct[]): CatalogProduct[] {
  const bySlug = new Map(items.map((i) => [i.slug, i]));
  const picked: CatalogProduct[] = [];
  for (const slug of CURATED_BESTSELLER_SLUGS) {
    const match = bySlug.get(slug);
    if (match) picked.push(match);
  }
  for (const item of items) {
    if (picked.length >= 6) break;
    if (!picked.some((p) => p.slug === item.slug)) {
      picked.push(item);
    }
  }
  return picked.slice(0, 6);
}

export function BestSellers() {
  const [products, setProducts] = useState<CatalogProduct[]>(() =>
    selectFeaturedSix(CENTRALIZED_CATALOG)
  );
  const { setQuickCustomizeProduct } = useCart();

  useEffect(() => {
    let isActive = true;
    async function loadLiveProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`, { cache: "no-store" });
        if (res.ok && isActive) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const clean = dedupeAndMergeCatalog(data, { includeMissingCanonical: false });
            setProducts(selectFeaturedSix(clean));
          }
        }
      } catch {
        // Keep curated CENTRALIZED_CATALOG
      }
    }
    void loadLiveProducts();
    return () => {
      isActive = false;
    };
  }, []);

  const handleCustomize = (product: CatalogProduct) => {
    setQuickCustomizeProduct(product);
  };

  return (
    <section className="py-20 lg:py-28 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Section Header */}
        <ScrollReveal direction="up" delay={0}>
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
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] transition-colors"
            >
              <span className="nav-link-underline">View Full Menu</span>
              <ArrowRight className="w-4 h-4 text-[#C9AE8B] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, idx) => {
            const imageUrl = getProductImage(product);
            return (
              <ScrollReveal key={product.slug} direction="up" delay={idx * 70}>
                <article className="group h-full flex flex-col rounded-3xl overflow-hidden border border-[#E5DACB] bg-[#F5F0E7]/40 hover:bg-[#F5F0E7]/85 hover:border-[#C9AE8B] hover-card-elevate shadow-2xs">
                  {/* Clickable Photo Frame */}
                  <Link
                    href={`/menu/${product.slug}`}
                    className="relative aspect-4/3 w-full overflow-hidden bg-[#173D2B] block"
                  >
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B]/65 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

                    {/* Badge */}
                    {product.is_available === false ? (
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-rose-700/95 text-white text-[10px] font-semibold tracking-wider uppercase shadow-xs">
                        Sold Out
                      </span>
                    ) : product.tag ? (
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#FFFCF7] text-[10px] font-semibold tracking-wider uppercase shadow-xs">
                        {product.tag}
                      </span>
                    ) : null}

                    {/* Origin + Details Hover Hint */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
                      {product.origin && (
                        <span className="px-2.5 py-0.5 rounded-md bg-[#FFFCF7]/92 backdrop-blur-md text-[#573B2C] text-[10px] font-medium font-mono">
                          {product.origin}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#DECDB8] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <span>Recipe</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#315640]">
                        {product.category_name || "Specialty Drink"}
                      </span>
                      <h3 className="font-serif text-xl font-bold text-[#173D2B] group-hover:text-[#315640] transition-colors duration-300">
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
                        <span className="text-[10px] text-[#573B2C]/70 block font-mono">Standard</span>
                        <span className="font-serif text-xl font-bold text-[#173D2B]">
                          ₱{product.price}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={product.is_available === false}
                        onClick={() => product.is_available !== false && handleCustomize(product)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                          product.is_available === false
                            ? "bg-[#E5DACB] text-[#573B2C]/70 cursor-not-allowed"
                            : "cursor-pointer bg-[#173D2B] hover:bg-[#315640] text-[#FFFCF7] shadow-xs hover:shadow-md hover:scale-[1.03] active:scale-95"
                        }`}
                        aria-label={`Customize ${product.name}`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#C9AE8B]" />
                        <span>{product.is_available === false ? "Unavailable" : "Customize"}</span>
                      </button>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
