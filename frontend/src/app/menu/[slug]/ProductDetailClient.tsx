"use client";

import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
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
    notes: "Heavy body, charred oak, caramelized jackfruit zest, and candied lemon twist.",
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
    notes: "Spiced condensed milk, double ristretto, and Ceylon cinnamon bark dusting.",
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
    notes: "Dense salted vanilla cream cap, 18-hr steeped slow drip, and dark cacao finish.",
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
    notes: "Wild Tagaytay mountain honey, flaky sea salt froth, and steamed velvety milk.",
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
    notes: "Caramelized charred crown, molten cream cheese center, and Maldon sea salt flakes.",
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
    notes: "72-layer laminated French butter pastry with garden rosemary infusion.",
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
    isBakery: true,
  },
};

const SIZES = [
  { name: "Tall 12oz", volume: "355 ml", delta: -20, label: "-₱20" },
  { name: "Grande 16oz", volume: "473 ml", delta: 0, label: "Standard" },
  { name: "Venti 20oz", volume: "591 ml", delta: 30, label: "+₱30" },
];

const MILKS = [
  { name: "Whole Milk", sub: "Fresh Whole Dairy Milk", delta: 0, priceLabel: "Included" },
  { name: "Barista Oat Milk", sub: "Organic Oat Milk, Naturally Sweet", delta: 40, priceLabel: "+₱40" },
  { name: "Roasted Almond Milk", sub: "Light & Nutty Roasted Profile", delta: 40, priceLabel: "+₱40" },
  { name: "Pure Coconut Milk", sub: "Silky Tropical Velvety Froth", delta: 40, priceLabel: "+₱40" },
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
  { id: "ceylon-cinnamon", name: "Ceylon Cinnamon Dusting", delta: 0, label: "Complimentary" },
  { id: "caramel-crunch", name: "Brown Sugar Caramel Crunch", delta: 35, label: "+₱35" },
];

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

  // Customization states
  const [size, setSize] = useState("Grande 16oz");
  const [temp, setTemp] = useState<"Hot" | "Iced">("Hot");
  const [milk, setMilk] = useState("Whole Milk");
  const [sweetness, setSweetness] = useState(50);
  const [extraShots, setExtraShots] = useState(0);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [pastryHeating, setPastryHeating] = useState<"Warm & Toasted" | "Room Temperature">("Warm & Toasted");
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  // Live catalog check fallback
  useEffect(() => {
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
              isBakery: match.category_name?.toLowerCase().includes("pastr") || match.category_name?.toLowerCase().includes("bake"),
            });
          }
        }
      } catch {
        // Keep initial static dictionary
      }
    }
    void checkLiveCatalog();
  }, [slug]);

  // Price calculations
  const sizeFee = SIZES.find((s) => s.name === size)?.delta || 0;
  const milkFee = MILKS.find((m) => m.name === milk)?.delta || 0;
  const shotsFee = EXTRA_SHOTS.find((s) => s.count === extraShots)?.delta || 0;
  const toppingsFee = selectedToppings.reduce((acc, tId) => {
    const item = TOPPINGS.find((t) => t.id === tId);
    return acc + (item ? item.delta : 0);
  }, 0);

  const unitPrice = product.isBakery
    ? product.basePrice
    : Math.max(100, product.basePrice + sizeFee + milkFee + shotsFee + toppingsFee);

  const totalPrice = unitPrice * quantity;

  // Toggle toppings
  const handleToggleTopping = (toppingId: string) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingId) ? prev.filter((id) => id !== toppingId) : [...prev, toppingId]
    );
  };

  // Add to order bag
  const handleAdd = () => {
    const toppingsSummary = selectedToppings
      .map((id) => TOPPINGS.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    const shotLabel = extraShots > 0 ? `+${extraShots} Shot${extraShots > 1 ? "s" : ""}` : "";
    const customSummary = product.isBakery
      ? pastryHeating
      : [size, temp, milk, `${sweetness}% sweet`, shotLabel, toppingsSummary].filter(Boolean).join(" · ");

    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        price: unitPrice,
        quantity,
        size: product.isBakery ? undefined : size,
        temperature: product.isBakery ? undefined : temp,
        milk: product.isBakery ? undefined : milk,
        sweetness: product.isBakery ? undefined : sweetness,
        extraShots: product.isBakery ? undefined : extraShots,
        toppings: product.isBakery ? undefined : selectedToppings,
        warming: product.isBakery ? pastryHeating : undefined,
        customizationSummary: customSummary,
        imageUrl: product.imageUrl,
        isBakery: product.isBakery,
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
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#173D2B]/10 text-[#173D2B] font-mono text-[11px] font-bold uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="text-xs text-[#573B2C] font-mono">
                  • {product.origin}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#173D2B]">
                {product.name}
              </h1>

              <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
                {product.notes}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-[#F5F0E7] border border-[#E5DACB] text-[#573B2C]">
                  Roast Profile: <strong className="text-[#173D2B]">{product.roast}</strong>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Handcrafted Daily at Tagaytay Ridge</span>
                </div>
              </div>
            </div>

            {/* CUSTOMIZATION OPTIONS */}
            {!product.isBakery ? (
              <div className="space-y-8">
                
                {/* 1. CUP SIZE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-[#C9AE8B]" />
                      <span>1. Cup Size</span>
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#573B2C]">
                      Selected: <strong className="text-[#173D2B]">{size}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {SIZES.map((s) => {
                      const isSelected = size === s.name;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => setSize(s.name)}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640] hover:shadow-xs"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-mono font-bold tracking-wider ${isSelected ? "text-[#C9AE8B]" : "text-[#573B2C]/70"}`}>
                              {s.volume}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#C9AE8B]" />}
                          </div>
                          <div className="mt-2">
                            <p className="font-serif text-sm sm:text-base font-bold leading-tight">
                              {s.name.split(" ")[0]}
                            </p>
                            <p className={`text-xs mt-0.5 font-medium ${isSelected ? "text-white/80" : "text-[#173D2B]"}`}>
                              {s.label}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. TEMPERATURE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center gap-2">
                      {temp === "Hot" ? <Flame className="w-4 h-4 text-amber-600" /> : <Snowflake className="w-4 h-4 text-cyan-600" />}
                      <span>2. Temperature</span>
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#573B2C]">
                      Serving: <strong className="text-[#173D2B]">{temp}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTemp("Hot")}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                        temp === "Hot"
                          ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640] hover:shadow-xs"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${temp === "Hot" ? "bg-white/15 text-amber-300" : "bg-amber-50 text-amber-600"}`}>
                        <Flame className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-serif text-sm sm:text-base font-bold">Hot Steamed</p>
                          {temp === "Hot" && <Check className="w-4 h-4 text-[#C9AE8B]" />}
                        </div>
                        <p className={`text-xs truncate ${temp === "Hot" ? "text-white/80" : "text-[#573B2C]"}`}>
                          Velvety microfoam at 65°C
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemp("Iced")}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                        temp === "Iced"
                          ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                          : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640] hover:shadow-xs"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${temp === "Iced" ? "bg-white/15 text-cyan-300" : "bg-cyan-50 text-cyan-700"}`}>
                        <Snowflake className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-serif text-sm sm:text-base font-bold">Highland Iced</p>
                          {temp === "Iced" && <Check className="w-4 h-4 text-[#C9AE8B]" />}
                        </div>
                        <p className={`text-xs truncate ${temp === "Iced" ? "text-white/80" : "text-[#573B2C]"}`}>
                          Poured over crystal mountain ice
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. DAIRY & PLANT MILK */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#C9AE8B]" />
                      <span>3. Dairy &amp; Plant Milk</span>
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#573B2C]">
                      Selected: <strong className="text-[#173D2B]">{milk}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MILKS.map((m) => {
                      const isSelected = milk === m.name;
                      return (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => setMilk(m.name)}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640] hover:shadow-xs"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-serif text-sm font-bold">
                              {m.name}
                            </span>
                            <span className={`text-[11px] font-mono font-semibold ${isSelected ? "text-[#C9AE8B]" : "text-[#315640]"}`}>
                              {m.priceLabel}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-1 ${isSelected ? "text-white/70" : "text-[#573B2C]/80"}`}>
                            {m.sub}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. SWEETNESS LEVEL */}
                <div className="space-y-3 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      4. Sweetness Level
                    </label>
                    <span className="text-xs font-mono font-bold text-[#173D2B] bg-white px-2.5 py-1 rounded-full border border-[#E5DACB]">
                      {sweetness}% Sweetness
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {SWEETNESS_PRESETS.map((preset) => {
                      const isSelected = sweetness === preset.level;
                      return (
                        <button
                          key={preset.level}
                          type="button"
                          onClick={() => setSweetness(preset.level)}
                          className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-xs"
                              : "bg-white text-[#573B2C] border-[#E5DACB] hover:border-[#315640]"
                          }`}
                        >
                          <span className="block font-mono">{preset.level}%</span>
                          <span className="hidden sm:block text-[9px] opacity-75 font-normal">
                            {preset.level === 0 ? "Zero" : preset.level === 50 ? "Balanced" : preset.level === 100 ? "Extra" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Interactive Slider */}
                  <div className="pt-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="25"
                      value={sweetness}
                      onChange={(e) => setSweetness(Number(e.target.value))}
                      className="w-full accent-[#173D2B] cursor-pointer h-2 bg-[#E5DACB] rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-[#573B2C] font-mono mt-1">
                      <span>Unsweetened (0%)</span>
                      <span>House Standard (50%)</span>
                      <span>Extra Sweet (100%)</span>
                    </div>
                  </div>
                </div>

                {/* 5. EXTRA ESPRESSO SHOTS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      5. Extra Espresso Shots
                    </label>
                    <span className="text-xs font-mono font-semibold text-[#573B2C]">
                      {extraShots === 0 ? "Standard Double Ristretto" : `+${extraShots} Extra Shot${extraShots > 1 ? "s" : ""}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {EXTRA_SHOTS.map((s) => {
                      const isSelected = extraShots === s.count;
                      return (
                        <button
                          key={s.count}
                          type="button"
                          onClick={() => setExtraShots(s.count)}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <p className="font-serif text-xs sm:text-sm font-bold">
                            {s.name}
                          </p>
                          <p className={`text-[11px] font-mono mt-0.5 ${isSelected ? "text-[#C9AE8B]" : "text-[#315640] font-semibold"}`}>
                            {s.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. ADDITIONAL TOPPINGS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                      6. Additional Toppings &amp; Finishes
                    </label>
                    <span className="text-[11px] text-[#573B2C] font-mono">
                      (Optional · Choose any)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TOPPINGS.map((t) => {
                      const isSelected = selectedToppings.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToggleTopping(t.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm ring-1 ring-[#C9AE8B]"
                              : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? "bg-[#C9AE8B] border-[#C9AE8B] text-[#173D2B]" : "border-[#C9AE8B]/60 bg-transparent"}`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-medium truncate">
                              {t.name}
                            </span>
                          </div>
                          <span className={`text-[11px] font-mono font-semibold shrink-0 ml-2 ${isSelected ? "text-[#C9AE8B]" : "text-[#315640]"}`}>
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              /* Pastry Specific Options */
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    Serving Preparation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["Warm & Toasted", "Room Temperature"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPastryHeating(mode)}
                        className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                          pastryHeating === mode
                            ? "bg-[#173D2B] text-white border-[#173D2B] shadow-md ring-2 ring-[#C9AE8B]"
                            : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#315640]"
                        }`}
                      >
                        <p className="font-serif text-sm font-bold">{mode}</p>
                        <p className={`text-[11px] mt-0.5 ${pastryHeating === mode ? "text-white/80" : "text-[#573B2C]"}`}>
                          {mode === "Warm & Toasted" ? "Freshly warmed in stone deck" : "Original flaky texture"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F5F0E7] border border-[#E5DACB] text-xs space-y-1">
                  <p className="font-bold text-[#173D2B] flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-[#C9AE8B]" />
                    <span>Barista Recommended Pairing:</span>
                  </p>
                  <p className="text-[#573B2C]">
                    Best enjoyed alongside our double-ristretto <strong>Spanish Latte Dulce</strong> or <strong>Barako Espresso Romano</strong>.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* ========================================================
              RIGHT COLUMN: Sticky Product Preview & Order Summary (5 cols)
             ======================================================== */}
          <div className="lg:col-span-5 sticky top-28 space-y-6 self-start">
            
            <div className="rounded-3xl border border-[#E5DACB] bg-[#FFFCF7] p-6 shadow-xl space-y-6">
              
              {/* Product Photograph Stage */}
              <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-[#E5DACB] bg-[#173D2B] shadow-inner group">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* Floating Temperature / Category Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] font-mono text-[10px] font-bold uppercase tracking-wider shadow">
                    {product.category}
                  </span>
                  {!product.isBakery && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md text-white ${
                      temp === "Hot" ? "bg-amber-900/80" : "bg-cyan-900/80"
                    }`}>
                      {temp === "Hot" ? <Flame className="w-3 h-3 text-amber-300" /> : <Snowflake className="w-3 h-3 text-cyan-300" />}
                      <span>{temp}</span>
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-[#DECDB8]">
                    Flagship Reserve
                  </p>
                  <p className="font-serif text-lg font-bold truncate">
                    {product.name}
                  </p>
                </div>
              </div>

              {/* Order Formulation Ticket */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-[#E5DACB] pb-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#573B2C] flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-[#173D2B]" />
                    <span>Order Specification</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Custom Formulation
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-[#573B2C] bg-[#F5F0E7]/60 p-3.5 rounded-2xl border border-[#E5DACB]">
                  {!product.isBakery ? (
                    <>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <strong className="text-[#173D2B]">{size}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Temperature:</span>
                        <strong className="text-[#173D2B]">{temp}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Milk Choice:</span>
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
                      {selectedToppings.length > 0 && (
                        <div className="flex justify-between text-[#315640] font-semibold">
                          <span>Toppings:</span>
                          <span className="truncate max-w-[160px] text-right">
                            {selectedToppings.map((id) => TOPPINGS.find((t) => t.id === id)?.name).join(", ")}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>Serving Style:</span>
                      <strong className="text-[#173D2B]">{pastryHeating}</strong>
                    </div>
                  )}
                </div>

                {/* Quantity Stepper & Price Calculation */}
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
                      <span className="px-3 py-1 text-xs font-mono font-bold text-[#173D2B]">
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
                    <p className="font-serif text-2xl sm:text-3xl font-bold text-[#173D2B] tracking-tight">
                      ₱{totalPrice}
                    </p>
                  </div>
                </div>

                {/* Prominent Add to Cart Button */}
                <button
                  ref={addBtnRef}
                  type="button"
                  onClick={handleAdd}
                  className={`w-full py-4 rounded-full font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer ${
                    isAdded
                      ? "bg-emerald-800 text-white shadow-emerald-900/30"
                      : "bg-[#173D2B] hover:bg-[#315640] text-white shadow-[#173D2B]/30 hover:shadow-lg"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#C9AE8B] animate-scale-in" />
                      <span>Added to Your Order Bag!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />
                      <span>Add to Order Bag • ₱{totalPrice}</span>
                    </>
                  )}
                </button>

                {/* Reassurance text */}
                <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-[#573B2C] border-t border-[#E5DACB]/60 text-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#315640]" />
                  <span>Handcrafted freshly upon barista dispatch</span>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ========================================================
          MOBILE STICKY BOTTOM ACTION BAR (lg:hidden)
         ======================================================== */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFFCF7]/95 backdrop-blur-md border-t border-[#E5DACB] p-4 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
              {quantity}x {product.name}
            </p>
            <p className="font-serif text-xl font-bold text-[#173D2B]">
              ₱{totalPrice}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`flex-1 py-3.5 px-6 rounded-full font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
              isAdded
                ? "bg-emerald-800 text-white"
                : "bg-[#173D2B] hover:bg-[#315640] text-white"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4 text-[#C9AE8B]" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />
                <span>Add to Bag</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
