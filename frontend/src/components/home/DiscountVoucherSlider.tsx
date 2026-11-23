"use client";

import { useState } from "react";
import { Tag, Sparkles, Check, Copy, ArrowRight, Percent, Gift, Flame } from "lucide-react";

interface DiscountVoucher {
  id: string;
  tag: string;
  badgeColor: string;
  discount: string;
  title: string;
  description: string;
  code: string;
  minSpend?: string;
  validity: string;
}

const VOUCHERS: DiscountVoucher[] = [
  {
    id: "v-1",
    tag: "FIRST ORDER",
    badgeColor: "bg-emerald-800 text-[#C9AE8B]",
    discount: "15% OFF",
    title: "Welcome Sips Special",
    description: "Enjoy 15% off your entire first online beverage or coffee bean bag order.",
    code: "FIRSTSIP15",
    minSpend: "Min. spend ₱350",
    validity: "New Customers",
  },
  {
    id: "v-2",
    tag: "HAPPY HOUR",
    badgeColor: "bg-amber-800 text-amber-100",
    discount: "BUY 1 GET 1",
    title: "Highland Cold Brew 2-for-1",
    description: "Order any 18-hour slow-steeped cold brew and receive a second cup on us.",
    code: "TWILIGHT2X",
    minSpend: "Daily 2:00 PM – 5:00 PM",
    validity: "Active Today",
  },
  {
    id: "v-3",
    tag: "FREE DELIVERY",
    badgeColor: "bg-blue-800 text-blue-100",
    discount: "₱0 SHIPPING",
    title: "Express Roastery Delivery",
    description: "Complimentary doorstep delivery directly from our Tagaytay Ridge roastery.",
    code: "FREESHIP800",
    minSpend: "On orders ₱800+",
    validity: "Auto-Applies",
  },
  {
    id: "v-4",
    tag: "BAKERY PAIRING",
    badgeColor: "bg-[#573B2C] text-[#DECDB8]",
    discount: "20% OFF",
    title: "Fresh Viennoiserie Pastries",
    description: "Save 20% on any 72-layer European butter croissant when paired with a latte.",
    code: "SWEETPAIR",
    minSpend: "With any beverage",
    validity: "Fresh Daily",
  },
  {
    id: "v-5",
    tag: "RESERVE BAR",
    badgeColor: "bg-[#173D2B] text-[#C9AE8B]",
    discount: "₱100 OFF",
    title: "Single-Origin Tasting Flight",
    description: "Experience 3 high-elevation coffees extracted via ceramic V60 pour-overs.",
    code: "FLIGHT100",
    minSpend: "Reserve bar item",
    validity: "Limited Daily",
  },
  {
    id: "v-6",
    tag: "LOYALTY PERK",
    badgeColor: "bg-purple-900 text-purple-100",
    discount: "2X POINTS",
    title: "Double Reward Points",
    description: "Collect double loyalty bean points on all whole-bean bags and merchandise.",
    code: "REWARDS2X",
    minSpend: "Members only",
    validity: "Earn Today",
  },
];

export function DiscountVoucherSlider() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <section className="py-10 bg-[#0E281C] border-y border-[#315640]/50 relative overflow-hidden select-none">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#315640]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#C9AE8B]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#C9AE8B] text-[#173D2B] flex items-center justify-center shadow-md">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9AE8B]">
                  Seasonal Discounts &amp; Perks
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Flame className="w-2.5 h-2.5" />
                  Live Offers
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#FFFCF7] leading-tight">
                Exclusive Online Vouchers · Click to Copy
              </h3>
            </div>
          </div>

          <span className="text-xs text-[#F5F0E7]/60 hidden sm:inline">
            Scrolls automatically · Hover to pause
          </span>
        </div>
      </div>

      {/* Infinite Horizontal Marquee Slider Container */}
      <div className="relative w-full overflow-hidden">
        
        {/* Subtle Edge Fade Gradients */}
        <div className="absolute left-0 inset-y-0 w-12 sm:w-24 bg-gradient-to-r from-[#0E281C] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 inset-y-0 w-12 sm:w-24 bg-gradient-to-l from-[#0E281C] to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee gap-5 items-stretch py-2">
          {/* Double array for seamless endless scroll loop */}
          {[...VOUCHERS, ...VOUCHERS].map((voucher, idx) => {
            const isCopied = copiedId === `${voucher.id}-${idx}`;

            return (
              <div
                key={`${voucher.id}-${idx}`}
                className="w-[280px] sm:w-[320px] shrink-0 rounded-2xl bg-[#173D2B] border border-[#315640] p-4 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:border-[#C9AE8B]/60 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Decorative Coupon Cutout Circles on left/right borders */}
                <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0E281C] border-r border-[#315640]" />
                <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#0E281C] border-l border-[#315640]" />

                <div className="space-y-3 px-2">
                  {/* Top Badge & Discount Number */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${voucher.badgeColor}`}>
                      {voucher.tag}
                    </span>
                    <span className="font-serif text-lg font-black text-[#C9AE8B] tracking-tight">
                      {voucher.discount}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h4 className="font-serif text-sm font-bold text-[#FFFCF7] group-hover:text-[#C9AE8B] transition-colors">
                      {voucher.title}
                    </h4>
                    <p className="text-[11px] text-[#F5F0E7]/75 leading-relaxed line-clamp-2">
                      {voucher.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Voucher Code Strip & Copy Button */}
                <div className="pt-3 mt-3 border-t border-dashed border-[#315640]/80 flex items-center justify-between gap-2 px-2">
                  <div className="text-[10px] text-[#F5F0E7]/60 truncate font-mono">
                    {voucher.minSpend}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(`${voucher.id}-${idx}`, voucher.code)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono transition-all duration-200 cursor-pointer shadow-xs ${
                      isCopied
                        ? "bg-emerald-500 text-white scale-105"
                        : "bg-[#C9AE8B] hover:bg-[#DECDB8] text-[#173D2B] active:scale-95"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{voucher.code}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
}
