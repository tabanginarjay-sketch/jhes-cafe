"use client";

import Link from "next/link";
import { MapPin, Clock, ArrowRight, ShieldCheck, Globe, Share2 } from "lucide-react";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";

export function Footer() {
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

            <div className="flex items-center gap-3 pt-2 text-[#C9AE8B]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-[#0F2A1D] flex items-center justify-center hover:bg-[#315640] text-[#F5F0E7] transition-colors"
                aria-label="Social Link"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-[#0F2A1D] flex items-center justify-center hover:bg-[#315640] text-[#F5F0E7] transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-4 h-4" />
              </a>
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
                  Specialty Menu
                </Link>
              </li>
              <li>
                <Link href="/our-cafe" className="hover:text-[#C9AE8B] transition-colors">
                  Our Space &amp; Ambience
                </Link>
              </li>
              <li>
                <Link href="/our-story" className="hover:text-[#C9AE8B] transition-colors">
                  Our Coffee Story
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-[#C9AE8B] transition-colors">
                  Track Your Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Roastery & Cafe Hours */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-serif text-base font-semibold text-[#FFFCF7] tracking-wide">
              Flagship Roastery
            </h4>
            <div className="space-y-3 text-xs text-[#F5F0E7]/80">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C9AE8B] shrink-0 mt-0.5" />
                <span>Km 58 Tagaytay-Nasugbu Highway, Cavite, Philippines</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#C9AE8B] shrink-0 mt-0.5" />
                <div>
                  <p>Mon – Fri: 6:30 AM – 10:00 PM</p>
                  <p>Sat – Sun: 6:00 AM – 11:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Botanical Club Newsletter */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-serif text-base font-semibold text-[#FFFCF7] tracking-wide">
              Slow Down With Us
            </h4>
            <p className="text-xs leading-relaxed text-[#F5F0E7]/75">
              Receive seasonal reserve tastings, coffee pairing recipes, and invitation-only brew bar events.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
              <div className="flex rounded-lg overflow-hidden border border-[#315640] bg-[#0F2A1D]/60 focus-within:border-[#C9AE8B]">
                <input
                  type="email"
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
                Zero spam. Pure coffee culture.
              </span>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-[#315640]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F5F0E7]/60">
          <p>© 2026 BREW &amp; CO. Specialty Coffee Roasters. All rights reserved.</p>
          <div className="flex items-center gap-6">
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
