"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Utensils,
  Cake,
  Cookie,
} from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";
import {
  getProductCustomizationRules,
  getDefaultSize,
  SWEETNESS_PRESETS,
  EXTRA_SHOTS,
  CAKE_SERVING_OPTIONS,
  CAKE_FINISHES,
  DOUGHNUT_GLAZES,
  PASTRY_WARMING_OPTIONS,
  PASTRY_ADDONS,
} from "@/lib/productCustomization";
import { getProductImage, getCanonicalProduct } from "@/lib/productRegistry";

export function ProductCustomizerModal() {
  const {
    quickCustomizeProduct,
    setQuickCustomizeProduct,
    activeEditItem,
    setActiveEditItem,
    addItem,
    updateItem,
    isAddingToCart,
  } = useCart();

  const activeProduct = quickCustomizeProduct || activeEditItem;
  const isEditMode = Boolean(activeEditItem);

  // Derive product customization rules deterministically based on product type
  const rules = useMemo(() => {
    if (!activeProduct) return getProductCustomizationRules({ product_type: "coffee" });
    return getProductCustomizationRules(activeProduct);
  }, [activeProduct]);

  const productType = rules.productType;

  // Customization States
  const [size, setSize] = useState<string>("Grande 16oz");
  const [temperature, setTemperature] = useState<"Hot" | "Iced">("Hot");
  const [milk, setMilk] = useState<string>("Whole Milk");
  const [sweetness, setSweetness] = useState<number>(50);
  const [extraShots, setExtraShots] = useState<number>(0);
  const [toppings, setToppings] = useState<string[]>([]);

  // Food / Bakery specific states
  const [warming, setWarming] = useState<string>("Warm & Lightly Toasted");
  const [servingStyle, setServingStyle] = useState<string>("Chilled Flagship Style");
  const [cakeFinishes, setCakeFinishes] = useState<string[]>(["maldon-salt"]);
  const [doughnutGlaze, setDoughnutGlaze] = useState<string>("vanilla-glaze");
  const [pastryAddOns, setPastryAddOns] = useState<string[]>([]);

  const [quantity, setQuantity] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  // Escape key close & scroll lock when modal is open
  useEffect(() => {
    if (!activeProduct) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuickCustomizeProduct(null);
        setActiveEditItem(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProduct, setQuickCustomizeProduct, setActiveEditItem]);

  // Initialize form whenever product or edit item changes
  useEffect(() => {
    if (!activeProduct) return;

    const standardSize = getDefaultSize(rules);

    if (isEditMode && activeEditItem) {
      setSize(activeEditItem.size || standardSize);
      setTemperature(activeEditItem.temperature || (rules.defaultTemperature || "Hot"));
      setMilk(activeEditItem.milk || "Whole Milk");
      setSweetness(activeEditItem.sweetness !== undefined ? activeEditItem.sweetness : 50);
      setExtraShots(activeEditItem.extraShots || 0);
      setToppings(activeEditItem.toppings || []);
      setWarming(activeEditItem.warming || "Warm & Lightly Toasted");
      setServingStyle(activeEditItem.servingStyle || "Chilled Flagship Style");
      setCakeFinishes(activeEditItem.finishes || ["maldon-salt"]);
      setDoughnutGlaze(activeEditItem.addOns?.[0] || "vanilla-glaze");
      setPastryAddOns(activeEditItem.addOns || []);
      setQuantity(activeEditItem.quantity || 1);
    } else {
      // Default initialization according to product rules (Standard Grande size = delta 0)
      setSize(standardSize);
      setTemperature(rules.defaultTemperature || "Hot");
      setMilk("Whole Milk");
      setSweetness(50);
      setExtraShots(0);
      setToppings([]);
      setWarming("Warm & Lightly Toasted");
      setServingStyle("Chilled Flagship Style");
      setCakeFinishes(["maldon-salt"]);
      setDoughnutGlaze("vanilla-glaze");
      setPastryAddOns([]);
      setQuantity(1);
    }
    setValidationError(null);
  }, [activeProduct, isEditMode, activeEditItem, rules]);

  if (!activeProduct) return null;

  // Always resolve true base price so editing a customized cart item never double-counts add-on fees
  const canonicalMatch = getCanonicalProduct(activeProduct.slug || activeProduct.name || activeProduct.id);
  const basePrice = Number(
    isEditMode
      ? activeProduct.basePrice ?? canonicalMatch?.price ?? activeProduct.price
      : activeProduct.basePrice ?? activeProduct.price ?? canonicalMatch?.price
  ) || 200;
  const resolvedImage = getProductImage(activeProduct);

  // Accurate dynamic price calculations
  let calculatedUnitPrice = basePrice;

  // 1. Size fee
  if (rules.allowsSize) {
    const sizeObj = rules.supportedSizes.find((s) => s.name === size);
    if (sizeObj) calculatedUnitPrice += sizeObj.delta;
  }

  // 2. Milk fee
  if (rules.allowsMilk) {
    const milkObj = rules.supportedMilks.find((m) => m.name === milk);
    if (milkObj) calculatedUnitPrice += milkObj.delta;
  }

  // 3. Shots fee
  if (rules.allowsExtraShots) {
    const shotObj = EXTRA_SHOTS.find((s) => s.count === extraShots);
    if (shotObj) calculatedUnitPrice += shotObj.delta;
  }

  // 4. Drink Toppings fee
  if (rules.allowsDrinkToppings) {
    const toppingsFee = toppings.reduce((acc, tId) => {
      const t = rules.supportedDrinkToppings.find((item) => item.id === tId);
      return acc + (t ? t.delta : 0);
    }, 0);
    calculatedUnitPrice += toppingsFee;
  }

  // 5. Cake Finishes fee
  if (rules.allowsCakeOptions) {
    const cakeFee = cakeFinishes.reduce((acc, fId) => {
      const f = CAKE_FINISHES.find((item) => item.id === fId);
      return acc + (f ? f.delta : 0);
    }, 0);
    calculatedUnitPrice += cakeFee;
  }

  // 6. Doughnut Glaze fee
  if (rules.allowsDoughnutOptions) {
    const glazeObj = DOUGHNUT_GLAZES.find((g) => g.id === doughnutGlaze);
    if (glazeObj) calculatedUnitPrice += glazeObj.delta;
  }

  // 7. Pastry Add-ons fee
  if (rules.allowsPastryOptions) {
    const pastryFee = pastryAddOns.reduce((acc, aId) => {
      const a = PASTRY_ADDONS.find((item) => item.id === aId);
      return acc + (a ? a.delta : 0);
    }, 0);
    calculatedUnitPrice += pastryFee;
  }

  const totalPrice = calculatedUnitPrice * quantity;

  // Toggle handlers
  const handleToggleTopping = (toppingId: string) => {
    setToppings((prev) =>
      prev.includes(toppingId) ? prev.filter((id) => id !== toppingId) : [...prev, toppingId]
    );
  };

  const handleToggleCakeFinish = (finishId: string) => {
    setCakeFinishes((prev) =>
      prev.includes(finishId) ? prev.filter((id) => id !== finishId) : [...prev, finishId]
    );
  };

  const handleTogglePastryAddOn = (addOnId: string) => {
    setPastryAddOns((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    );
  };

  const handleClose = () => {
    setQuickCustomizeProduct(null);
    setActiveEditItem(null);
  };

  const handleSave = () => {
    // Validation
    if (rules.allowsSize && !size) {
      setValidationError("Please select a cup size.");
      return;
    }
    if (rules.allowsTemperature && !temperature) {
      setValidationError("Please choose a serving temperature (Hot or Iced).");
      return;
    }
    if (rules.allowsMilk && !milk) {
      setValidationError("Please select a milk preference.");
      return;
    }

    // Build human-friendly recipe summary
    let summaryParts: string[] = [];
    if (rules.productType === "doughnut") {
      const glazeName = DOUGHNUT_GLAZES.find((g) => g.id === doughnutGlaze)?.name || "Vanilla Glazed";
      summaryParts = [glazeName, "Fresh Daily Bake"];
    } else if (rules.productType === "cake") {
      const finishesText = cakeFinishes
        .map((fId) => CAKE_FINISHES.find((f) => f.id === fId)?.name)
        .filter(Boolean)
        .join(", ");
      summaryParts = [servingStyle, finishesText].filter(Boolean);
    } else if (rules.productType === "pastry") {
      const addOnsText = pastryAddOns
        .map((aId) => PASTRY_ADDONS.find((a) => a.id === aId)?.name)
        .filter(Boolean)
        .join(", ");
      summaryParts = [warming, addOnsText].filter(Boolean);
    } else {
      // Drink
      const shotLabel = extraShots > 0 ? `+${extraShots} Shot${extraShots > 1 ? "s" : ""}` : "";
      const toppingsText = toppings
        .map((id) => rules.supportedDrinkToppings.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      summaryParts = [
        size,
        temperature,
        milk,
        `${sweetness}% sweet`,
        shotLabel,
        toppingsText,
      ].filter(Boolean);
    }

    const summary = summaryParts.join(" · ");
    const isFood = ["doughnut", "cake", "pastry"].includes(rules.productType);

    if (isEditMode && activeEditItem) {
      updateItem(activeEditItem.id, {
        basePrice,
        price: calculatedUnitPrice,
        quantity,
        size: rules.allowsSize ? size : undefined,
        temperature: rules.allowsTemperature || rules.defaultTemperature ? temperature : undefined,
        milk: rules.allowsMilk ? milk : undefined,
        sweetness: rules.allowsSweetness ? sweetness : undefined,
        extraShots: rules.allowsExtraShots ? extraShots : undefined,
        toppings: rules.allowsDrinkToppings ? toppings : undefined,
        warming: rules.allowsPastryOptions ? warming : undefined,
        servingStyle: rules.allowsCakeOptions ? servingStyle : undefined,
        finishes: rules.allowsCakeOptions ? cakeFinishes : undefined,
        addOns: rules.allowsDoughnutOptions
          ? [doughnutGlaze]
          : rules.allowsPastryOptions
          ? pastryAddOns
          : undefined,
        customizationSummary: summary,
      });
      handleClose();
    } else {
      addItem(
        {
          productId: activeProduct.id || activeProduct.slug,
          slug: activeProduct.slug || activeProduct.id,
          name: activeProduct.name,
          category: activeProduct.category_name || activeProduct.category || rules.categoryLabel,
          basePrice,
          price: calculatedUnitPrice,
          quantity,
          imageUrl: resolvedImage,
          isBakery: isFood,
          size: rules.allowsSize ? size : undefined,
          temperature: rules.allowsTemperature || rules.defaultTemperature ? temperature : undefined,
          milk: rules.allowsMilk ? milk : undefined,
          sweetness: rules.allowsSweetness ? sweetness : undefined,
          extraShots: rules.allowsExtraShots ? extraShots : undefined,
          toppings: rules.allowsDrinkToppings ? toppings : undefined,
          warming: rules.allowsPastryOptions ? warming : undefined,
          servingStyle: rules.allowsCakeOptions ? servingStyle : undefined,
          finishes: rules.allowsCakeOptions ? cakeFinishes : undefined,
          addOns: rules.allowsDoughnutOptions
            ? [doughnutGlaze]
            : rules.allowsPastryOptions
            ? pastryAddOns
            : undefined,
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
                {rules.productType === "cake" ? (
                  <Cake className="w-4 h-4" />
                ) : rules.productType === "doughnut" ? (
                  <Cookie className="w-4 h-4" />
                ) : rules.productType === "pastry" ? (
                  <Utensils className="w-4 h-4" />
                ) : (
                  <Coffee className="w-4 h-4" />
                )}
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

                {/* 1. CUP SIZE (DRINKS ONLY) */}
                {rules.allowsSize && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-[#C9AE8B]" />
                        <span>Cup Size</span>
                      </label>
                      <span className="text-[11px] font-mono text-[#573B2C]">
                        Selected: <strong className="text-[#173D2B]">{size}</strong>
                      </span>
                    </div>

                    <div className={`grid gap-2.5 ${rules.supportedSizes.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {rules.supportedSizes.map((s) => {
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
                )}

                {/* 2. TEMPERATURE (HOT / ICED) */}
                {rules.allowsTemperature ? (
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Serving Temperature
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
                ) : rules.productType === "cold_brew" ? (
                  /* Cold Brew Locked to Iced */
                  <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                      <Snowflake className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-serif text-xs sm:text-sm font-bold text-cyan-950">Highland Iced Only</p>
                      <p className="text-[10px] text-cyan-800">
                        Slow-steeped for 18 hours over mountain crystal ice. Hot serving is not available.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* 3. DAIRY & PLANT MILK (DRINKS ONLY) */}
                {rules.allowsMilk && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Dairy &amp; Plant Milk
                      </label>
                      <span className="text-[11px] font-mono text-[#573B2C]">
                        Selected: <strong className="text-[#173D2B]">{milk}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {rules.supportedMilks.map((m) => {
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
                            <span className="font-serif text-xs font-bold truncate">
                              {m.name}
                            </span>
                            <span className={`text-[10px] font-mono mt-1 ${isSelected ? "text-[#C9AE8B]" : "text-[#315640] font-semibold"}`}>
                              {m.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. SWEETNESS LEVEL (DRINKS ONLY - NEVER DOUGHNUTS OR CAKES) */}
                {rules.allowsSweetness && (
                  <div className="space-y-2 rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold uppercase tracking-wider text-[#173D2B]">
                        Sweetness Calibration
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
                )}

                {/* 5. EXTRA ESPRESSO SHOTS (COFFEE ONLY - NEVER TEA, MATCHA, CHOCOLATE OR FOOD) */}
                {rules.allowsExtraShots && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Extra Espresso Shots
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {EXTRA_SHOTS.map((s) => {
                        const isSelected = extraShots === s.count;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setExtraShots(s.count)}
                            className={`p-2.5 rounded-2xl border text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                              isSelected
                                ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-2 ring-[#C9AE8B]"
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
                )}

                {/* 6. DRINK TOPPINGS */}
                {rules.allowsDrinkToppings && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Additional Toppings &amp; Syrups
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {rules.supportedDrinkToppings.map((t) => {
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
                )}

                {/* ========================================================
                    FOOD TYPE 1: DOUGHNUTS (Brioche Doughnuts)
                    Rule: Doughnuts must NEVER show sugar level or hot/iced
                   ======================================================== */}
                {rules.allowsDoughnutOptions && (
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Glaze &amp; Artisanal Finishes
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {DOUGHNUT_GLAZES.map((g) => {
                          const isSelected = doughnutGlaze === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setDoughnutGlaze(g.id)}
                              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                              }`}
                            >
                              <div>
                                <p className="font-serif text-xs sm:text-sm font-bold">{g.name}</p>
                              </div>
                              <span className={`text-[11px] font-mono font-semibold ${isSelected ? "text-[#C9AE8B]" : "text-[#315640]"}`}>
                                {g.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-2 text-xs text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Baked fresh every morning at 6:00 AM in our Tagaytay stone ovens.</span>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    FOOD TYPE 2: CAKES (Cheesecake)
                    Rule: Cheesecake must NEVER show cup sizes or milk preferences
                   ======================================================== */}
                {rules.allowsCakeOptions && (
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Cake Serving Style
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {CAKE_SERVING_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setServingStyle(opt.name)}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              servingStyle === opt.name
                                ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                                : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                            }`}
                          >
                            <p className="font-serif text-xs sm:text-sm font-bold">{opt.name}</p>
                            <p className={`text-[10px] mt-0.5 ${servingStyle === opt.name ? "text-white/80" : "text-[#573B2C]"}`}>
                              {opt.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Artisanal Finishes &amp; Drizzles
                      </label>
                      <div className="space-y-2">
                        {CAKE_FINISHES.map((f) => {
                          const isSelected = cakeFinishes.includes(f.id);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleToggleCakeFinish(f.id)}
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
                                <span className="text-xs font-medium">{f.name}</span>
                              </div>
                              <span className={`text-[11px] font-mono font-semibold ${isSelected ? "text-[#C9AE8B]" : "text-[#315640]"}`}>
                                {f.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    FOOD TYPE 3: PASTRIES (Croissants)
                   ======================================================== */}
                {rules.allowsPastryOptions && (
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Warming Preference
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {PASTRY_WARMING_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setWarming(opt.name)}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              warming === opt.name
                                ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                                : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                            }`}
                          >
                            <p className="font-serif text-xs sm:text-sm font-bold">{opt.name.split(" / ")[0]}</p>
                            <p className={`text-[10px] mt-0.5 ${warming === opt.name ? "text-white/80" : "text-[#573B2C]"}`}>
                              {opt.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                        Available Dips &amp; Butter
                      </label>
                      <div className="space-y-2">
                        {PASTRY_ADDONS.map((a) => {
                          const isSelected = pastryAddOns.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleTogglePastryAddOn(a.id)}
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
                
                {/* Photo Preview - Always Deterministic and High-Res */}
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-[#E5DACB] bg-[#173D2B]">
                  <img
                    src={resolvedImage}
                    alt={activeProduct.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] font-mono text-[9px] font-bold uppercase tracking-wider">
                      {rules.categoryLabel}
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
                    {rules.productType === "doughnut" ? (
                      <>
                        <div className="flex justify-between">
                          <span>Finish:</span>
                          <strong className="text-[#173D2B]">
                            {DOUGHNUT_GLAZES.find((g) => g.id === doughnutGlaze)?.name}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Serving:</span>
                          <strong className="text-[#173D2B]">Daily 6:00 AM Fresh Bake</strong>
                        </div>
                      </>
                    ) : rules.productType === "cake" ? (
                      <>
                        <div className="flex justify-between">
                          <span>Serving Style:</span>
                          <strong className="text-[#173D2B]">{servingStyle}</strong>
                        </div>
                        {cakeFinishes.length > 0 && (
                          <div className="flex justify-between text-[#315640] font-semibold">
                            <span>Finishes:</span>
                            <span className="truncate max-w-[140px] text-right">
                              {cakeFinishes.map((fId) => CAKE_FINISHES.find((f) => f.id === fId)?.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </>
                    ) : rules.productType === "pastry" ? (
                      <>
                        <div className="flex justify-between">
                          <span>Serving:</span>
                          <strong className="text-[#173D2B]">{warming}</strong>
                        </div>
                        {pastryAddOns.length > 0 && (
                          <div className="flex justify-between text-[#315640] font-semibold">
                            <span>Add-ons:</span>
                            <span className="truncate max-w-[140px] text-right">
                              {pastryAddOns.map((id) => PASTRY_ADDONS.find((a) => a.id === id)?.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {rules.allowsSize && (
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <strong className="text-[#173D2B]">{size}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Temperature:</span>
                          <strong className="text-[#173D2B]">
                            {rules.allowsTemperature ? temperature : "Highland Iced"}
                          </strong>
                        </div>
                        {rules.allowsMilk && (
                          <div className="flex justify-between">
                            <span>Milk:</span>
                            <strong className="text-[#173D2B]">{milk}</strong>
                          </div>
                        )}
                        {rules.allowsSweetness && (
                          <div className="flex justify-between">
                            <span>Sweetness:</span>
                            <strong className="text-[#173D2B]">{sweetness}%</strong>
                          </div>
                        )}
                        {rules.allowsExtraShots && extraShots > 0 && (
                          <div className="flex justify-between text-amber-900 font-semibold">
                            <span>Espresso Shots:</span>
                            <span>+{extraShots} Shot{extraShots > 1 ? "s" : ""}</span>
                          </div>
                        )}
                        {toppings.length > 0 && (
                          <div className="flex justify-between text-[#315640] font-semibold">
                            <span>Toppings:</span>
                            <span className="truncate max-w-[140px] text-right">
                              {toppings.map((id) => rules.supportedDrinkToppings.find((t) => t.id === id)?.name).join(", ")}
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
                    <p key={totalPrice} className="font-serif text-2xl font-bold text-[#173D2B] animate-price-bump">
                      ₱{totalPrice}
                    </p>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  ref={submitButtonRef}
                  type="button"
                  disabled={isAddingToCart}
                  onClick={handleSave}
                  className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
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
