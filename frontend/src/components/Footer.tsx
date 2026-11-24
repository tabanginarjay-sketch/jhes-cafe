"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Clock, ArrowRight, ShieldCheck, Compass, Mail, CheckCircle2 } from "lucide-react";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";
import { BRAND_CONFIG } from "@/lib/brandConfig";

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) return;
    setSubscribed(true);
    setNewsletterEmail("");
  };

  return (
    <footer className="bg-[#173D2B] text-[#F5F0E7] border-t border-[#0F2A1D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="group inline-block">
              <JhesCafeLogo variant="footer" size="md" />
            </Link>

            <p className="text-sm leading-relaxed text-[#F5F0E7]/80 max-w-sm">
              Your everyday coffee escape. Crafted with single-origin beans, warm walnut spaces, natural light, and moments worth slowing down for.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F2A1D] border border-[#315640] text-[10px] font-mono uppercase tracking-wider text-[#C9AE8B]">
              <span>{BRAND_CONFIG.demoBadge}</span>
            </div>

            <div className="flex items-center gap-3 pt-1 text-[#C9AE8B]">
              <Link
                href="/our-cafe"
                className="w-9 h-9 rounded-full bg-[#0F2A1D] flex items-center justify-center hover:bg-[#315640] text-[#F5F0E7] transition-colors"
                aria-label="Explore Our Café"
                title="Explore Our Café"
              >
                <Compass className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="w-9 h-9 rounded-full bg-[#0F2A1D] flex items-center justify-center hover:bg-[#315640] text-[#F5F0E7] transition-colors"
                aria-label="Contact Jhe's Cafe'"
                title="Contact Jhe's Cafe'"
              >
                <Mail className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-serif text-base font-semibold text-[#FFFCF7] tracking-wide">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-[#F5F0E7]/75">
              <li>
                <Link href="/" className="hover:text-[#C9AE8B] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-[#C9AE8B] transition-colors">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/my-orders" className="hover:text-[#C9AE8B] transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/our-cafe" className="hover:text-[#C9AE8B] transition-colors">
                  Our Space
                </Link>
              </li>
              <li>
                <Link href="/our-story" className="hover:text-[#C9AE8B] transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#C9AE8B] transition-colors">
                  Find Us
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-[#C9AE8B] transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Roastery & Cafe Hours */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-serif text-base font-semibold text-[#FFFCF7] tracking-wide">
              Flagship Lounge <span className="text-[10px] font-mono font-normal text-[#C9AE8B]">(Demo)</span>
            </h4>
            <div className="space-y-3 text-xs text-[#F5F0E7]/80">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C9AE8B] shrink-0 mt-0.5" />
                <span>{BRAND_CONFIG.location.fullAddress}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#C9AE8B] shrink-0 mt-0.5" />
                <div>
                  <p>{BRAND_CONFIG.hours.weekdaysLabel}</p>
                  <p>{BRAND_CONFIG.hours.weekendsLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#C9AE8B] shrink-0 mt-0.5" />
                <span>{BRAND_CONFIG.contact.email}</span>
              </div>
            </div>
          </div>

          {/* Botanical Club Newsletter */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-serif text-base font-semibold text-[#FFFCF7] tracking-wide">
              Slow Down With Us
            </h4>
            <p className="text-xs leading-relaxed text-[#F5F0E7]/75">
              Receive seasonal reserve tastings, coffee pairing recipes, and café updates.
            </p>
            {subscribed ? (
              <div className="rounded-xl border border-[#C9AE8B]/40 bg-[#0F2A1D] p-3 text-xs text-[#DECDB8] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Subscribed! (Demo newsletter confirmation)</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex rounded-lg overflow-hidden border border-[#315640] bg-[#0F2A1D]/60 focus-within:border-[#C9AE8B]">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 text-xs text-[#F5F0E7] placeholder:text-[#F5F0E7]/40 bg-transparent focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3.5 bg-[#C9AE8B] text-[#173D2B] text-xs font-semibold hover:bg-[#DECDB8] transition-colors cursor-pointer"
                    aria-label="Subscribe"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-[#F5F0E7]/50 block">
                  Demo signup · No promotional spam sent.
                </span>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-[#315640]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F5F0E7]/60">
          <div className="space-y-1 text-center sm:text-left">
            <p>© 2026 {BRAND_CONFIG.legalName}. All rights reserved.</p>
            <p className="text-[11px] text-[#F5F0E7]/45">{BRAND_CONFIG.demoDisclaimer}</p>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/contact" className="hover:text-[#C9AE8B] transition-colors">
              Contact Us
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-[#C9AE8B] hover:text-[#DECDB8] transition-colors font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
