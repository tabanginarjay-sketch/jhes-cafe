"use client";

import { useState } from "react";
import { Sparkles, Tag, Check, ArrowRight } from "lucide-react";
import Link from "next/link";

const ANNOUNCEMENTS = [
  {
    icon: "🏷️",
    text: "15% OFF YOUR FIRST ONLINE ORDER",
    highlight: "CODE: FIRSTSIP15",
    code: "FIRSTSIP15",
  },
  {
    icon: "🚚",
    text: "FREE HIGHLAND ROASTERY DELIVERY OVER ₱800",
    highlight: "AUTO-APPLIED AT CHECKOUT",
  },
  {
    icon: "☕",
    text: "BUY 1 GET 1 ON HIGHLAND COLD BREW",
    highlight: "EVERY 2:00 PM – 5:00 PM DAILY",
  },
  {
    icon: "🥐",
    text: "20% OFF ALL FRESH BUTTER CROISSANTS",
    highlight: "WITH ANY RESERVE LATTE",
    code: "SWEETPAIR",
  },
  {
    icon: "⭐",
    text: "JOIN JHE'S CAFE' REWARDS",
    highlight: "GET 100 WELCOME POINTS",
  },
  {
    icon: "🏔️",
    text: "VISIT OUR FLAGSHIP ON TAGAYTAY RIDGE",
    highlight: "FREE VALET PARKING DAILY",
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

  return (
    <div className="relative bg-[#0E281C] text-[#F5F0E7] text-[11px] border-b border-[#315640]/60 overflow-hidden py-1.5 select-none z-50">
      
      {/* Toast Notification when a voucher is copied */}
      {copiedCode && (
        <div className="absolute inset-0 bg-[#C9AE8B] text-[#173D2B] font-bold text-xs flex items-center justify-center gap-2 z-20 animate-fade-in shadow-md">
          <Check className="w-3.5 h-3.5" />
          <span>Voucher code &quot;{copiedCode}&quot; copied to clipboard! Paste at checkout.</span>
        </div>
      )}

      {/* Infinite Horizontal Sliding Marquee Track */}
      <div className="flex animate-marquee items-center gap-8 whitespace-nowrap cursor-pointer">
        {/* Render twice for seamless loop */}
        {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((item, index) => (
          <div
            key={index}
            onClick={() => item.code && handleCopy(item.code)}
            className="inline-flex items-center gap-2 px-2 hover:text-[#C9AE8B] transition-colors"
          >
            <span>{item.icon}</span>
            <span className="font-medium tracking-wide uppercase">{item.text}</span>
            <span className="font-mono font-bold text-[#C9AE8B] bg-[#315640]/60 px-2 py-0.5 rounded-md text-[10px] tracking-wider border border-[#C9AE8B]/30 hover:bg-[#C9AE8B] hover:text-[#173D2B] transition-all">
              {item.highlight}
            </span>
            <span className="text-[#C9AE8B]/40 ml-4 font-serif">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
