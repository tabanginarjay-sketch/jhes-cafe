"use client";

import { useState } from "react";
import { Sliders, Plus, Check, Coffee, Flame, Snowflake, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { ScrollReveal } from "@/components/common/ScrollReveal";

const BASE_OPTIONS = [
  {
    name: "Spanish Latte Dulce",
    basePrice: 220,
    origin: "Cavite Liberica Blend",
    notes: "Spiced condensed milk, double ristretto, and Ceylon cinnamon dusting",
    tag: "Bestseller",
    hotImage: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
    icedImage: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Barako Espresso Romano",
    basePrice: 190,
    origin: "Amadeo Heritage Farm",
    notes: "Charred oak, caramelized jackfruit zest, and thick golden crema",
    tag: "Artisanal",
    hotImage: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
    icedImage: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Tagaytay Cloud Cold Brew",
    basePrice: 240,
    origin: "Benguet Typica",
    notes: "Salted vanilla cloud foam cascading over 18-hr slow-steeped dark roast",
    tag: "Highland Cold",
    hotImage: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
    icedImage: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=200&q=80",
  },
];

export function HomeCustomizer() {
  const [selectedBase, setSelectedBase] = useState(BASE_OPTIONS[0]);
  const [size, setSize] = useState<"Tall (12oz)" | "Grande (16oz)" | "Venti (20oz)">("Grande (16oz)");
  const [temperature, setTemperature] = useState<"Hot" | "Iced">("Hot");
  const [milk, setMilk] = useState<"Fresh Whole Milk" | "Barista Oat Milk" | "Roasted Almond Milk">("Fresh Whole Milk");
  const [sweetness, setSweetness] = useState<number>(50);
  const [isAdded, setIsAdded] = useState(false);

  const { addItem } = useCart();

  // Price calculations
  const sizeFee = size === "Venti (20oz)" ? 50 : size === "Grande (16oz)" ? 30 : 0;
  const milkFee = milk === "Fresh Whole Milk" ? 0 : 35;
  const currentPrice = selectedBase.basePrice + sizeFee + milkFee;

  const activeImage = temperature === "Iced" ? selectedBase.icedImage : selectedBase.hotImage;

  const handleAdd = () => {
    addItem({
      id: `custom-${Date.now()}`,
      name: selectedBase.name,
      price: currentPrice,
      size,
      temperature,
      milk,
      imageUrl: activeImage,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <section className="py-20 lg:py-28 bg-[#F5F0E7] border-t border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <ScrollReveal direction="up" delay={0}>
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
              <Sliders className="w-3.5 h-3.5 text-[#C9AE8B]" />
              <span>Interactive Barista Bar</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight">
              Craft your signature cup.
            </h2>
            <p className="text-sm text-[#573B2C] leading-relaxed">
              Choose your highland roast profile, select organic oat or whole milk, calibrate sweetness, and preview your handcrafted cup in real time.
            </p>
          </div>
        </ScrollReveal>

        {/* Customizer Workbench Card */}
        <ScrollReveal direction="up" delay={120}>
          <div className="rounded-3xl border border-[#E5DACB] bg-[#FFFCF7] p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left: Configuration Steps (7 cols) */}
            <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
              
              {/* Step 1: Base Roast Selection with Photo Thumbnails */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center justify-between">
                  <span>1. Select Coffee Base</span>
                  <span className="text-[10px] text-[#573B2C] font-normal lowercase">click to preview photo</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BASE_OPTIONS.map((item) => {
                    const active = selectedBase.name === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedBase(item)}
                        className={`p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex items-center gap-3 group hover:-translate-y-0.5 ${
                          active
                            ? "border-[#173D2B] bg-[#F5F0E7] ring-2 ring-[#173D2B] shadow-md scale-[1.01]"
                            : "border-[#E5DACB] bg-white hover:border-[#315640] hover:shadow-xs"
                        }`}
                      >
                        {/* Appetizing Coffee Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#E5DACB] bg-[#173D2B]">
                          <img
                            src={item.thumb}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-xs sm:text-sm font-bold text-[#173D2B] truncate group-hover:text-[#315640]">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[#573B2C] font-mono mt-0.5 font-semibold">
                            ₱{item.basePrice}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Size & Temperature */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    2. Cup Size
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as any)}
                    className="w-full rounded-xl border border-[#E5DACB] bg-white px-3.5 py-2.5 text-xs text-[#173D2B] font-medium focus:outline-hidden focus:border-[#173D2B] transition-colors"
                  >
                    <option value="Tall (12oz)">Tall (12oz) — Base</option>
                    <option value="Grande (16oz)">Grande (16oz) — +₱30</option>
                    <option value="Venti (20oz)">Venti (20oz) — +₱50</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    3. Temperature
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Hot", "Iced"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTemperature(t)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          temperature === t
                            ? "bg-[#173D2B] text-[#FFFCF7] border-[#173D2B] shadow-xs"
                            : "border-[#E5DACB] bg-white text-[#573B2C] hover:bg-[#F5F0E7]"
                        }`}
                      >
                        {t === "Hot" ? <Flame className="w-3.5 h-3.5 text-amber-500" /> : <Snowflake className="w-3.5 h-3.5 text-cyan-600" />}
                        <span>{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3: Milk & Sweetness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    4. Dairy &amp; Plant Milk
                  </label>
                  <select
                    value={milk}
                    onChange={(e) => setMilk(e.target.value as any)}
                    className="w-full rounded-xl border border-[#E5DACB] bg-white px-3.5 py-2.5 text-xs text-[#173D2B] font-medium focus:outline-hidden focus:border-[#173D2B] transition-colors"
                  >
                    <option value="Fresh Whole Milk">Fresh Whole Dairy Milk</option>
                    <option value="Barista Oat Milk">Barista Oat Milk (+₱35)</option>
                    <option value="Roasted Almond Milk">Roasted Almond Milk (+₱35)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold uppercase tracking-wider text-[#173D2B]">
                      5. Sweetness Level
                    </label>
                    <span className="font-mono font-bold text-[#315640]">{sweetness}% sweetness</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="25"
                    value={sweetness}
                    onChange={(e) => setSweetness(Number(e.target.value))}
                    className="w-full accent-[#173D2B] mt-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#573B2C]/70 font-mono">
                    <span>0% (Unsweetened)</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Live Drink Ticket & Visual Coffee Preview (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-5 sm:p-6 space-y-4 shadow-md relative overflow-hidden flex flex-col justify-between">
              
              {/* Header Strip */}
              <div className="flex items-center justify-between border-b border-[#E5DACB] pb-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-widest text-[#573B2C]">
                  <Coffee className="w-3.5 h-3.5 text-[#173D2B]" />
                  <span>Live Cup Ticket</span>
                </div>
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-950/10 px-2 py-0.5 rounded-full">
                  Custom Formulation
                </span>
              </div>

              {/* Dynamic Coffee Picture Stage */}
              <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-[#E5DACB] bg-[#173D2B] shadow-inner group">
                <img
                  key={`${selectedBase.name}-${temperature}`}
                  src={activeImage}
                  alt={selectedBase.name}
                  className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.04] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108 animate-scale-in"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B]/90 via-transparent to-transparent pointer-events-none" />

                {/* Floating Temperature Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${
                    temperature === "Hot"
                      ? "bg-[#573B2C]/90 text-[#DECDB8] border border-[#C9AE8B]/40"
                      : "bg-[#173D2B]/90 text-cyan-200 border border-cyan-400/40"
                  }`}>
                    {temperature === "Hot" ? (
                      <>
                        <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                        <span>Hot Steamed · 65°C</span>
                      </>
                    ) : (
                      <>
                        <Snowflake className="w-3 h-3 text-cyan-300 animate-spin-slow" />
                        <span>Highland Iced</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Floating Size Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-black/60 backdrop-blur-md text-[#FFFCF7] border border-white/20 shadow-md">
                    {size.split(" ")[0]}
                  </span>
                </div>

                {/* Bottom Image Overlay with Origin Tag */}
                <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-white pointer-events-none">
                  <span className="text-[10px] font-mono text-[#C9AE8B] uppercase tracking-wider">
                    {selectedBase.origin}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C9AE8B] text-[#173D2B]">
                    {selectedBase.tag}
                  </span>
                </div>
              </div>

              {/* Description & Recipe Specs */}
              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-[#173D2B] leading-tight">
                  {selectedBase.name}
                </h3>
                <p className="text-xs text-[#573B2C] leading-relaxed">
                  {selectedBase.notes}
                </p>
                
                <div className="text-xs font-mono text-[#573B2C] pt-2 space-y-1.5 border-t border-[#E5DACB]">
                  <div className="flex justify-between">
                    <span className="text-[#573B2C]/70">Size &amp; Temp:</span>
                    <span className="font-bold text-[#173D2B]">{size} · {temperature}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#573B2C]/70">Selected Milk:</span>
                    <span className="font-bold text-[#173D2B]">{milk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#573B2C]/70">Calibrated Sweetness:</span>
                    <span className="font-bold text-[#315640]">{sweetness}% sweetness</span>
                  </div>
                </div>
              </div>

              {/* Price & Add to Bag Action */}
              <div className="pt-3 border-t border-[#E5DACB] flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-[#573B2C] block font-medium uppercase tracking-wider">
                    Calculated Price
                  </span>
                  <span className="font-serif text-3xl font-bold text-[#173D2B]">
                    ₱{currentPrice}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 cursor-pointer ${
                    isAdded
                      ? "bg-emerald-800 text-[#FFFCF7]"
                      : "bg-[#173D2B] hover:bg-[#315640] text-[#FFFCF7]"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4 text-[#C9AE8B]" />
                      <span>Added to Bag</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-[#C9AE8B]" />
                      <span>Add to Bag</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
