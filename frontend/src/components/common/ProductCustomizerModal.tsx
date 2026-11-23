"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Coffee,
  Flame,
  Snowflake,
  Sparkles,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";

const SIZES = [
  { name: "Tall 12oz", volume: "355 ml", delta: -20, label: "-₱20" },
  { name: "Grande 16oz", volume: "473 ml", delta: 0, label: "Standard" },
  { name: "Venti 20oz", volume: "591 ml", delta: 30, label: "+₱30" },
];

const MILKS = [
  { name: "Whole Milk", sub: "Fresh Whole Dairy Milk", delta: 0, priceLabel: "Included" },
  { name: "Skim Milk", sub: "Light & Crisp Non-Fat Milk", delta: 0, priceLabel: "Included" },
  { name: "Barista Oat Milk", sub: "Organic Oat, Naturally Sweet", delta: 40, priceLabel: "+₱40" },
  { name: "Soy Milk", sub: "Silky Smooth Plant Protein", delta: 40, priceLabel: "+₱40" },
  { name: "Roasted Almond Milk", sub: "Nutty Roasted Profile", delta: 40, priceLabel: "+₱40" },
];

const SWEETNESS_PRESETS = [
  { level: 0, label: "0% Unsweetened" },
  { level: 25, label: "25% Subtle" },
  { level: 50, label: "50% Balanced" },
  { level: 75, label: "75% Sweet" },
  { level: 100, label: "100% Extra Sweet" },
];

const EXTRA_SHOTS = [
  { count: 0, name: "Standard 2 Shots", delta: 0, label: "Included" },
  { count: 1, name: "+1 Extra Shot", delta: 45, label: "+₱45" },
  { count: 2, name: "+2 Extra Shots", delta: 85, label: "+₱85" },
];

const TOPPINGS = [
  { id: "cold-foam", name: "Sea Salt Cold Foam", delta: 45, label: "+₱45" },
  { id: "vanilla-drizzle", name: "Madagascar Vanilla Drizzle", delta: 35, label: "+₱35" },
  { id: "caramel-crunch", name: "Brown Sugar Caramel Crunch", delta: 35, label: "+₱35" },
  { id: "ceylon-cinnamon", name: "Ceylon Cinnamon Dusting", delta: 0, label: "Complimentary" },
];

const PASTRY_ADDONS = [
  { id: "normandy-butter", name: "Whipped French Butter", delta: 25, label: "+₱25" },
  { id: "wild-honey", name: "Wild Tagaytay Honey Dip", delta: 30, label: "+₱30" },
  { id: "cacao-dip", name: "Dark Cacao Chocolate Dip", delta: 35, label: "+₱35" },
];

