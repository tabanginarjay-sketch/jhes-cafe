"use client";

import { useState } from "react";
import { Sliders, Plus, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";

const BASE_OPTIONS = [
  {
    name: "Spanish Latte Dulce",
    basePrice: 220,
    origin: "Cavite Liberica Blend",
    notes: "Spiced condensed milk & double ristretto",
  },
  {
    name: "Barako Espresso Romano",
    basePrice: 190,
    origin: "Amadeo Heritage Farm",
    notes: "Charred oak & caramelized jackfruit zest",
  },
  {
    name: "Tagaytay Cloud Cold Brew",
    basePrice: 240,
    origin: "Benguet Typica",
    notes: "Salted vanilla cloud foam & 18-hr steeped brew",
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

  const handleAdd = () => {
    addItem({
      id: `custom-${Date.now()}`,
      name: selectedBase.name,
      price: currentPrice,
      size,
      temperature,
      milk,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <section className="py-20 lg:py-28 bg-[#F5F0E7] border-t border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
            <Sliders className="w-3.5 h-3.5 text-[#C9AE8B]" />
            <span>Interactive Barista Bar</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight">
            Craft your signature cup.
          </h2>
          <p className="text-sm text-[#573B2C] leading-relaxed">
            Choose your highland roast profile, select organic oat or whole milk, calibrate sweetness, and have our baristas prepare your exact drink.
          </p>
        </div>

        <div className="rounded-3xl border border-[#E5DACB] bg-[#FFFCF7] p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Configuration Steps */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Base Roast */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                1. Select Coffee Base
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BASE_OPTIONS.map((item) => {
                  const active = selectedBase.name === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedBase(item)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        active
                          ? "border-[#173D2B] bg-[#F5F0E7] ring-1 ring-[#173D2B]"
                          : "border-[#E5DACB] bg-white hover:border-[#315640]"
                      }`}
                    >
                      <p className="font-serif text-sm font-bold text-[#173D2B] line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-[#573B2C] mt-0.5 font-mono">
                        ₱{item.basePrice}
                      </p>
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
                  className="w-full rounded-xl border border-[#E5DACB] bg-white px-3.5 py-2.5 text-xs text-[#173D2B] font-medium focus:outline-hidden focus:border-[#173D2B]"
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
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        temperature === t
                          ? "bg-[#173D2B] text-[#FFFCF7] border-[#173D2B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C] hover:bg-[#F5F0E7]"
                      }`}
                    >
                      {t}
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
                  className="w-full rounded-xl border border-[#E5DACB] bg-white px-3.5 py-2.5 text-xs text-[#173D2B] font-medium focus:outline-hidden focus:border-[#173D2B]"
                >
                  <option value="Fresh Whole Milk">Fresh Whole Dairy Milk</option>
                  <option value="Barista Oat Milk">Barista Oat Milk (+₱35)</option>
                  <option value="Roasted Almond Milk">Roasted Almond Milk (+₱35)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold uppercase tracking-wider text-[#173D2B]">
                    5. Sweetness
                  </label>
                  <span className="font-mono font-bold text-[#315640]">{sweetness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="25"
                  value={sweetness}
                  onChange={(e) => setSweetness(Number(e.target.value))}
                  className="w-full accent-[#173D2B] mt-2"
                />
              </div>
            </div>

          </div>

          {/* Right: Live Drink Ticket & Add to Cart Action */}
          <div className="lg:col-span-5 rounded-2xl border border-[#E5DACB] bg-[#F5F0E7] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#573B2C]">
                Cup Ticket
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-950/10 px-2 py-0.5 rounded-full">
                Custom Formulation
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-[#173D2B]">
                {selectedBase.name}
              </h3>
              <p className="text-xs text-[#573B2C]">
                {selectedBase.notes}
              </p>
              <div className="text-xs font-mono text-[#573B2C]/80 pt-2 space-y-1 border-t border-[#E5DACB]">
                <p>• {size} · {temperature}</p>
                <p>• {milk}</p>
                <p>• {sweetness}% sweetness</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DACB] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#573B2C] block font-medium">Calculated Price</span>
                <span className="font-serif text-3xl font-bold text-[#173D2B]">
                  ₱{currentPrice}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer ${
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

      </div>
    </section>
  );
}
