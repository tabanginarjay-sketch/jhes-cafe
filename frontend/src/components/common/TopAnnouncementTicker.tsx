"use client";

import { useState } from "react";
import { Tag, Coffee, MapPin, Sparkles, Check, Copy, ShoppingBag } from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brandConfig";

interface AnnouncementItem {
  id: string;
  icon: "tag" | "bag" | "coffee" | "map" | "sparkles";
  text: string;
  code?: string;
  badge?: string;
}

const ITEMS: AnnouncementItem[] = [
  {
    id: "welcome",
    icon: "tag",
    text: `Welcome to ${BRAND_CONFIG.name} · Demo Promo: Enjoy 15% off your order at checkout`,
    code: BRAND_CONFIG.promo.code,
    badge: `Code: ${BRAND_CONFIG.promo.code}`,
  },
  {
    id: "ordering",
    icon: "bag",
    text: "Dine-In, Takeaway & Delivery (configured zones) with order status tracking",
    badge: "Order Tracking",
  },
  {
    id: "roast",
    icon: "coffee",
    text: "Small-batch Barako & Benguet highland coffees roasted weekly (Portfolio Showcase)",
    badge: "Fresh Roast",
  },
  {
    id: "location",
    icon: "map",
    text: `${BRAND_CONFIG.location.shortAddress} · ${BRAND_CONFIG.hours.compactLabel}`,
    badge: "Demo Flagship",
  },
  {
    id: "bakery",
    icon: "sparkles",
    text: "In-house pastries, cheesecakes, and butter croissants baked daily",
    badge: "Daily Batch",
  },
];

export function TopAnnouncementTicker() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const renderIcon = (type: AnnouncementItem["icon"]) => {
    const iconClass = "w-3.5 h-3.5 text-[#C9AE8B] shrink-0";
    switch (type) {
      case "tag":
        return <Tag className={iconClass} strokeWidth={1.75} />;
      case "bag":
        return <ShoppingBag className={iconClass} strokeWidth={1.75} />;
      case "coffee":
        return <Coffee className={iconClass} strokeWidth={1.75} />;
      case "map":
        return <MapPin className={iconClass} strokeWidth={1.75} />;
      case "sparkles":
        return <Sparkles className={iconClass} strokeWidth={1.75} />;
    }
  };

  return (
    <div className="relative bg-[#0E281C] text-[#F5F0E7] text-[11px] sm:text-xs border-b border-[#315640]/50 overflow-hidden py-2 select-none z-50">
      
      {/* Toast Notification when code is clicked */}
      {copiedCode && (
        <div className="absolute inset-0 bg-[#C9AE8B] text-[#173D2B] font-semibold text-xs flex items-center justify-center gap-2 z-20 animate-fade-in shadow-md">
          <Check className="w-3.5 h-3.5" />
          <span>Code &quot;{copiedCode}&quot; copied to clipboard! Paste at checkout.</span>
        </div>
      )}

      {/* Natural Horizontal Scrolling Ticker */}
      <div className="flex animate-marquee items-center gap-10 whitespace-nowrap">
        {/* Render twice for continuous loop */}
        {[...ITEMS, ...ITEMS].map((item, index) => (
          <div
            key={index}
            onClick={() => item.code && handleCopy(item.code)}
            className={`inline-flex items-center gap-2.5 px-2 transition-colors ${
              item.code ? "cursor-pointer hover:text-[#C9AE8B]" : "cursor-default"
            }`}
            title={item.code ? "Click to copy promo code" : undefined}
          >
            {/* Realistic Minimalist Vector SVG Icon */}
            <span className="p-1 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              {renderIcon(item.icon)}
            </span>

            {/* Natural Editorial Copy */}
            <span className="font-normal text-[#F5F0E7]/90 tracking-normal text-xs">
              {item.text}
            </span>

            {/* Subtle Minimalist Pill */}
            {item.badge && (
              <span className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md transition-all ${
                item.code
                  ? "bg-[#C9AE8B]/20 text-[#DECDB8] border border-[#C9AE8B]/40 hover:bg-[#C9AE8B] hover:text-[#173D2B]"
                  : "bg-white/5 text-[#F5F0E7]/70 border border-white/10"
              }`}>
                {item.code && <Copy className="w-2.5 h-2.5" />}
                <span>{item.badge}</span>
              </span>
            )}

            {/* Subtle Editorial Separator Dot */}
            <span className="text-[#C9AE8B]/40 ml-4">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