export function ProductCustomizerModal() {
  const {
    quickCustomizeProduct,
    setQuickCustomizeProduct,
    activeEditItem,
    setActiveEditItem,
    addItem,
    updateItem,
  } = useCart();

  const activeProduct = quickCustomizeProduct || activeEditItem;
  const isEditMode = Boolean(activeEditItem);

  const isBakery =
    activeProduct?.isBakery ||
    activeProduct?.category_name?.toLowerCase().includes("pastr") ||
    activeProduct?.category?.toLowerCase().includes("pastr") ||
    activeProduct?.category_name?.toLowerCase().includes("bake") ||
    activeProduct?.category?.toLowerCase().includes("bake") ||
    activeProduct?.name?.toLowerCase().includes("cheesecake") ||
    activeProduct?.name?.toLowerCase().includes("croissant");

  // Customization States
  const [size, setSize] = useState<string>("Grande 16oz");
  const [temperature, setTemperature] = useState<"Hot" | "Iced">("Hot");
  const [milk, setMilk] = useState<string>("Whole Milk");
  const [sweetness, setSweetness] = useState<number>(50);
  const [extraShots, setExtraShots] = useState<number>(0);
  const [toppings, setToppings] = useState<string[]>([]);
  const [warming, setWarming] = useState<string>("Warm & Lightly Toasted");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  // Initialize form whenever product or edit item changes
  useEffect(() => {
    if (!activeProduct) return;

    if (isEditMode && activeEditItem) {
      setSize(activeEditItem.size || "Grande 16oz");
      setTemperature(activeEditItem.temperature || "Hot");
      setMilk(activeEditItem.milk || "Whole Milk");
      setSweetness(activeEditItem.sweetness !== undefined ? activeEditItem.sweetness : 50);
      setExtraShots(activeEditItem.extraShots || 0);
      setToppings(activeEditItem.toppings || []);
      setWarming(activeEditItem.warming || "Warm & Lightly Toasted");
      setAddOns(activeEditItem.addOns || []);
      setQuantity(activeEditItem.quantity || 1);
    } else {
      // Default initialization
      const defaultTemp =
        activeProduct.category?.toLowerCase().includes("cold") ||
        activeProduct.category_name?.toLowerCase().includes("cold") ||
        activeProduct.name?.toLowerCase().includes("cold")
          ? "Iced"
          : "Hot";

      setSize("Grande 16oz");
      setTemperature(defaultTemp);
      setMilk("Whole Milk");
      setSweetness(50);
      setExtraShots(0);
      setToppings([]);
      setWarming("Warm & Lightly Toasted");
      setAddOns([]);
      setQuantity(1);
    }
    setValidationError(null);
  }, [activeProduct, isEditMode, activeEditItem]);

  if (!activeProduct) return null;

  const basePrice = Number(activeProduct.basePrice || activeProduct.price) || 200;

  // Price calculations
  const sizeFee = !isBakery ? SIZES.find((s) => s.name === size)?.delta || 0 : 0;
  const milkFee = !isBakery ? MILKS.find((m) => m.name === milk)?.delta || 0 : 0;
  const shotsFee = !isBakery ? EXTRA_SHOTS.find((s) => s.count === extraShots)?.delta || 0 : 0;
  const toppingsFee = !isBakery
    ? toppings.reduce((acc, tId) => {
        const t = TOPPINGS.find((item) => item.id === tId);
        return acc + (t ? t.delta : 0);
      }, 0)
    : 0;

  const addOnsFee = isBakery
    ? addOns.reduce((acc, aId) => {
        const a = PASTRY_ADDONS.find((item) => item.id === aId);
        return acc + (a ? a.delta : 0);
      }, 0)
    : 0;

  const unitPrice = isBakery
    ? Math.max(80, basePrice + addOnsFee)
    : Math.max(100, basePrice + sizeFee + milkFee + shotsFee + toppingsFee);

  const totalPrice = unitPrice * quantity;

  const handleToggleTopping = (toppingId: string) => {
    setToppings((prev) =>
      prev.includes(toppingId) ? prev.filter((id) => id !== toppingId) : [...prev, toppingId]
    );
  };

  const handleToggleAddOn = (addOnId: string) => {
    setAddOns((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    );
  };

  const handleClose = () => {
    setQuickCustomizeProduct(null);
    setActiveEditItem(null);
  };

  const handleSave = () => {
    // Validation
    if (!isBakery) {
      if (!size) {
        setValidationError("Please select a cup size.");
        return;
      }
      if (!temperature) {
        setValidationError("Please choose a temperature (Hot or Iced).");
        return;
      }
      if (!milk) {
        setValidationError("Please select a milk preference.");
        return;
      }
    }

    setIsSubmitting(true);

    const shotLabel = extraShots > 0 ? `+${extraShots} Shot${extraShots > 1 ? "s" : ""}` : "";
    const toppingsText = toppings
      .map((id) => TOPPINGS.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    const addOnsText = addOns
      .map((id) => PASTRY_ADDONS.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    const summary = isBakery
      ? [warming, addOnsText].filter(Boolean).join(" · ")
      : [size, temperature, milk, `${sweetness}% sweet`, shotLabel, toppingsText]
          .filter(Boolean)
          .join(" · ");

    if (isEditMode && activeEditItem) {
      updateItem(activeEditItem.id, {
        price: unitPrice,
        quantity,
        size: isBakery ? undefined : size,
        temperature: isBakery ? undefined : temperature,
        milk: isBakery ? undefined : milk,
        sweetness: isBakery ? undefined : sweetness,
        extraShots: isBakery ? undefined : extraShots,
        toppings: isBakery ? undefined : toppings,
        warming: isBakery ? warming : undefined,
        addOns: isBakery ? addOns : undefined,
        customizationSummary: summary,
      });
      handleClose();
    } else {
      addItem(
        {
          productId: activeProduct.id || activeProduct.slug,
          slug: activeProduct.slug || activeProduct.id,
          name: activeProduct.name,
          category: activeProduct.category_name || activeProduct.category || "Specialty Drink",
          price: unitPrice,
          quantity,
          imageUrl: activeProduct.image_url || activeProduct.image || activeProduct.imageUrl,
          isBakery,
          size: isBakery ? undefined : size,
          temperature: isBakery ? undefined : temperature,
          milk: isBakery ? undefined : milk,
          sweetness: isBakery ? undefined : sweetness,
          extraShots: isBakery ? undefined : extraShots,
          toppings: isBakery ? undefined : toppings,
          warming: isBakery ? warming : undefined,
          addOns: isBakery ? addOns : undefined,
          customizationSummary: summary,
        },
        quantity,
        submitButtonRef.current
      );
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F2A1D]/75 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={handleClose}
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-6 text-[#173D2B]">
        <div className="relative w-full max-w-4xl rounded-3xl bg-[#FFFCF7] border border-[#E5DACB] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E5DACB] flex items-center justify-between bg-[#F5F0E7]/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#173D2B] flex items-center justify-center text-[#C9AE8B]">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#315640] block">
                  {isEditMode ? "Modify Recipe" : "Reserve Formulation Bar"}
                </span>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#173D2B]">
                  {isEditMode ? `Edit: ${activeProduct.name}` : `Customize ${activeProduct.name}`}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full text-[#573B2C] hover:bg-[#E5DACB] transition-colors cursor-pointer"
              aria-label="Close customizer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content - Scrollable Grid */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ========================================================
                  LEFT COLUMN: Customization Controls (7 cols)
                 ======================================================== */}
              <div className="lg:col-span-7 space-y-6">
                
                {validationError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {!isBakery ? (
                  /* DRINK CUSTOMIZATIONS */
                  <div className="space-y-6">
                    
                    {/* 1. CUP SIZE */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center gap-1.5">
                          <Coffee className="w-3.5 h-3.5 text-[#C9AE8B]" />
                          <span>1. Cup Size</span>
                        </label>
                        <span className="text-[11px] font-mono text-[#573B2C]">
                          Selected: <strong className="text-[#173D2B]">{size}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {SIZES.map((s) => {
                          const isSelected = size === s.name;
                          return (
                            <button
                              key={s.name}
                              type="button"
                              onClick={() => setSize(s.name)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-2 ring-[#C9AE8B]"
                                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                              }`}
                            >
                              <span className={`text-[10px] font-mono uppercase ${isSelected ? "text-[#C9AE8B]" : "text-[#573B2C]/70"}`}>
                                {s.volume}
                              </span>
                              <div className="mt-1">
                                <p className="font-serif text-xs sm:text-sm font-bold">{s.name.split(" ")[0]}</p>
                                <p className={`text-[10px] ${isSelected ? "text-white/80" : "text-[#173D2B] font-semibold"}`}>{s.label}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. TEMPERATURE */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        2. Serving Temperature
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setTemperature("Hot")}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                            temperature === "Hot"
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-2 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${temperature === "Hot" ? "bg-white/20 text-amber-300" : "bg-amber-50 text-amber-600"}`}>
                            <Flame className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-serif text-xs sm:text-sm font-bold">Hot Steamed</p>
                            <p className={`text-[10px] ${temperature === "Hot" ? "text-white/80" : "text-[#573B2C]"}`}>
                              Microfoam at 65°C
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTemperature("Iced")}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                            temperature === "Iced"
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-2 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${temperature === "Iced" ? "bg-white/20 text-cyan-300" : "bg-cyan-50 text-cyan-600"}`}>
                            <Snowflake className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-serif text-xs sm:text-sm font-bold">Highland Iced</p>
                            <p className={`text-[10px] ${temperature === "Iced" ? "text-white/80" : "text-[#573B2C]"}`}>
                              Poured over ice
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 3. DAIRY & PLANT MILK */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                          3. Dairy &amp; Plant Milk
                        </label>
                        <span className="text-[11px] font-mono text-[#573B2C]">
                          Selected: <strong className="text-[#173D2B]">{milk}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {MILKS.map((m) => {
                          const isSelected = milk === m.name;
                          return (
                            <button
                              key={m.name}
                              type="button"
                              onClick={() => setMilk(m.name)}
                              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-serif text-xs font-bold truncate">
                                  {m.name}
                                </span>
                              </div>
                              <span className={`text-[10px] font-mono mt-1 ${isSelected ? "text-[#C9AE8B]" : "text-[#315640] font-semibold"}`}>
                                {m.priceLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. SWEETNESS LEVEL */}
                    <div className="space-y-2 rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-4">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold uppercase tracking-wider text-[#173D2B]">
                          4. Sweetness Level
                        </label>
                        <span className="font-mono font-bold text-[#173D2B] bg-white px-2.5 py-0.5 rounded-full border border-[#E5DACB] text-[11px]">
                          {sweetness}% Sweetness
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {SWEETNESS_PRESETS.map((preset) => (
                          <button
                            key={preset.level}
                            type="button"
                            onClick={() => setSweetness(preset.level)}
                            className={`py-1.5 text-center rounded-xl border text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                              sweetness === preset.level
                                ? "bg-[#173D2B] text-white border-[#173D2B]"
                                : "bg-white text-[#573B2C] border-[#E5DACB] hover:border-[#315640]"
                            }`}
                          >
                            {preset.level}%
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

                    {/* 5. EXTRA ESPRESSO SHOTS */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        5. Extra Espresso Shots
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {EXTRA_SHOTS.map((s) => {
                          const isSelected = extraShots === s.count;
                          return (
                            <button
                              key={s.count}
                              type="button"
                              onClick={() => setExtraShots(s.count)}
                              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                              }`}
                            >
                              <p className="font-serif text-xs font-bold">{s.name}</p>
                              <p className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-[#C9AE8B]" : "text-[#315640] font-semibold"}`}>
                                {s.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 6. ADDITIONAL TOPPINGS */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        6. Additional Toppings &amp; Syrups
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {TOPPINGS.map((t) => {
                          const isSelected = toppings.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleToggleTopping(t.id)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-[#173D2B] text-white border-[#173D2B] shadow-xs"
                                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? "bg-[#C9AE8B] border-[#C9AE8B] text-[#173D2B]" : "border-[#C9AE8B]/60"}`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-xs font-medium truncate">{t.name}</span>
                              </div>
                              <span className={`text-[11px] font-mono font-semibold ml-2 ${isSelected ? "text-[#C9AE8B]" : "text-[#315640]"}`}>
                                {t.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                ) : (
                  /* PASTRY / FOOD CUSTOMIZATIONS */
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Warming Preference
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Warm & Lightly Toasted", "Room Temperature / Fresh"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setWarming(opt)}
                            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                              warming === opt
                                ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                                : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                            }`}
                          >
                            <p className="font-serif text-xs sm:text-sm font-bold">{opt.split(" / ")[0]}</p>
                            <p className={`text-[10px] mt-0.5 ${warming === opt ? "text-white/80" : "text-[#573B2C]"}`}>
                              {opt.includes("Warm") ? "Freshly warmed in deck" : "Original flaky crunch"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Available Add-ons
                      </label>
                      <div className="space-y-2">
                        {PASTRY_ADDONS.map((a) => {
                          const isSelected = addOns.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleToggleAddOn(a.id)}
                              className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-[#173D2B] text-white border-[#173D2B] shadow-xs"
                                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? "bg-[#C9AE8B] border-[#C9AE8B] text-[#173D2B]" : "border-[#C9AE8B]/60"}`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-xs font-medium">{a.name}</span>
                              </div>
                              <span className={`text-[11px] font-mono font-semibold ${isSelected ? "text-[#C9AE8B]" : "text-[#315640]"}`}>
                                {a.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* ========================================================
                  RIGHT COLUMN: Live Summary Ticket & Preview (5 cols)
                 ======================================================== */}
              <div className="lg:col-span-5 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-5 space-y-4 shadow-md sticky top-0">
                
                {/* Photo Preview */}
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-[#E5DACB] bg-[#173D2B]">
                  <img
                    src={activeProduct.image_url || activeProduct.image || activeProduct.imageUrl}
                    alt={activeProduct.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] font-mono text-[9px] font-bold uppercase tracking-wider">
                      {activeProduct.category_name || activeProduct.category || "Reserve Bar"}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <p className="font-serif text-base font-bold truncate">
                      {activeProduct.name}
                    </p>
                  </div>
                </div>

                {/* Formulation Summary */}
                <div className="space-y-2 pt-1 border-t border-[#E5DACB]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#573B2C]">
                      Order Specification
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Live Recipe
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-[#573B2C] bg-white/80 p-3 rounded-xl border border-[#E5DACB]/60">
                    {!isBakery ? (
                      <>
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <strong className="text-[#173D2B]">{size}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Temperature:</span>
                          <strong className="text-[#173D2B]">{temperature}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Milk:</span>
                          <strong className="text-[#173D2B]">{milk}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Sweetness:</span>
                          <strong className="text-[#173D2B]">{sweetness}%</strong>
                        </div>
                        {extraShots > 0 && (
                          <div className="flex justify-between text-amber-900 font-semibold">
                            <span>Espresso Shots:</span>
                            <span>+{extraShots} Shot{extraShots > 1 ? "s" : ""}</span>
                          </div>
                        )}
                        {toppings.length > 0 && (
                          <div className="flex justify-between text-[#315640] font-semibold">
                            <span>Toppings:</span>
                            <span className="truncate max-w-[140px] text-right">
                              {toppings.map((id) => TOPPINGS.find((t) => t.id === id)?.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Serving:</span>
                          <strong className="text-[#173D2B]">{warming}</strong>
                        </div>
                        {addOns.length > 0 && (
                          <div className="flex justify-between text-[#315640] font-semibold">
                            <span>Add-ons:</span>
                            <span className="truncate max-w-[140px] text-right">
                              {addOns.map((id) => PASTRY_ADDONS.find((a) => a.id === id)?.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Quantity and Price */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Qty
                    </span>
                    <div className="flex items-center rounded-xl border border-[#E5DACB] bg-white overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="px-2.5 py-1.5 hover:bg-[#F5F0E7] text-[#173D2B] transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-mono font-bold text-[#173D2B]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        className="px-2.5 py-1.5 hover:bg-[#F5F0E7] text-[#173D2B] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                      Total Price
                    </p>
                    <p className="font-serif text-2xl font-bold text-[#173D2B]">
                      ₱{totalPrice}
                    </p>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  ref={submitButtonRef}
                  type="button"
                  onClick={handleSave}
                  className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isEditMode ? (
                    <>
                      <Check className="w-4 h-4 text-[#C9AE8B]" />
                      <span>Update in Order Bag • ₱{totalPrice}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />
                      <span>Add to Order Bag • ₱{totalPrice}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#573B2C] pt-1">
                  <ShieldCheck className="w-3 h-3 text-[#315640]" />
                  <span>Customized &amp; pulled fresh upon barista dispatch</span>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
