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

const SIZES = [
  { name: "Tall 12oz", volume: "355ml", delta: 0, label: "Base" },
  { name: "Grande 16oz", volume: "473ml", delta: 30, label: "+₱30" },
  { name: "Venti 20oz", volume: "591ml", delta: 50, label: "+₱50" },
];

const MILKS = [
  { name: "Fresh Whole Milk", sub: "Rich Creamy Dairy", delta: 0, label: "Included" },
  { name: "Barista Oat Milk", sub: "Organic Oat, Naturally Sweet", delta: 35, label: "+₱35" },
  { name: "Roasted Almond Milk", sub: "Nutty Roasted Profile", delta: 35, label: "+₱35" },
];

export function HomeCustomizer() {
  const [selectedBase, setSelectedBase] = useState(BASE_OPTIONS[0]);
  const [size, setSize] = useState<"Tall 12oz" | "Grande 16oz" | "Venti 20oz">("Grande 16oz");
  const [temperature, setTemperature] = useState<"Hot" | "Iced">("Hot");
  const [milk, setMilk] = useState<"Fresh Whole Milk" | "Barista Oat Milk" | "Roasted Almond Milk">("Fresh Whole Milk");
  const [sweetness, setSweetness] = useState<number>(50);
  const [isAdded, setIsAdded] = useState(false);

  const { addItem } = useCart();

  // Price calculations
  const sizeFee = SIZES.find((s) => s.name === size)?.delta || 0;
  const milkFee = MILKS.find((m) => m.name === milk)?.delta || 0;
  const currentPrice = selectedBase.basePrice + sizeFee + milkFee;

  const activeImage = temperature === "Iced" ? selectedBase.icedImage : selectedBase.hotImage;

  const isColdBrew = selectedBase.name.toLowerCase().includes("cold brew");

  const handleBaseChange = (item: (typeof BASE_OPTIONS)[0]) => {
    setSelectedBase(item);
    if (item.name.toLowerCase().includes("cold brew")) {
      setTemperature("Iced");
    }
  };

  const handleAdd = () => {
    const slug = selectedBase.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    addItem({
      productId: slug,
      slug: slug,
      name: selectedBase.name,
      price: currentPrice,
      size,
      temperature: isColdBrew ? "Iced" : temperature,
      milk: milk,
      sweetness: sweetness,
      imageUrl: activeImage,
      customizationSummary: `${size} · ${isColdBrew ? "Iced" : temperature} · ${milk} · ${sweetness}% sweet`,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
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
          <div className="rounded-3xl border border-[#E5DACB] bg-[#FFFCF7] p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left: Configuration Steps (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

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
                        onClick={() => handleBaseChange(item)}
                        className={`p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex items-center gap-3 group hover:-translate-y-0.5 ${active
                          ? "border-[#173D2B] bg-[#F5F0E7] ring-2 ring-[#173D2B] shadow-md scale-[1.01]"
                          : "border-[#E5DACB] bg-white hover:border-[#315640] hover:shadow-xs"
                          }`}
                      >
                        {/* Coffee Thumbnail */}
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

              {/* Step 2: Cup Size Cards */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center justify-between">
                  <span>2. Cup Size</span>
                  <span className="text-[10px] text-[#573B2C] font-mono">{size}</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SIZES.map((s) => {
                    const active = size === s.name;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setSize(s.name as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${active
                          ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                      >
                        <span className={`text-[10px] font-mono uppercase ${active ? "text-[#C9AE8B]" : "text-[#573B2C]/70"}`}>
                          {s.volume}
                        </span>
                        <div className="mt-1">
                          <p className="font-serif text-xs sm:text-sm font-bold">{s.name.split(" ")[0]}</p>
                          <p className={`text-[10px] ${active ? "text-white/80" : "text-[#173D2B] font-semibold"}`}>{s.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Temperature */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    3. Serving Temperature
                  </label>
                  {isColdBrew && (
                    <span className="text-[10px] font-mono font-semibold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                      Highland Iced Only
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["Hot", "Iced"] as const).map((t) => {
                    const isDisabled = isColdBrew && t === "Hot";
                    const isSelected = isColdBrew ? t === "Iced" : temperature === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setTemperature(t)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                          isDisabled
                            ? "border-[#E5DACB]/50 bg-gray-50/70 text-gray-400 opacity-50 cursor-not-allowed"
                            : isSelected
                            ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B] cursor-pointer"
                            : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640] cursor-pointer"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDisabled ? "bg-gray-100 text-gray-400" : isSelected ? "bg-white/20" : "bg-[#F5F0E7]"
                        }`}>
                          {t === "Hot" ? <Flame className="w-4 h-4 text-amber-500" /> : <Snowflake className="w-4 h-4 text-cyan-600" />}
                        </div>
                        <div>
                          <p className="font-serif text-xs sm:text-sm font-bold">
                            {t === "Hot" ? (isDisabled ? "Hot (Unavailable)" : "Hot Steamed 65°C") : "Highland Iced"}
                          </p>
                          <p className={`text-[10px] ${isDisabled ? "text-gray-400" : isSelected ? "text-white/70" : "text-[#573B2C]/70"}`}>
                            {t === "Hot" ? (isDisabled ? "Cold brew steeped cold" : "Velvety microfoam") : "Chilled over ice"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Milk Choice */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                  4. Dairy &amp; Plant Milk
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MILKS.map((m) => {
                    const active = milk === m.name;
                    return (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => setMilk(m.name as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${active
                          ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-serif text-xs font-bold">{m.name.replace(" Milk", "")}</p>
                          <span className={`text-[10px] font-mono ${active ? "text-[#C9AE8B]" : "text-[#315640] font-semibold"}`}>{m.label}</span>
                        </div>
                        <p className={`text-[10px] mt-1 ${active ? "text-white/70" : "text-[#573B2C]/70"}`}>{m.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 5: Sweetness Slider */}
              <div className="space-y-2.5 rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-4">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold uppercase tracking-wider text-[#173D2B]">
                    5. Sweetness Level
                  </label>
                  <span className="font-mono font-bold text-[#173D2B] bg-white px-2 py-0.5 rounded-full border border-[#E5DACB] text-[11px]">
                    {sweetness}% sweetness
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[0, 25, 50, 75, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSweetness(val)}
                      className={`py-1.5 text-center rounded-lg border text-[10px] font-mono font-semibold transition-all cursor-pointer ${sweetness === val
                        ? "bg-[#173D2B] text-white border-[#173D2B]"
                        : "bg-white text-[#573B2C] border-[#E5DACB] hover:border-[#315640]"
                        }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="25"
                  value={sweetness}
                  onChange={(e) => setSweetness(Number(e.target.value))}
                  className="w-full accent-[#173D2B] mt-2 cursor-pointer h-1.5 bg-[#E5DACB] rounded-lg"
                />
              </div>

            </div>

            {/* Right: Live Drink Ticket & Visual Coffee Preview (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-5 sm:p-6 space-y-4 shadow-md sticky top-28 self-start">

              {/* Header Strip */}
              <div className="flex items-center justify-between border-b border-[#E5DACB] pb-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-widest text-[#573B2C]">
                  <Coffee className="w-3.5 h-3.5 text-[#173D2B]" />
                  <span>Live Cup Ticket</span>
                </div>
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-950/10 px-2 py-0.5 rounded-full border border-emerald-800/20">
                  Custom Formulation
                </span>
              </div>

              {/* Dynamic Coffee Picture Stage */}
              <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-[#E5DACB] bg-[#173D2B] shadow-inner group">
                <img
                  key={`${selectedBase.name}-${temperature}`}
                  src={activeImage}
                  alt={selectedBase.name}
                  className="w-full h-full object-cover object-center filter brightness-[0.94] contrast-[1.04] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108 animate-scale-in"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B]/90 via-transparent to-transparent pointer-events-none" />

                {/* Floating Temperature Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${temperature === "Hot"
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
                        <Snowflake className="w-3 h-3 text-cyan-300" />
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
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 cursor-pointer ${isAdded
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

