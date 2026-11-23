"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ShoppingBag, Sparkles, Coffee, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";

interface ProductInfo {
  id: string;
  name: string;
  slug: string;
  category: string;
  basePrice: number;
  origin: string;
  roast: string;
  notes: string;
  imageUrl: string;
  isBakery?: boolean;
}

const CATALOG_DICTIONARY: Record<string, ProductInfo> = {
  "barako-espresso-romano": {
    id: "barako-romano",
    name: "Barako Espresso Romano",
    slug: "barako-espresso-romano",
    category: "Signature Espresso",
    basePrice: 190,
    origin: "Amadeo, Cavite",
    roast: "Dark French Roast",
    notes: "Heavy body, charred oak, caramelized jackfruit zest & candied lemon twist",
    imageUrl: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
  },
  "spanish-latte-dulce": {
    id: "spanish-latte-dulce",
    name: "Spanish Latte Dulce",
    slug: "spanish-latte-dulce",
    category: "Signature Espresso",
    basePrice: 220,
    origin: "Cavite Liberica Blend",
    roast: "Medium Dark",
    notes: "Spiced condensed milk, double ristretto, Ceylon cinnamon bark dusting",
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
  },
  "tagaytay-cloud-coldbrew": {
    id: "tagaytay-cloud-coldbrew",
    name: "Tagaytay Cloud Cold Brew",
    slug: "tagaytay-cloud-coldbrew",
    category: "Cold Brews",
    basePrice: 240,
    origin: "Benguet Typica",
    roast: "Medium Roast",
    notes: "Dense salted vanilla cream cap, 18-hr steeped slow drip, dark cacao finish",
    imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
  },
  "salted-honey-latte": {
    id: "salted-honey-latte",
    name: "Salted Wild Honey Latte",
    slug: "salted-honey-latte",
    category: "Warm Classics",
    basePrice: 230,
    origin: "Mt. Apo Arabica",
    roast: "Medium Roast",
    notes: "Wild Tagaytay mountain honey, flaky sea salt froth, steamed velvety milk",
    imageUrl: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
  },
  "burnt-basque-cheesecake": {
    id: "burnt-basque-cheesecake",
    name: "Burnt Basque Cheesecake",
    slug: "burnt-basque-cheesecake",
    category: "Artisanal Pastries",
    basePrice: 280,
    origin: "In-house Bakery",
    roast: "Freshly Baked",
    notes: "Caramelized charred crown, molten cream center, Maldon sea salt flakes",
    imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
    isBakery: true,
  },
  "rosemary-butter-croissant": {
    id: "rosemary-croissant",
    name: "Rosemary Butter Croissant",
    slug: "rosemary-butter-croissant",
    category: "Artisanal Pastries",
    basePrice: 160,
    origin: "In-house Bakery",
    roast: "European Style",
    notes: "72-layer laminated French butter pastry with garden rosemary infusion",
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
    isBakery: true,
  },
};

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductInfo>(() => {
    return (
      CATALOG_DICTIONARY[slug] || {
        id: `prod-${slug}`,
        name: slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        slug,
        category: "Signature Espresso",
        basePrice: 210,
        origin: "Tagaytay Highlands, Cavite",
        roast: "Medium Dark",
        notes: "Artisanal extraction with notes of dark cacao, roasted hazelnut, and natural brown sugar sweetness.",
        imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
      }
    );
  });

  const [size, setSize] = useState("Grande 16oz");
  const [temp, setTemp] = useState("Hot");
  const [milk, setMilk] = useState("Whole Milk");
  const [isAdded, setIsAdded] = useState(false);

  // Dynamic price calculation
  const sizeDiff = size === "Tall 12oz" ? -20 : size === "Venti 20oz" ? 30 : 0;
  const milkDiff = milk === "Oat Milk (+₱40)" || milk === "Almond Milk (+₱40)" ? 40 : 0;
  const finalPrice = product.isBakery ? product.basePrice : Math.max(100, product.basePrice + sizeDiff + milkDiff);

  useEffect(() => {
    // If not in static dictionary, attempt live catalog fetch
    async function checkLiveCatalog() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`);
        if (res.ok) {
          const list = await res.json();
          const match = list.find((p: any) => p.slug === slug || p.id === slug);
          if (match) {
            setProduct({
              id: match.id,
              name: match.name,
              slug: match.slug || slug,
              category: match.category_name || "Signature Espresso",
              basePrice: Number(match.price) || 210,
              origin: match.origin || "Tagaytay Highlands",
              roast: match.roast_level || "Medium Roast",
              notes: match.tasting_notes || "Artisan single-origin profile",
              imageUrl: match.image_url || "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
            });
          }
        }
      } catch {}
    }
    void checkLiveCatalog();
  }, [slug]);

  const handleAdd = () => {
    addItem({
      id: `${product.id}-${size}-${temp}`,
      name: product.name,
      price: finalPrice,
      size: product.isBakery ? undefined : size,
      temperature: product.isBakery ? undefined : (temp as any),
      milk: product.isBakery ? undefined : milk,
      imageUrl: product.imageUrl,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
  };

  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Product Image Stage */}
          <div className="lg:col-span-6 rounded-3xl overflow-hidden shadow-2xl aspect-4/3 bg-[#E5DACB] border border-[#E5DACB] relative group">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] font-mono text-[10px] font-semibold uppercase tracking-wider shadow">
                {product.category}
              </span>
            </div>
          </div>

          {/* Details & Customization */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C9AE8B]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#315640]">
                  {product.origin}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B]">
                {product.name}
              </h1>
              <p className="font-serif text-3xl font-bold text-[#173D2B]">
                ₱{finalPrice}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-[#573B2C]">
              {product.notes}
            </p>

            <div className="p-3.5 rounded-2xl bg-[#F5F0E7] border border-[#E5DACB] text-xs flex items-center justify-between">
              <span className="text-[#573B2C]">Roast Level: <strong className="text-[#173D2B]">{product.roast}</strong></span>
              <span className="text-emerald-800 font-semibold font-mono text-[11px]">● In Stock at Flagship</span>
            </div>

            {!product.isBakery && (
              <div className="space-y-4 pt-4 border-t border-[#E5DACB] text-xs">
                {/* Size options */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[#173D2B]">Cup Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "Tall 12oz", delta: "-₱20" },
                      { name: "Grande 16oz", delta: "Standard" },
                      { name: "Venti 20oz", delta: "+₱30" },
                    ].map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setSize(s.name)}
                        className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                          size === s.name
                            ? "bg-[#173D2B] text-white border-[#173D2B] shadow-xs"
                            : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#173D2B]"
                        }`}
                      >
                        <span className="font-semibold block">{s.name}</span>
                        <span className="text-[9px] opacity-75">{s.delta}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[#173D2B]">Temperature</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Hot", "Iced"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTemp(t)}
                        className={`py-2 rounded-xl border font-semibold transition-all cursor-pointer ${
                          temp === t
                            ? "bg-[#173D2B] text-white border-[#173D2B]"
                            : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#173D2B]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Milk Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[#173D2B]">Dairy / Plant Milk</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Whole Milk", "Oat Milk (+₱40)", "Almond Milk (+₱40)"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMilk(m)}
                        className={`py-2 px-1 text-[11px] rounded-xl border font-medium transition-all cursor-pointer ${
                          milk === m
                            ? "bg-[#173D2B] text-white border-[#173D2B]"
                            : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#173D2B]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleAdd}
              className={`w-full py-4 rounded-full font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                isAdded ? "bg-emerald-800 text-white" : "bg-[#173D2B] hover:bg-[#315640] text-white"
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Order Bag!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />
                  <span>Add to Order Bag (₱{finalPrice})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
