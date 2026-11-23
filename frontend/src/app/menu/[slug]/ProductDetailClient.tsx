"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { addItem } = useCart();
  const [size, setSize] = useState("Grande 16oz");
  const [temp, setTemp] = useState("Hot");
  const [milk, setMilk] = useState("Whole Milk");
  const [isAdded, setIsAdded] = useState(false);

  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const handleAdd = () => {
    addItem({
      id: `prod-${slug}`,
      name: title,
      price: 220,
      size,
      temperature: temp as any,
      milk,
      imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
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
          <div className="lg:col-span-6 rounded-3xl overflow-hidden shadow-xl aspect-4/3 bg-[#E5DACB] border border-[#E5DACB]">
            <img
              src="https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=80"
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#315640]">
                Single-Origin Reserve
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B]">
                {title}
              </h1>
              <p className="font-serif text-2xl font-bold text-[#173D2B]">₱220</p>
            </div>

            <p className="text-sm leading-relaxed text-[#573B2C]">
              Slow-extracted on Tagaytay ridge with double ristretto espresso, velvety steamed dairy, and artisanal notes carefully developed to highlight the origin&apos;s natural sweetness.
            </p>

            <div className="space-y-4 pt-4 border-t border-[#E5DACB] text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#173D2B]">Cup Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Tall 12oz", "Grande 16oz", "Venti 20oz"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`py-2 rounded-xl border font-semibold ${
                        size === s
                          ? "bg-[#173D2B] text-white border-[#173D2B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#173D2B]">Temperature</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Hot", "Iced"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTemp(t)}
                      className={`py-2 rounded-xl border font-semibold ${
                        temp === t
                          ? "bg-[#173D2B] text-white border-[#173D2B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={`w-full py-4 rounded-full font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                isAdded ? "bg-emerald-800 text-white" : "bg-[#173D2B] hover:bg-[#315640] text-white"
              }`}
            >
              {isAdded ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />}
              <span>{isAdded ? "Added to Coffee Bag" : "Add to Order (₱220)"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
