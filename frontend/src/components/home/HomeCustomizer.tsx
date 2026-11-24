"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  Check,
  Coffee,
  Flame,
  Snowflake,
  Sparkles,
  ShoppingBag,
  Utensils,
  Cake,
  Cookie,
  Droplets,
  CupSoda,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import {
  CatalogProduct,
  dedupeAndMergeCatalog,
  getProductImage,
  resolveCanonicalSlug,
} from "@/lib/productRegistry";
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

const CATEGORY_ORDER = [
  "All",
  "Signature Espresso",
  "Cold Brews",
  "Warm Classics",
  "Artisanal Pastries",
];

function getDefaultProduct(catalog: CatalogProduct[]): CatalogProduct | null {
  if (catalog.length === 0) return null;
  return (
    catalog.find((p) => resolveCanonicalSlug(p.slug || p.name) === "spanish-latte-dulce") ||
    catalog[0]
  );
}

export function HomeCustomizer() {
  const { addItem, isAddingToCart } = useCart();

  // Live catalog loaded from Airtable via /api/v1/catalog/products (zero hardcoded product list)
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  // Drink customization state
  const [size, setSize] = useState<string>("Grande 16oz");
  const [temperature, setTemperature] = useState<"Hot" | "Iced">("Hot");
  const [milk, setMilk] = useState<string>("Whole Milk");
  const [sweetness, setSweetness] = useState<number>(50);
  const [extraShots, setExtraShots] = useState<number>(0);
  const [toppings, setToppings] = useState<string[]>([]);

  // Bakery / Pastry / Cake / Doughnut specific state
  const [warming, setWarming] = useState<string>(PASTRY_WARMING_OPTIONS[0].name);
  const [servingStyle, setServingStyle] = useState<string>(CAKE_SERVING_OPTIONS[0].name);
  const [cakeFinishes, setCakeFinishes] = useState<string[]>(["maldon-salt"]);
  const [doughnutGlaze, setDoughnutGlaze] = useState<string>("vanilla-glaze");
  const [pastryAddOns, setPastryAddOns] = useState<string[]>([]);

  // Smooth image crossfade layers (eliminates flash when switching drinks)
  const [displayImage, setDisplayImage] = useState<string>("");
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState<boolean>(true);

  const [isAdded, setIsAdded] = useState<boolean>(false);
  const productImageRef = useRef<HTMLDivElement | null>(null);
  const activeImgRef = useRef<HTMLImageElement | null>(null);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch live Airtable products so prices, availability, origins, and photography always match /menu
  useEffect(() => {
    let active = true;
    async function loadLiveCatalog() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`, { cache: "no-store" });
        const raw = res.ok ? await res.json() : [];
        if (!active) return;
        const merged = dedupeAndMergeCatalog(Array.isArray(raw) ? raw : [], {
          includeMissingCanonical: false,
        }).filter((item) => item.is_available !== false);
        setCatalog(merged);
        setSelectedProduct((curr) => {
          if (curr) {
            const match = merged.find(
              (p) => resolveCanonicalSlug(p.slug || p.name) === resolveCanonicalSlug(curr.slug || curr.name)
            );
            if (match) return match;
          }
          return getDefaultProduct(merged);
        });
      } catch {
        if (!active) return;
        const fallback = dedupeAndMergeCatalog([]).filter((item) => item.is_available !== false);
        setCatalog(fallback);
        setSelectedProduct((curr) => curr || getDefaultProduct(fallback));
      } finally {
        if (active) setIsLoadingCatalog(false);
      }
    }
    void loadLiveCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Derive available categories dynamically from live catalog
  const categories = useMemo(() => {
    const present = new Set(catalog.map((p) => p.category_name).filter(Boolean));
    const ordered = CATEGORY_ORDER.filter((cat) => cat === "All" || present.has(cat));
    present.forEach((cat) => {
      if (!ordered.includes(cat)) ordered.push(cat);
    });
    return ordered;
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") return catalog;
    return catalog.filter((p) => p.category_name === activeCategory);
  }, [catalog, activeCategory]);

  // Deterministic customization rules for the currently selected product
  const rules = useMemo(() => {
    if (!selectedProduct) {
      return getProductCustomizationRules({ product_type: "coffee" });
    }
    return getProductCustomizationRules(selectedProduct);
  }, [selectedProduct]);

  const isFoodItem =
    rules.productType === "cake" ||
    rules.productType === "doughnut" ||
    rules.productType === "pastry";

  // Reset customization defaults cleanly whenever selected product changes
  useEffect(() => {
    if (!selectedProduct) return;
    const nextRules = getProductCustomizationRules(selectedProduct);
    setSize(getDefaultSize(nextRules));
    setTemperature(nextRules.defaultTemperature || "Hot");
    setMilk("Whole Milk");
    setSweetness(50);
    setExtraShots(0);
    setToppings([]);
    setWarming(PASTRY_WARMING_OPTIONS[0].name);
    setServingStyle(CAKE_SERVING_OPTIONS[0].name);
    setCakeFinishes(["maldon-salt"]);
    setDoughnutGlaze("vanilla-glaze");
    setPastryAddOns([]);
  }, [selectedProduct?.slug, selectedProduct?.id]);

  // Accurate canonical product image with crossfade transition
  const resolvedImage = useMemo(() => {
    if (!selectedProduct) return "";
    return getProductImage(selectedProduct);
  }, [selectedProduct]);

  useEffect(() => {
    if (!resolvedImage) return;
    if (!displayImage) {
      setDisplayImage(resolvedImage);
      setImageReady(true);
      return;
    }
    if (resolvedImage === displayImage) return;

    setPreviousImage(displayImage);
    setImageReady(false);
    setDisplayImage(resolvedImage);

    // Ensure cached images still trigger a smooth opacity fade-in on the next animation frame
    const rafId = requestAnimationFrame(() => {
      if (activeImgRef.current?.complete) {
        setImageReady(true);
      }
    });

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setPreviousImage(null);
    }, 620);

    return () => cancelAnimationFrame(rafId);
  }, [resolvedImage, displayImage]);

  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  // Authoritative dynamic price calculation (identical to ProductCustomizerModal & /api/v1/orders)
  const basePrice = Number(selectedProduct?.price) || 0;

  const { currentPrice, customizationDelta } = useMemo(() => {
    if (!selectedProduct) return { currentPrice: 0, customizationDelta: 0 };
    let delta = 0;

    if (rules.allowsSize) {
      const sizeObj = rules.supportedSizes.find((s) => s.name === size);
      if (sizeObj) delta += sizeObj.delta;
    }
    if (rules.allowsMilk) {
      const milkObj = rules.supportedMilks.find((m) => m.name === milk);
      if (milkObj) delta += milkObj.delta;
    }
    if (rules.allowsExtraShots) {
      const shotObj = EXTRA_SHOTS.find((s) => s.count === extraShots);
      if (shotObj) delta += shotObj.delta;
    }
    if (rules.allowsDrinkToppings) {
      for (const tId of toppings) {
        const t = rules.supportedDrinkToppings.find((item) => item.id === tId);
        if (t) delta += t.delta;
      }
    }
    if (rules.allowsCakeOptions) {
      for (const fId of cakeFinishes) {
        const f = CAKE_FINISHES.find((item) => item.id === fId);
        if (f) delta += f.delta;
      }
    }
    if (rules.allowsDoughnutOptions) {
      const g = DOUGHNUT_GLAZES.find((item) => item.id === doughnutGlaze);
      if (g) delta += g.delta;
    }
    if (rules.allowsPastryOptions) {
      for (const aId of pastryAddOns) {
        const a = PASTRY_ADDONS.find((item) => item.id === aId);
        if (a) delta += a.delta;
      }
    }

    return {
      currentPrice: Math.max(50, basePrice + delta),
      customizationDelta: delta,
    };
  }, [
    selectedProduct,
    basePrice,
    rules,
    size,
    milk,
    extraShots,
    toppings,
    cakeFinishes,
    doughnutGlaze,
    pastryAddOns,
  ]);

  const effectiveTemp: "Hot" | "Iced" =
    rules.productType === "cold_brew" ? "Iced" : temperature;

  const activeSweetnessPreset =
    SWEETNESS_PRESETS.find((p) => p.level === sweetness) || SWEETNESS_PRESETS[2];

  // Human-readable customization detail chips for the live preview card
  const previewDetailChips = useMemo(() => {
    if (!selectedProduct) return [];
    const chips: { label: string; value: string }[] = [];

    if (rules.productType === "doughnut") {
      const glazeName =
        DOUGHNUT_GLAZES.find((g) => g.id === doughnutGlaze)?.name || "Vanilla Bean Glaze";
      chips.push({ label: "Glaze", value: glazeName });
      chips.push({ label: "Bake", value: "Daily 6:00 AM Batch" });
      return chips;
    }

    if (rules.productType === "cake") {
      chips.push({ label: "Serving", value: servingStyle });
      const finishes = cakeFinishes
        .map((id) => CAKE_FINISHES.find((f) => f.id === id)?.name)
        .filter(Boolean) as string[];
      if (finishes.length > 0) {
        chips.push({ label: "Finishes", value: finishes.join(", ") });
      }
      return chips;
    }

    if (rules.productType === "pastry") {
      chips.push({ label: "Warming", value: warming.split(" / ")[0] });
      const dips = pastryAddOns
        .map((id) => PASTRY_ADDONS.find((a) => a.id === id)?.name)
        .filter(Boolean) as string[];
      chips.push({
        label: "Accompaniments",
        value: dips.length > 0 ? dips.join(", ") : "Classic Unaccompanied",
      });
      return chips;
    }

    if (rules.allowsSize) chips.push({ label: "Size", value: size });
    if (rules.allowsTemperature || rules.productType === "cold_brew") {
      chips.push({
        label: "Preparation",
        value: effectiveTemp === "Hot" ? "Hot Steamed · 65°C" : "Highland Iced",
      });
    }
    if (rules.allowsMilk) chips.push({ label: "Milk", value: milk });
    if (rules.allowsSweetness) {
      chips.push({ label: "Sweetness", value: activeSweetnessPreset.label });
    }
    if (rules.allowsExtraShots && extraShots > 0) {
      chips.push({
        label: "Espresso",
        value: `+${extraShots} Extra Shot${extraShots > 1 ? "s" : ""}`,
      });
    }
    if (rules.allowsDrinkToppings && toppings.length > 0) {
      const names = toppings
        .map((id) => rules.supportedDrinkToppings.find((t) => t.id === id)?.name)
        .filter(Boolean) as string[];
      if (names.length > 0) {
        chips.push({ label: "Finishes", value: names.join(", ") });
      }
    }

    return chips;
  }, [
    selectedProduct,
    rules,
    size,
    effectiveTemp,
    milk,
    activeSweetnessPreset,
    extraShots,
    toppings,
    warming,
    servingStyle,
    cakeFinishes,
    doughnutGlaze,
    pastryAddOns,
  ]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    const nextList = cat === "All" ? catalog : catalog.filter((p) => p.category_name === cat);
    if (
      nextList.length > 0 &&
      (!selectedProduct || !nextList.some((p) => p.slug === selectedProduct.slug))
    ) {
      setSelectedProduct(nextList[0]);
    }
  };

  const toggleItemInList = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleAddToBag = () => {
    if (!selectedProduct || isAddingToCart) return;

    const slug = resolveCanonicalSlug(selectedProduct.slug || selectedProduct.name);
    const canonicalImg = getProductImage(selectedProduct);

    let summaryParts: string[] = [];
    if (rules.productType === "doughnut") {
      const glazeName =
        DOUGHNUT_GLAZES.find((g) => g.id === doughnutGlaze)?.name || "Vanilla Bean Glaze";
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
      const shotLabel =
        rules.allowsExtraShots && extraShots > 0
          ? `+${extraShots} Shot${extraShots > 1 ? "s" : ""}`
          : "";
      const toppingsText = toppings
        .map((id) => rules.supportedDrinkToppings.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      summaryParts = [
        size,
        effectiveTemp,
        milk,
        `${sweetness}% sweet`,
        shotLabel,
        toppingsText,
      ].filter(Boolean);
    }

    const didAdd = addItem(
      {
        productId: selectedProduct.id || slug,
        slug,
        name: selectedProduct.name,
        category: selectedProduct.category_name || rules.categoryLabel,
        basePrice,
        price: currentPrice,
        imageUrl: canonicalImg,
        isBakery: isFoodItem,
        size: rules.allowsSize ? size : undefined,
        temperature:
          rules.allowsTemperature || rules.defaultTemperature ? effectiveTemp : undefined,
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
        customizationSummary: summaryParts.join(" · "),
      },
      1,
      productImageRef.current
    );

    if (didAdd) {
      setIsAdded(true);
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
      addedTimerRef.current = setTimeout(() => setIsAdded(false), 1800);
    }
  };

  return (
    <section
      id="barista-bar"
      aria-labelledby="barista-bar-heading"
      className="relative py-20 lg:py-28 bg-[#F7F1E7] border-t border-[#E4D7C3] overflow-x-clip"
    >
      {/* Subtle warm ambient wood-tone radial highlights */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 14%, rgba(168, 126, 86, 0.12) 0%, transparent 42%), radial-gradient(circle at 88% 82%, rgba(23, 63, 46, 0.08) 0%, transparent 45%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 lg:space-y-12">
        {/* Editorial Café Section Header */}
        <ScrollReveal direction="up" delay={0}>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-3">
                <span className="h-[1.5px] w-8 bg-[#8B5E3C] rounded-full" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8B5E3C]">
                  Interactive Barista Bar
                </span>
              </div>

              <h2
                id="barista-bar-heading"
                className="font-serif text-3xl sm:text-4xl lg:text-[2.85rem] font-bold text-[#173F2E] tracking-tight leading-[1.12]"
              >
                Your Perfect Cup, Your Way.
              </h2>

              <p className="text-sm sm:text-[15px] text-[#553A2B] leading-relaxed max-w-xl">
                Pull up a seat at our tasting counter. Explore small-batch highland roasts, velvety
                plant milks, and stone-oven pastries crafted to your exact preference.
              </p>
            </div>

            {/* Subtle Walnut Roastery Accent Badge */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#FFFCF7]/90 border border-[#DFD1BC] shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#173F2E] text-[#D7BC96] flex items-center justify-center shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#173F2E]">
                  Crafted To Order
                </p>
                <p className="text-[11px] text-[#553A2B]/80">
                  Live pricing &amp; daily roastery menu
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Main Barista Counter Workbench */}
        <ScrollReveal direction="up" delay={100}>
          {isLoadingCatalog && !selectedProduct ? (
            <div className="rounded-[2rem] border border-[#E4D7C3] bg-[#FFFCF7] p-8 sm:p-12 shadow-[0_20px_50px_-24px_rgba(85,58,43,0.18)] grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
              <div className="lg:col-span-7 space-y-6">
                <div className="h-5 w-40 rounded-full bg-[#EFE6D7]" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="h-20 rounded-2xl bg-[#F3EADD]" />
                  ))}
                </div>
                <div className="h-28 rounded-2xl bg-[#F3EADD]" />
                <div className="h-28 rounded-2xl bg-[#F3EADD]" />
              </div>
              <div className="lg:col-span-5">
                <div className="h-[480px] rounded-[1.75rem] bg-[#EFE6D7]" />
              </div>
            </div>
          ) : (
            <div className="relative rounded-[2rem] border border-[#E1D2BC] bg-[#FFFCF7] shadow-[0_24px_60px_-28px_rgba(58,38,26,0.22)] overflow-hidden">
              {/* Warm Walnut Wood Top Inlay Strip */}
              <div
                aria-hidden="true"
                className="h-1.5 w-full bg-gradient-to-r from-[#553A2B] via-[#9E724C] to-[#553A2B]"
              />

              <div className="p-6 sm:p-8 lg:p-11 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-11 items-start">
                {/* ======================================================
                    LEFT COLUMN: Café Menu-Style Customization (7 cols)
                   ====================================================== */}
                <div className="lg:col-span-7 space-y-8">
                  {/* CHAPTER: Drink & Pastry Selection */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B5E3C] block">
                          The Tasting Menu
                        </span>
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#173F2E] mt-0.5">
                          Select Your Creation
                        </h3>
                      </div>

                      {/* Category Filter Pills */}
                      <div
                        role="tablist"
                        aria-label="Filter menu items by category"
                        className="flex flex-wrap gap-1.5"
                      >
                        {categories.map((cat) => {
                          const active = activeCategory === cat;
                          return (
                            <button
                              key={cat}
                              role="tab"
                              aria-selected={active}
                              type="button"
                              onClick={() => handleCategoryChange(cat)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                                active
                                  ? "bg-[#173F2E] text-[#FFFCF7] shadow-xs"
                                  : "bg-[#F7F1E7] text-[#553A2B] hover:bg-[#EDE2D0] border border-[#E6D9C6]"
                              }`}
                            >
                              {cat === "Signature Espresso"
                                ? "Espresso"
                                : cat === "Artisanal Pastries"
                                  ? "Pastries"
                                  : cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Product Selection Menu Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[272px] overflow-y-auto pr-1">
                      {filteredProducts.map((item) => {
                        const isSelected = selectedProduct?.slug === item.slug;
                        const thumbUrl = getProductImage(item);
                        return (
                          <button
                            key={item.slug}
                            type="button"
                            onClick={() => setSelectedProduct(item)}
                            className={`group relative p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex items-center gap-3.5 ${
                              isSelected
                                ? "border-[#173F2E] bg-[#F7F1E7] shadow-[0_10px_24px_-12px_rgba(23,63,46,0.28)] ring-1 ring-[#173F2E]/25"
                                : "border-[#E9DEC9] bg-white hover:border-[#B89068] hover:bg-[#FCF8F1] hover:-translate-y-0.5 hover:shadow-xs"
                            }`}
                          >
                            {/* Accurate Product Thumbnail */}
                            <div
                              className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border transition-colors ${
                                isSelected ? "border-[#8B5E3C]/60" : "border-[#EAE0CF]"
                              } bg-[#173F2E]/10`}
                            >
                              <img
                                src={thumbUrl}
                                alt={item.name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-serif text-sm font-bold text-[#173F2E] leading-snug line-clamp-1 group-hover:text-[#1F533D]">
                                  {item.name}
                                </p>
                                {isSelected && (
                                  <span className="w-4 h-4 rounded-full bg-[#173F2E] text-[#D7BC96] flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#553A2B]/75 truncate mt-0.5">
                                {item.origin}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-semibold text-[#553A2B] tabular-nums">
                                  ₱{item.price}
                                </span>
                                <span className="text-[10px] font-medium text-[#8B5E3C]">
                                  {item.tag}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ====================================================
                      DRINK-ONLY CUSTOMIZATION SECTIONS
                     ==================================================== */}
                  {!isFoodItem && selectedProduct && (
                    <div
                      key={`drink-panel-${selectedProduct.slug}`}
                      className="space-y-7 pt-7 border-t border-[#E9DEC9] animate-fade-in"
                    >
                      {/* Cup Size */}
                      {rules.allowsSize && (
                        <div className="space-y-3">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <h4 className="font-serif text-base font-bold text-[#173F2E] flex items-center gap-2">
                                <CupSoda className="w-4 h-4 text-[#8B5E3C]" />
                                <span>Cup Size</span>
                              </h4>
                            </div>
                            <span className="text-xs text-[#553A2B]/80 font-medium">{size}</span>
                          </div>

                          <div
                            className={`grid gap-3 ${
                              rules.supportedSizes.length === 2 ? "grid-cols-2" : "grid-cols-3"
                            }`}
                          >
                            {rules.supportedSizes.map((s) => {
                              const active = size === s.name;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setSize(s.name)}
                                  className={`p-3.5 rounded-2xl border text-left transition-all duration-250 cursor-pointer flex flex-col justify-between ${
                                    active
                                      ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-md ring-2 ring-[#C9AE8B]/70 -translate-y-0.5"
                                      : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                  }`}
                                >
                                  <span
                                    className={`text-[10px] uppercase tracking-wider font-medium ${
                                      active ? "text-[#D7BC96]" : "text-[#8B5E3C]"
                                    }`}
                                  >
                                    {s.volume}
                                  </span>
                                  <div className="mt-1.5 flex items-baseline justify-between gap-1">
                                    <span className="font-serif text-sm font-bold">
                                      {s.name.split(" ")[0]}
                                    </span>
                                    <span
                                      className={`text-[11px] font-medium tabular-nums ${
                                        active ? "text-[#FFFCF7]/85" : "text-[#173F2E]"
                                      }`}
                                    >
                                      {s.label}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Temperature (Hot / Iced or Chilled Cold Brew Note) */}
                      {rules.allowsTemperature ? (
                        <div className="space-y-3">
                          <h4 className="font-serif text-base font-bold text-[#173F2E]">
                            Serving Temperature
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(["Hot", "Iced"] as const).map((t) => {
                              const active = temperature === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setTemperature(t)}
                                  className={`p-3.5 rounded-2xl border text-left transition-all duration-250 cursor-pointer flex items-center gap-3.5 ${
                                    active
                                      ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-md ring-2 ring-[#C9AE8B]/70"
                                      : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                  }`}
                                >
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                      active
                                        ? "bg-white/15 text-[#E5C99E]"
                                        : t === "Hot"
                                          ? "bg-[#F7F1E7] text-[#9E5A28]"
                                          : "bg-[#EDF5F6] text-[#286C7A]"
                                    }`}
                                  >
                                    {t === "Hot" ? (
                                      <Flame className="w-4 h-4" />
                                    ) : (
                                      <Snowflake className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-serif text-sm font-bold">
                                      {t === "Hot" ? "Hot Steamed" : "Highland Iced"}
                                    </p>
                                    <p
                                      className={`text-[11px] mt-0.5 ${
                                        active ? "text-[#FFFCF7]/75" : "text-[#553A2B]/75"
                                      }`}
                                    >
                                      {t === "Hot"
                                        ? "Silky microfoam at 65°C"
                                        : "Chilled over crystal mountain ice"}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : rules.productType === "cold_brew" ? (
                        <div className="p-4 rounded-2xl bg-[#F7F1E7] border border-[#DFD1BC] flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[#173F2E] text-[#D7BC96] flex items-center justify-center shrink-0">
                            <Snowflake className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-serif text-sm font-bold text-[#173F2E]">
                              Signature Cold Steep — Served Iced
                            </p>
                            <p className="text-xs text-[#553A2B]/80 mt-0.5">
                              Slow-steeped for 18 hours for naturally low acidity and velvety depth.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {/* Milk Selection */}
                      {rules.allowsMilk && (
                        <div className="space-y-3">
                          <div className="flex items-baseline justify-between">
                            <h4 className="font-serif text-base font-bold text-[#173F2E] flex items-center gap-2">
                              <Droplets className="w-4 h-4 text-[#8B5E3C]" />
                              <span>Milk Selection</span>
                            </h4>
                            <span className="text-xs text-[#553A2B]/80 font-medium">{milk}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {rules.supportedMilks.map((m) => {
                              const active = milk === m.name;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setMilk(m.name)}
                                  className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                    active
                                      ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-sm ring-1 ring-[#C9AE8B]"
                                      : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-serif text-xs sm:text-[13px] font-bold truncate">
                                      {m.name.replace(" Milk", "")}
                                    </span>
                                    <span
                                      className={`text-[10px] font-semibold tabular-nums shrink-0 ${
                                        active ? "text-[#D7BC96]" : "text-[#8B5E3C]"
                                      }`}
                                    >
                                      {m.label}
                                    </span>
                                  </div>
                                  {m.sub && (
                                    <p
                                      className={`text-[10px] mt-1 line-clamp-1 ${
                                        active ? "text-[#FFFCF7]/75" : "text-[#553A2B]/70"
                                      }`}
                                    >
                                      {m.sub}
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sweetness Calibration */}
                      {rules.allowsSweetness && (
                        <div className="rounded-2xl border border-[#E5D8C5] bg-[#F7F1E7]/75 p-4 sm:p-5 space-y-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-serif text-base font-bold text-[#173F2E]">
                              Sweetness Level
                            </h4>
                            <span className="text-xs font-semibold text-[#173F2E] bg-[#FFFCF7] px-3 py-1 rounded-full border border-[#DFD1BC] shadow-2xs">
                              {activeSweetnessPreset.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-5 gap-2">
                            {SWEETNESS_PRESETS.map((preset) => {
                              const active = sweetness === preset.level;
                              return (
                                <button
                                  key={preset.level}
                                  type="button"
                                  onClick={() => setSweetness(preset.level)}
                                  className={`py-2 rounded-xl border text-xs font-semibold tabular-nums transition-all duration-200 cursor-pointer ${
                                    active
                                      ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-xs"
                                      : "bg-[#FFFCF7] text-[#553A2B] border-[#E5D8C5] hover:border-[#9E724C]"
                                  }`}
                                >
                                  {preset.level}%
                                </button>
                              );
                            })}
                          </div>

                          <input
                            type="range"
                            aria-label="Sweetness level percentage"
                            min="0"
                            max="100"
                            step="25"
                            value={sweetness}
                            onChange={(e) => setSweetness(Number(e.target.value))}
                            className="w-full accent-[#173F2E] cursor-pointer h-1.5 bg-[#DFD1BC] rounded-lg"
                          />
                        </div>
                      )}

                      {/* Espresso Shots (Coffee Only) */}
                      {rules.allowsExtraShots && (
                        <div className="space-y-3">
                          <h4 className="font-serif text-base font-bold text-[#173F2E]">
                            Espresso Strength
                          </h4>
                          <div className="grid grid-cols-3 gap-2.5">
                            {EXTRA_SHOTS.map((shot) => {
                              const active = extraShots === shot.count;
                              return (
                                <button
                                  key={shot.id}
                                  type="button"
                                  onClick={() => setExtraShots(shot.count)}
                                  className={`p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                                    active
                                      ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-sm ring-1 ring-[#C9AE8B]"
                                      : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                  }`}
                                >
                                  <p className="font-serif text-xs sm:text-[13px] font-bold">
                                    {shot.name}
                                  </p>
                                  <p
                                    className={`text-[11px] font-medium tabular-nums mt-0.5 ${
                                      active ? "text-[#D7BC96]" : "text-[#8B5E3C]"
                                    }`}
                                  >
                                    {shot.label}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Finishing Touches & Toppings */}
                      {rules.allowsDrinkToppings && (
                        <div className="space-y-3">
                          <div className="flex items-baseline justify-between">
                            <h4 className="font-serif text-base font-bold text-[#173F2E]">
                              Finishing Touches
                            </h4>
                            <span className="text-[11px] text-[#553A2B]/70">Optional add-ons</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {rules.supportedDrinkToppings.map((t) => {
                              const active = toppings.includes(t.id);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => toggleItemInList(t.id, setToppings)}
                                  className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 ${
                                    active
                                      ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-xs"
                                      : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                        active
                                          ? "bg-[#D7BC96] border-[#D7BC96] text-[#173F2E]"
                                          : "border-[#C9AE8B]"
                                      }`}
                                    >
                                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                                    </span>
                                    <span className="text-xs font-medium truncate">{t.name}</span>
                                  </div>
                                  <span
                                    className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                                      active ? "text-[#D7BC96]" : "text-[#8B5E3C]"
                                    }`}
                                  >
                                    {t.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ====================================================
                      BAKERY / PASTRY / CAKE / DOUGHNUT SECTIONS
                      (Strictly hides coffee temperature, size, milk & sweetness)
                     ==================================================== */}
                  {isFoodItem && selectedProduct && (
                    <div
                      key={`food-panel-${selectedProduct.slug}`}
                      className="space-y-7 pt-7 border-t border-[#E9DEC9] animate-fade-in"
                    >
                      {/* Pastry (Croissants) */}
                      {rules.allowsPastryOptions && (
                        <>
                          <div className="space-y-3">
                            <h4 className="font-serif text-base font-bold text-[#173F2E] flex items-center gap-2">
                              <Utensils className="w-4 h-4 text-[#8B5E3C]" />
                              <span>Oven Preparation</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {PASTRY_WARMING_OPTIONS.map((opt) => {
                                const active = warming === opt.name;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setWarming(opt.name)}
                                    className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                                      active
                                        ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-md ring-2 ring-[#C9AE8B]/70"
                                        : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                    }`}
                                  >
                                    <p className="font-serif text-sm font-bold">
                                      {opt.name.split(" / ")[0]}
                                    </p>
                                    <p
                                      className={`text-[11px] mt-1 leading-relaxed ${
                                        active ? "text-[#FFFCF7]/75" : "text-[#553A2B]/75"
                                      }`}
                                    >
                                      {opt.description}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-baseline justify-between">
                              <h4 className="font-serif text-base font-bold text-[#173F2E]">
                                Artisanal Dips &amp; Whipped Butter
                              </h4>
                              <span className="text-[11px] text-[#553A2B]/70">Optional pairings</span>
                            </div>
                            <div className="space-y-2.5">
                              {PASTRY_ADDONS.map((addon) => {
                                const active = pastryAddOns.includes(addon.id);
                                return (
                                  <button
                                    key={addon.id}
                                    type="button"
                                    onClick={() => toggleItemInList(addon.id, setPastryAddOns)}
                                    className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                                      active
                                        ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-xs"
                                        : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                          active
                                            ? "bg-[#D7BC96] border-[#D7BC96] text-[#173F2E]"
                                            : "border-[#C9AE8B]"
                                        }`}
                                      >
                                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                                      </span>
                                      <span className="text-xs font-medium">{addon.name}</span>
                                    </div>
                                    <span
                                      className={`text-xs font-semibold tabular-nums ${
                                        active ? "text-[#D7BC96]" : "text-[#8B5E3C]"
                                      }`}
                                    >
                                      {addon.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Cake (Burnt Basque Cheesecake) */}
                      {rules.allowsCakeOptions && (
                        <>
                          <div className="space-y-3">
                            <h4 className="font-serif text-base font-bold text-[#173F2E] flex items-center gap-2">
                              <Cake className="w-4 h-4 text-[#8B5E3C]" />
                              <span>Serving Style</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {CAKE_SERVING_OPTIONS.map((opt) => {
                                const active = servingStyle === opt.name;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setServingStyle(opt.name)}
                                    className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                                      active
                                        ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-md ring-2 ring-[#C9AE8B]/70"
                                        : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                    }`}
                                  >
                                    <p className="font-serif text-sm font-bold">{opt.name}</p>
                                    <p
                                      className={`text-[11px] mt-1 leading-relaxed ${
                                        active ? "text-[#FFFCF7]/75" : "text-[#553A2B]/75"
                                      }`}
                                    >
                                      {opt.description}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-serif text-base font-bold text-[#173F2E]">
                              Patisserie Finishes &amp; Drizzles
                            </h4>
                            <div className="space-y-2.5">
                              {CAKE_FINISHES.map((finish) => {
                                const active = cakeFinishes.includes(finish.id);
                                return (
                                  <button
                                    key={finish.id}
                                    type="button"
                                    onClick={() => toggleItemInList(finish.id, setCakeFinishes)}
                                    className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                                      active
                                        ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-xs"
                                        : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                          active
                                            ? "bg-[#D7BC96] border-[#D7BC96] text-[#173F2E]"
                                            : "border-[#C9AE8B]"
                                        }`}
                                      >
                                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                                      </span>
                                      <span className="text-xs font-medium">{finish.name}</span>
                                    </div>
                                    <span
                                      className={`text-xs font-semibold tabular-nums ${
                                        active ? "text-[#D7BC96]" : "text-[#8B5E3C]"
                                      }`}
                                    >
                                      {finish.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Doughnut (Handcrafted Brioche Doughnuts) */}
                      {rules.allowsDoughnutOptions && (
                        <div className="space-y-4">
                          <h4 className="font-serif text-base font-bold text-[#173F2E] flex items-center gap-2">
                            <Cookie className="w-4 h-4 text-[#8B5E3C]" />
                            <span>Glaze &amp; Artisanal Finish</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {DOUGHNUT_GLAZES.map((g) => {
                              const active = doughnutGlaze === g.id;
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => setDoughnutGlaze(g.id)}
                                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 ${
                                    active
                                      ? "bg-[#173F2E] text-[#FFFCF7] border-[#173F2E] shadow-md ring-2 ring-[#C9AE8B]/70"
                                      : "border-[#E6D9C6] bg-white text-[#553A2B] hover:border-[#9E724C] hover:bg-[#FCF8F1]"
                                  }`}
                                >
                                  <span className="font-serif text-sm font-bold">{g.name}</span>
                                  <span
                                    className={`text-xs font-semibold tabular-nums shrink-0 ${
                                      active ? "text-[#D7BC96]" : "text-[#8B5E3C]"
                                    }`}
                                  >
                                    {g.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="p-4 rounded-2xl bg-[#F7F1E7] border border-[#DFD1BC] flex items-center gap-3 text-xs text-[#553A2B]">
                            <Sparkles className="w-4 h-4 text-[#8B5E3C] shrink-0" />
                            <span>
                              Hand-rolled brioche baked fresh each morning at 6:00 AM in our
                              Tagaytay stone ovens.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ======================================================
                    RIGHT COLUMN: Large Premium Live Product Preview (5 cols)
                   ====================================================== */}
                {selectedProduct && (
                  <div className="lg:col-span-5 lg:sticky lg:top-28 self-start">
                    <div className="rounded-[1.75rem] border border-[#E0D1BC] bg-[#F7F1E7] overflow-hidden shadow-[0_20px_48px_-22px_rgba(23,63,46,0.24)]">
                      {/* Large Crossfading Hero Photography Stage */}
                      <div
                        ref={productImageRef}
                        data-product-hero-image="true"
                        className="relative w-full aspect-[4/3] min-h-[260px] sm:min-h-[300px] overflow-hidden bg-[#173F2E] group"
                      >
                        {/* Outgoing Image Layer stays visible underneath during crossfade */}
                        {previousImage && (
                          <img
                            src={previousImage}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover object-center opacity-100"
                          />
                        )}

                        {/* Incoming Active Image Layer smoothly crossfades in on top */}
                        {displayImage && (
                          <img
                            ref={activeImgRef}
                            key={displayImage}
                            src={displayImage}
                            alt={selectedProduct.name}
                            onLoad={() => setImageReady(true)}
                            className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 ${
                              imageReady ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]"
                            }`}
                          />
                        )}

                        {/* Soft Editorial Vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#132E22]/85 via-[#132E22]/15 to-transparent pointer-events-none" />

                        {/* Top Floating Pills */}
                        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md bg-[#173F2E]/80 text-[#F7F1E7] border border-[#D7BC96]/35 shadow-sm">
                            {isFoodItem ? (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-[#D7BC96]" />
                                <span>{rules.categoryLabel}</span>
                              </>
                            ) : effectiveTemp === "Hot" ? (
                              <>
                                <Flame className="w-3.5 h-3.5 text-amber-300" />
                                <span>Hot Steamed · 65°C</span>
                              </>
                            ) : (
                              <>
                                <Snowflake className="w-3.5 h-3.5 text-cyan-200" />
                                <span>Highland Iced</span>
                              </>
                            )}
                          </span>

                          {!isFoodItem && rules.allowsSize && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md bg-[#553A2B]/80 text-[#F7F1E7] border border-[#D7BC96]/30 shadow-sm">
                              {size.split(" ")[0]}
                            </span>
                          )}
                        </div>

                        {/* Bottom Provenance Strip */}
                        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3 text-[#FFFCF7] pointer-events-none">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#DEC5A2] font-semibold">
                              {selectedProduct.origin}
                            </p>
                            <p className="text-xs text-[#FFFCF7]/90 mt-0.5">
                              {selectedProduct.roast_level}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#D7BC96] text-[#173F2E] shadow-xs shrink-0">
                            {selectedProduct.tag}
                          </span>
                        </div>
                      </div>

                      {/* Preview Details Body */}
                      <div className="p-6 sm:p-7 space-y-5">
                        {/* Name & Description */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B5E3C] block">
                            {selectedProduct.category_name}
                          </span>
                          <h3 className="font-serif text-2xl sm:text-[1.65rem] font-bold text-[#173F2E] leading-tight">
                            {selectedProduct.name}
                          </h3>
                          <p className="text-xs sm:text-[13px] text-[#553A2B] leading-relaxed">
                            {selectedProduct.tasting_notes}
                          </p>
                        </div>

                        {/* Selected Customizations Summary */}
                        <div className="pt-4 border-t border-[#E2D4BF] space-y-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B5E3C]">
                            Your Craft Selection
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {previewDetailChips.map((chip) => (
                              <div
                                key={`${chip.label}-${chip.value}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFCF7] border border-[#E2D4BF] text-[11px] shadow-2xs transition-all duration-200"
                              >
                                <span className="text-[#8B5E3C] font-medium">{chip.label}:</span>
                                <span className="font-semibold text-[#173F2E]">{chip.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic Price & Add to Bag CTA */}
                        <div className="pt-5 border-t border-[#E2D4BF] flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#553A2B]/75 font-semibold block">
                              Your Total
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span
                                key={currentPrice}
                                className="font-serif text-3xl sm:text-[2rem] font-bold text-[#173F2E] tabular-nums inline-block animate-price-bump"
                              >
                                ₱{currentPrice}
                              </span>
                              {customizationDelta !== 0 && (
                                <span className="text-[11px] text-[#8B5E3C] font-medium tabular-nums">
                                  ({customizationDelta > 0 ? `+₱${customizationDelta}` : `-₱${Math.abs(customizationDelta)}`} custom)
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddToBag}
                            disabled={isAddingToCart}
                            className={`inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full text-xs font-bold uppercase tracking-[0.14em] transition-all duration-300 shadow-[0_10px_24px_-8px_rgba(23,63,46,0.45)] hover:shadow-[0_14px_28px_-8px_rgba(23,63,46,0.55)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
                              isAdded
                                ? "bg-[#255C45] text-[#FFFCF7]"
                                : "bg-[#173F2E] hover:bg-[#20543E] text-[#FFFCF7]"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-4 h-4 text-[#D7BC96]" />
                                <span>Added to Bag</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-4 h-4 text-[#D7BC96]" />
                                <span>Add to Bag</span>
                                <Plus className="w-3.5 h-3.5 text-[#D7BC96]/90 -ml-1" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
