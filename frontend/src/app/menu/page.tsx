"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Check, Filter } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { API_BASE_URL } from "@/lib/api";

const CATEGORIES = ["All", "Signature Espresso", "Cold Brews", "Warm Classics", "Artisanal Pastries"];

const FALLBACK_MENU = [
  {
    id: "barako-romano",
    name: "Barako Espresso Romano",
    slug: "barako-espresso-romano",
    category: "Signature Espresso",
    price: 190,
    origin: "Amadeo, Cavite",
    notes: "Heavy body, charred oak, caramelized jackfruit zest & candied lemon twist",
    tag: "Artisanal",
    image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "spanish-latte-dulce",
    name: "Spanish Latte Dulce",
    slug: "spanish-latte-dulce",
    category: "Signature Espresso",
    price: 220,
    origin: "Cavite Liberica Blend",
    notes: "Spiced condensed milk, double ristretto, Ceylon cinnamon bark dusting",
    tag: "Bestseller",
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tagaytay-cloud-coldbrew",
    name: "Tagaytay Cloud Cold Brew",
    slug: "tagaytay-cloud-coldbrew",
    category: "Cold Brews",
    price: 240,
    origin: "Benguet Typica",
    notes: "Dense salted vanilla cream cap, 18-hr steeped slow drip, dark cacao finish",
    tag: "Highland Favorite",
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "salted-honey-latte",
    name: "Salted Wild Honey Latte",
    slug: "salted-honey-latte",
    category: "Warm Classics",
    price: 230,
    origin: "Mt. Apo Arabica",
    notes: "Wild Tagaytay mountain honey, flaky sea salt froth, steamed velvety milk",
    tag: "Chef's Pick",
    image: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "burnt-basque-cheesecake",
    name: "Burnt Basque Cheesecake",
    slug: "burnt-basque-cheesecake",
    category: "Artisanal Pastries",
    price: 280,
    origin: "In-house Bakery",
    notes: "Caramelized charred crown, molten cream center, Maldon sea salt flakes",
    tag: "Must Try",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "rosemary-croissant",
    name: "Rosemary Butter Croissant",
    slug: "rosemary-butter-croissant",
    category: "Artisanal Pastries",
    price: 160,
    origin: "Normandy French Butter",
    notes: "Flaky 72-layer honeycomb lamination, fresh rosemary butter glaze",
    tag: "Freshly Baked",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
  },
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [menuItems, setMenuItems] = useState(FALLBACK_MENU);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const { addItem } = useCart();

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog/products`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((item: any, idx: number) => ({
              id: item.id,
              name: item.name,
              slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              category: item.category_name || "Signature Espresso",
              price: item.price,
              origin: item.origin || "Highland Harvest",
              notes: item.tasting_notes || "Artisanal single origin roast",
              tag: item.tag || "Fresh",
              image: FALLBACK_MENU[idx % FALLBACK_MENU.length].image,
            }));
            setMenuItems(mapped);
          }
        }
      } catch {
        // Fallback
      }
    }
    void loadMenu();
  }, []);

  const filteredItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter((i) => i.category === activeCategory);

  const handleAdd = (item: (typeof FALLBACK_MENU)[0]) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      size: "Grande 16oz",
      temperature: item.category.includes("Cold") ? "Iced" : "Hot",
      milk: "Whole Milk",
      imageUrl: item.image,
    });
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAddedIds((prev) => ({ ...prev, [item.id]: false })), 1500);
  };

  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#315640]">
            Handcrafted Reserve Bar
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#173D2B] tracking-tight">
            Our Coffee &amp; Bakery Menu
          </h1>
          <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
            Every drink is pulled to order on our manual espresso bar using single-origin beans and slow-steeped highland extractions.
          </p>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#173D2B] text-[#FFFCF7] shadow-sm"
                  : "bg-[#F5F0E7] text-[#573B2C] hover:bg-[#E5DACB]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
          {filteredItems.map((item) => {
            const isAdded = addedIds[item.id];
            return (
              <div
                key={item.id}
                className="group flex flex-col rounded-3xl overflow-hidden border border-[#E5DACB] bg-[#F5F0E7]/40 hover:bg-[#F5F0E7]/80 hover:border-[#C9AE8B] transition-all duration-300 shadow-2xs hover:shadow-md"
              >
                <Link href={`/menu/${item.slug}`} className="relative aspect-4/3 overflow-hidden bg-[#E5DACB]">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {item.tag && (
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#173D2B]/90 text-[#FFFCF7] text-[10px] font-semibold uppercase tracking-wider">
                      {item.tag}
                    </span>
                  )}
                </Link>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#315640]">
                      {item.category}
                    </span>
                    <Link href={`/menu/${item.slug}`}>
                      <h3 className="font-serif text-xl font-bold text-[#173D2B] group-hover:text-[#315640] transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-[#573B2C] line-clamp-2">
                      {item.notes}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E5DACB]">
                    <span className="font-serif text-xl font-bold text-[#173D2B]">
                      ₱{item.price}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdd(item)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                        isAdded
                          ? "bg-emerald-800 text-white"
                          : "bg-[#173D2B] hover:bg-[#315640] text-white"
                      }`}
                    >
                      {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isAdded ? "Added" : "Add to Bag"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
