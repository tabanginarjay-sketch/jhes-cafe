"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ShoppingBag,
  Sparkles,
  Flame,
  Snowflake,
  Coffee,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Cake,
  Cookie,
  Utensils,
  MapPin,
  FlameKindling,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";
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
import {
  CENTRALIZED_CATALOG,
  getProductImage,
  getCanonicalProduct,
  resolveCanonicalSlug,
  CatalogProduct,
} from "@/lib/productRegistry";

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { addItem, isAddingToCart } = useCart();
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  // 1. Initial product resolution from centralized registry
  const canonical = getCanonicalProduct(slug);
  const [product, setProduct] = useState<CatalogProduct>(() => {
    return (
      canonical ||
      CENTRALIZED_CATALOG[0] || {
        id: `prod-${slug}`,
        name: slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        slug,
        category_name: "Signature Espresso",
        product_type: "coffee",
        price: 220,
        origin: "Tagaytay Ridge, Cavite",
        roast_level: "Medium Dark",
        tasting_notes: "Artisanal roast profile with rich caramel and nutty finish.",
        is_available: true,
        tag: "Artisanal",
        image_url:
          "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
      }
    );
  });

  const [liveCatalog, setLiveCatalog] = useState<CatalogProduct[]>(CENTRALIZED_CATALOG);

  // 2. Fetch live updates if available from backend
  useEffect(() => {
    async function checkLiveCatalog() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`, { cache: "no-store" });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setLiveCatalog(list);
            const targetCanonical = resolveCanonicalSlug(slug);
            const match = list.find(
              (p: any) =>
                p.slug === slug ||
                p.slug === targetCanonical ||
                p.id === slug ||
                resolveCanonicalSlug(p.name) === targetCanonical
            );
            if (match) {
              setProduct((prev) => ({
                ...prev,
                ...match,
                price: Number(match.price) || prev.price,
                is_available: match.is_available !== false,
                image_url: getProductImage(match),
              }));
            }
          }
        }
      } catch {
        // Keep static canonical data
      }
    }
    void checkLiveCatalog();
  }, [slug]);

  // 3. Strict product customization rules
  const rules = useMemo(() => {
    return getProductCustomizationRules(product);
  }, [product]);

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
  const [isAdded, setIsAdded] = useState(false);

  // Initialize defaults according to rules (Standard Grande size = delta 0)
  useEffect(() => {
    setSize(getDefaultSize(rules));
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
  }, [rules]);

  // Accurate dynamic price calculation
  let calculatedUnitPrice = product.price;

  if (rules.allowsSize) {
    const sizeObj = rules.supportedSizes.find((s) => s.name === size);
    if (sizeObj) calculatedUnitPrice += sizeObj.delta;
  }

  if (rules.allowsMilk) {
    const milkObj = rules.supportedMilks.find((m) => m.name === milk);
    if (milkObj) calculatedUnitPrice += milkObj.delta;
  }

  if (rules.allowsExtraShots) {
    const shotObj = EXTRA_SHOTS.find((s) => s.count === extraShots);
    if (shotObj) calculatedUnitPrice += shotObj.delta;
  }

  if (rules.allowsDrinkToppings) {
    const toppingsFee = toppings.reduce((acc, tId) => {
      const t = rules.supportedDrinkToppings.find((item) => item.id === tId);
      return acc + (t ? t.delta : 0);
    }, 0);
    calculatedUnitPrice += toppingsFee;
  }

  if (rules.allowsCakeOptions) {
    const cakeFee = cakeFinishes.reduce((acc, fId) => {
      const f = CAKE_FINISHES.find((item) => item.id === fId);
      return acc + (f ? f.delta : 0);
    }, 0);
    calculatedUnitPrice += cakeFee;
  }

  if (rules.allowsDoughnutOptions) {
    const glazeObj = DOUGHNUT_GLAZES.find((g) => g.id === doughnutGlaze);
    if (glazeObj) calculatedUnitPrice += glazeObj.delta;
  }

  if (rules.allowsPastryOptions) {
    const pastryFee = pastryAddOns.reduce((acc, aId) => {
      const a = PASTRY_ADDONS.find((item) => item.id === aId);
      return acc + (a ? a.delta : 0);
    }, 0);
    calculatedUnitPrice += pastryFee;
  }

  const totalPrice = calculatedUnitPrice * quantity;
  const resolvedImage = getProductImage(product);

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

  const handleAdd = () => {
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

    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category_name || rules.categoryLabel,
        basePrice: product.price,
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
      addBtnRef.current
    );

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#FFFCF7] text-[#173D2B] pb-24 lg:pb-16">
      {/* 1. Breadcrumbs Navigation */}
      <div className="border-b border-[#E5DACB]/80 bg-[#F5F0E7]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#573B2C]">
            <Link href="/" className="hover:text-[#173D2B] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#C9AE8B]" />
            <Link href="/menu" className="hover:text-[#173D2B] transition-colors">
              Menu
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#C9AE8B]" />
            <span className="text-[#173D2B] font-semibold truncate max-w-[200px] sm:max-w-none">
              {product.name}
            </span>
          </nav>

          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173D2B] hover:text-[#315640] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Menu</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ========================================================
              LEFT COLUMN: Product Details & Customization Options (7 cols)
             ======================================================== */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Header info */}
            <div className="space-y-3 pb-6 border-b border-[#E5DACB]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-[#173D2B] text-[#C9AE8B] text-[10px] font-mono font-bold uppercase tracking-widest">
                  {rules.categoryLabel}
                </span>
                {product.tag && (
                  <span className="px-3 py-1 rounded-full bg-[#E5DACB]/80 text-[#573B2C] text-[10px] font-mono font-bold uppercase tracking-wider">
                    {product.tag}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#173D2B]">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#573B2C] pt-1">
                {product.origin && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C9AE8B]" />
                    <span>{product.origin}</span>
                  </div>
                )}
                {product.roast_level && product.roast_level !== "None" && (
                  <div className="flex items-center gap-1.5">
                    <FlameKindling className="w-3.5 h-3.5 text-[#C9AE8B]" />
                    <span>{product.roast_level}</span>
                  </div>
                )}
              </div>

              {product.tasting_notes && (
                <p className="text-sm text-[#573B2C] leading-relaxed pt-2">
                  {product.tasting_notes}
                </p>
              )}
            </div>

            {/* Customization Options Bar */}
            <div className="space-y-7">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
                <Sparkles className="w-4 h-4 text-[#C9AE8B]" />
                <span>Reserve Formulation Bar</span>
              </div>

              {/* 1. CUP SIZE */}
              {rules.allowsSize && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-[#C9AE8B]" />
                      <span>1. Select Cup Size</span>
                    </label>
                    <span className="text-xs font-mono text-[#573B2C]">
                      Selected: <strong className="text-[#173D2B]">{size}</strong>
                    </span>
                  </div>

                  <div className={`grid gap-3 ${rules.supportedSizes.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {rules.supportedSizes.map((s) => {
                      const isSelected = size === s.name;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => setSize(s.name)}
                          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-2 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <span className={`text-[10px] font-mono uppercase ${isSelected ? "text-[#C9AE8B]" : "text-[#573B2C]/70"}`}>
                            {s.volume}
                          </span>
                          <div className="mt-1.5">
                            <p className="font-serif text-sm sm:text-base font-bold">{s.name.split(" ")[0]}</p>
                            <p className={`text-xs ${isSelected ? "text-white/80" : "text-[#173D2B] font-semibold"}`}>{s.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. TEMPERATURE */}
              {rules.allowsTemperature ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    2. Serving Temperature
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTemperature("Hot")}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                        temperature === "Hot"
                          ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-2 ring-[#C9AE8B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${temperature === "Hot" ? "bg-white/20 text-amber-300" : "bg-amber-50 text-amber-600"}`}>
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-serif text-sm font-bold">Hot Steamed</p>
                        <p className={`text-xs ${temperature === "Hot" ? "text-white/80" : "text-[#573B2C]"}`}>
                          Microfoam at 65°C
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemperature("Iced")}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                        temperature === "Iced"
                          ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-2 ring-[#C9AE8B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${temperature === "Iced" ? "bg-white/20 text-cyan-300" : "bg-cyan-50 text-cyan-600"}`}>
                        <Snowflake className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-serif text-sm font-bold">Highland Iced</p>
                        <p className={`text-xs ${temperature === "Iced" ? "text-white/80" : "text-[#573B2C]"}`}>
                          Poured over crystal ice
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : rules.productType === "cold_brew" ? (
                <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif text-sm font-bold text-cyan-950">Highland Iced Only</p>
                    <p className="text-xs text-cyan-800">
                      18-hour cold steeped. Hot steamed is unavailable for cold brew extractions.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* 3. DAIRY & PLANT MILK */}
              {rules.allowsMilk && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      3. Dairy &amp; Plant Milk
                    </label>
                    <span className="text-xs font-mono text-[#573B2C]">
                      Selected: <strong className="text-[#173D2B]">{milk}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {rules.supportedMilks.map((m) => {
                      const isSelected = milk === m.name;
                      return (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => setMilk(m.name)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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

              {/* 4. SWEETNESS LEVEL */}
              {rules.allowsSweetness && (
                <div className="space-y-2.5 rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold uppercase tracking-wider text-[#173D2B]">
                      4. Sweetness Level
                    </label>
                    <span className="font-mono font-bold text-[#173D2B] bg-white px-3 py-1 rounded-full border border-[#E5DACB]">
                      {sweetness}% Sweetness
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {SWEETNESS_PRESETS.map((preset) => (
                      <button
                        key={preset.level}
                        type="button"
                        onClick={() => setSweetness(preset.level)}
                        className={`py-2 text-center rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
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
                    className="w-full accent-[#173D2B] mt-3 cursor-pointer h-2 bg-[#E5DACB] rounded-lg"
                  />
                </div>
              )}

              {/* 5. EXTRA ESPRESSO SHOTS */}
              {rules.allowsExtraShots && (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    5. Extra Espresso Shots
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {EXTRA_SHOTS.map((s) => {
                      const isSelected = extraShots === s.count;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setExtraShots(s.count)}
                          className={`p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer active:scale-95 ${
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

              {/* 6. ADDITIONAL TOPPINGS */}
              {rules.allowsDrinkToppings && (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    6. Additional Toppings &amp; Syrups
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rules.supportedDrinkToppings.map((t) => {
                      const isSelected = toppings.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToggleTopping(t.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-xs"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
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

              {/* FOOD: DOUGHNUT */}
              {rules.allowsDoughnutOptions && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Glaze &amp; Artisanal Finishes
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DOUGHNUT_GLAZES.map((g) => {
                        const isSelected = doughnutGlaze === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setDoughnutGlaze(g.id)}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                                : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                            }`}
                          >
                            <p className="font-serif text-sm font-bold">{g.name}</p>
                            <span className={`text-xs font-mono font-semibold ${isSelected ? "text-[#C9AE8B]" : "text-[#315640]"}`}>
                              {g.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* FOOD: CAKE */}
              {rules.allowsCakeOptions && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Cake Serving Style
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {CAKE_SERVING_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setServingStyle(opt.name)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                            servingStyle === opt.name
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <p className="font-serif text-sm font-bold">{opt.name}</p>
                          <p className={`text-[10px] mt-0.5 ${servingStyle === opt.name ? "text-white/80" : "text-[#573B2C]"}`}>
                            {opt.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Finishes &amp; Drizzles
                    </label>
                    <div className="space-y-2.5">
                      {CAKE_FINISHES.map((f) => {
                        const isSelected = cakeFinishes.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleToggleCakeFinish(f.id)}
                            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
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

              {/* FOOD: PASTRY */}
              {rules.allowsPastryOptions && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Warming Preference
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {PASTRY_WARMING_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setWarming(opt.name)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                            warming === opt.name
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <p className="font-serif text-sm font-bold">{opt.name.split(" / ")[0]}</p>
                          <p className={`text-[10px] mt-0.5 ${warming === opt.name ? "text-white/80" : "text-[#573B2C]"}`}>
                            {opt.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      Available Dips &amp; Butter
                    </label>
                    <div className="space-y-2.5">
                      {PASTRY_ADDONS.map((a) => {
                        const isSelected = pastryAddOns.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleTogglePastryAddOn(a.id)}
                            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
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

          </div>

          {/* ========================================================
              RIGHT COLUMN: Sticky Product Preview & Order Summary (5 cols)
             ======================================================== */}
          <div className="lg:col-span-5 sticky top-24 space-y-6">
            <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-6 sm:p-8 space-y-6 shadow-md">
              
              {/* Product Photograph Preview */}
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-[#E5DACB] bg-[#173D2B] shadow-inner">
                <img
                  src={resolvedImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] font-mono text-[10px] font-bold uppercase tracking-wider">
                    {rules.categoryLabel}
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="font-serif text-xl font-bold truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-1">
                    {product.tasting_notes}
                  </p>
                </div>
              </div>

              {/* Formulation Specification */}
              <div className="space-y-3 pt-2 border-t border-[#E5DACB]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#573B2C]">
                    Current Specification
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Live Recipe
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-[#573B2C] bg-white/90 p-4 rounded-2xl border border-[#E5DACB]/80 shadow-2xs">
                  {rules.productType === "doughnut" ? (
                    <>
                      <div className="flex justify-between">
                        <span>Finish:</span>
                        <strong className="text-[#173D2B]">
                          {DOUGHNUT_GLAZES.find((g) => g.id === doughnutGlaze)?.name}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Bake Schedule:</span>
                        <strong className="text-[#173D2B]">Daily 6:00 AM Fresh Stone Oven</strong>
                      </div>
                    </>
                  ) : rules.productType === "cake" ? (
                    <>
                      <div className="flex justify-between">
                        <span>Serving:</span>
                        <strong className="text-[#173D2B]">{servingStyle}</strong>
                      </div>
                      {cakeFinishes.length > 0 && (
                        <div className="flex justify-between text-[#315640] font-semibold">
                          <span>Finishes:</span>
                          <span className="truncate max-w-[170px] text-right">
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
                          <span>Dips &amp; Butter:</span>
                          <span className="truncate max-w-[170px] text-right">
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
                          <span>+{extraShots} Extra Shot{extraShots > 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {toppings.length > 0 && (
                        <div className="flex justify-between text-[#315640] font-semibold">
                          <span>Toppings:</span>
                          <span className="truncate max-w-[160px] text-right">
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
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    {rules.productType === "cake" ? "Slice Qty" : "Quantity"}
                  </span>
                  <div className="flex items-center rounded-xl border border-[#E5DACB] bg-white overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="px-3 py-2 hover:bg-[#F5F0E7] text-[#173D2B] transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3.5 text-xs font-mono font-bold text-[#173D2B]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      className="px-3 py-2 hover:bg-[#F5F0E7] text-[#173D2B] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                    Calculated Total
                  </p>
                  <p key={totalPrice} className="font-serif text-3xl font-bold text-[#173D2B] animate-price-bump">
                    ₱{totalPrice}
                  </p>
                </div>
              </div>

              {/* Availability Notice if Sold Out */}
              {product.is_available === false && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium text-center">
                  This item is currently marked unavailable in our live inventory.
                </div>
              )}

              {/* Add to Bag Action Button */}
              <button
                ref={addBtnRef}
                type="button"
                disabled={isAddingToCart || product.is_available === false}
                onClick={handleAdd}
                className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {product.is_available === false ? (
                  <span>Currently Unavailable</span>
                ) : isAdded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Added to Order Bag! • ₱{totalPrice}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />
                    <span>Add to Order Bag • ₱{totalPrice}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#573B2C] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#315640]" />
                <span>Single-origin extraction • Guaranteed freshest roast</span>
              </div>

            </div>
          </div>

        </div>

        {/* Curated Perfect Pairings Section */}
        <section className="mt-16 pt-12 border-t border-[#E5DACB] space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#315640]">
                Barista Recommended
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#173D2B]">
                Pair It With
              </h2>
            </div>
            <Link
              href="/menu"
              className="text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] nav-link-underline"
            >
              Browse Full Menu →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {liveCatalog.filter(
              (p) =>
                p.slug !== product.slug &&
                p.is_available !== false &&
                (["doughnut", "cake", "pastry"].includes(rules.productType)
                  ? !["doughnut", "cake", "pastry"].includes(p.product_type)
                  : ["doughnut", "cake", "pastry"].includes(p.product_type))
            )
              .slice(0, 3)
              .map((pairing) => (
                <Link
                  key={pairing.slug}
                  href={`/menu/${pairing.slug}`}
                  className="group rounded-2xl border border-[#E5DACB] bg-white overflow-hidden hover-card-elevate hover:border-[#C9AE8B] flex flex-col"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-[#173D2B]">
                    <img
                      src={getProductImage(pairing)}
                      alt={pairing.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-[#173D2B]/90 text-[#C9AE8B] text-[9px] font-mono font-bold uppercase tracking-wider">
                      {pairing.category_name}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-bold text-[#173D2B] group-hover:text-[#315640] transition-colors">
                        {pairing.name}
                      </h3>
                      <span className="font-mono text-sm font-bold text-[#173D2B] shrink-0">
                        ₱{pairing.price}
                      </span>
                    </div>
                    <p className="text-xs text-[#573B2C] line-clamp-2">
                      {pairing.tasting_notes}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
