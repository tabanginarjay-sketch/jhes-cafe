"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Check, ArrowRight, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";

interface ProductCardData {
  id: string;
  name: string;
  category_name?: string;
  price: number;
  origin?: string;
  tasting_notes?: string;
  tag?: string;
  image_url?: string;
}

const FALLBACK_PRODUCTS: ProductCardData[] = [
  {
    id: "barako-romano",
    name: "Barako Espresso Romano",
    category_name: "Signature Espresso",
    price: 190,
    origin: "Amadeo, Cavite",
    tasting_notes: "Heavy body, charred oak, caramelized jackfruit zest & candied lemon twist",
    tag: "Artisanal",
    image_url: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "spanish-latte-dulce",
    name: "Spanish Latte Dulce",
    category_name: "Signature Espresso",
    price: 220,
    origin: "Cavite Liberica Blend",
    tasting_notes: "Spiced condensed milk, double ristretto, Ceylon cinnamon bark dusting",
    tag: "Bestseller",
    image_url: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tagaytay-cloud-coldbrew",
    name: "Tagaytay Cloud Cold Brew",
    category_name: "Cold Brews",
    price: 240,
    origin: "Benguet Typica",
    tasting_notes: "Dense salted vanilla cream cap, 18-hr steeped slow drip, dark cacao finish",
    tag: "Highland Favorite",
    image_url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "salted-honey-latte",
    name: "Salted Wild Honey Latte",
    category_name: "Warm Classics",
    price: 230,
    origin: "Mt. Apo Arabica",
    tasting_notes: "Wild Tagaytay mountain honey, flaky sea salt froth, steamed velvety milk",
    tag: "Chef's Pick",
    image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "burnt-basque-cheesecake",
    name: "Burnt Basque Cheesecake",
    category_name: "Artisanal Pastries",
    price: 280,
    origin: "In-house Bakery",
    tasting_notes: "Caramelized charred crown, molten cream center, Maldon sea salt flakes",
    tag: "Must Try",
    image_url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "rosemary-croissant",
    name: "Rosemary Butter Croissant",
    category_name: "Artisanal Pastries",
    price: 160,
    origin: "Normandy French Butter",
    tasting_notes: "Flaky 72-layer honeycomb lamination, fresh rosemary butter glaze",
    tag: "Freshly Baked",
    image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
  },
];

export function BestSellers() {
  const [products, setProducts] = useState<ProductCardData[]>(FALLBACK_PRODUCTS);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const { addItem } = useCart();

  useEffect(() => {
    async function loadLiveProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Merge with photography
            const merged = data.map((item: any, idx: number) => ({
              ...item,
              image_url:
                item.image_url ||
                FALLBACK_PRODUCTS[idx % FALLBACK_PRODUCTS.length].image_url,
            }));
            setProducts(merged);
          }
        }
      } catch {
        // Keep fallback data
      }
    }
    void loadLiveProducts();
  }, []);

  const handleAddToCart = (product: ProductCardData) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      size: "Grande 16oz",
      temperature: product.category_name?.includes("Cold") ? "Iced" : "Hot",
      milk: "Whole Milk",
      imageUrl: product.image_url,
    });

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
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
            const isAdded = addedIds[product.id];
            return (
              <div
                key={product.id}
                className="group flex flex-col rounded-3xl overflow-hidden border border-[#E5DACB] bg-[#F5F0E7]/40 hover:bg-[#F5F0E7]/80 hover:border-[#C9AE8B] transition-all duration-300 shadow-2xs hover:shadow-md"
              >
                {/* Photo Frame */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-[#E5DACB]">
                  <img
                    src={product.image_url || FALLBACK_PRODUCTS[0].image_url}
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
                      {product.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#573B2C] line-clamp-2">
                      {product.tasting_notes}
                    </p>
                  </div>

                  {/* Price & Add to Cart Action */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#E5DACB]">
                    <div>
                      <span className="text-[10px] text-[#573B2C]/70 block font-medium">Regular (16oz)</span>
                      <span className="font-serif text-xl font-bold text-[#173D2B]">
                        ₱{product.price}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                        isAdded
                          ? "bg-emerald-800 text-[#FFFCF7]"
                          : "bg-[#173D2B] hover:bg-[#315640] text-[#FFFCF7]"
                      }`}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#C9AE8B]" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-[#C9AE8B]" />
                          <span>Add to Bag</span>
                        </>
                      )}
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
