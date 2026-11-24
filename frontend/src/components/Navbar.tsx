"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ShoppingBag, User, Menu, X, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";
import { TopAnnouncementTicker } from "@/components/common/TopAnnouncementTicker";

export function Navbar() {
  const pathname = usePathname();
  const { totalCount, toggleCart } = useCart();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseLinks = [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "Our Space", href: "/our-cafe" },
    { label: "Our Story", href: "/our-story" },
    { label: "Find Us", href: "/contact" },
  ];

  const navLinks = user
    ? [
        { label: "Home", href: "/" },
        { label: "Menu", href: "/menu" },
        { label: "My Orders", href: "/order" },
        { label: "Our Space", href: "/our-cafe" },
        { label: "Our Story", href: "/our-story" },
        { label: "Find Us", href: "/contact" },
      ]
    : baseLinks;

  return (
    <header className="sticky top-0 z-40 bg-[#FFFCF7]/95 backdrop-blur-md border-b border-[#E5DACB] transition-all">
      {/* 1. Global Horizontal Sliding Discount & Perks Marquee Ticker */}
      <TopAnnouncementTicker />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Wordmark & Aesthetic Logo */}
          <Link href="/" className="group cursor-pointer">
            <JhesCafeLogo variant="horizontal" size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium tracking-wide py-1 transition-all duration-300 ${
                    isActive
                      ? "text-[#173D2B] font-semibold border-b-2 border-[#173D2B]"
                      : "text-[#573B2C]/80 hover:text-[#173D2B] nav-link-underline"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Utility Action Buttons */}
          <div className="flex items-center gap-4">
            
            {/* Account Link / User Pill */}
            {user ? (
              <Link
                href="/account"
                className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#173D2B] hover:text-[#315640] px-3.5 py-1.5 rounded-full hover:bg-[#F5F0E7] transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-[#E5DACB] hover:shadow-xs"
                title="Customer Account"
              >
                <div className="w-6 h-6 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center text-[10px] font-serif font-bold transition-transform duration-300 group-hover:scale-105">
                  {user.full_name ? user.full_name[0].toUpperCase() : "U"}
                </div>
                <span className="hidden lg:inline max-w-[100px] truncate">
                  {user.full_name.split(" ")[0]}
                </span>
                <span className="hidden xl:inline text-[10px] font-mono text-[#315640] bg-[#315640]/10 px-1.5 py-0.5 rounded-full">
                  {user.loyalty_points} pts
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] px-3 py-1.5 rounded-full hover:bg-[#F5F0E7] transition-all duration-300 hover:scale-[1.02] active:scale-95"
                title="Customer Account"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">Sign In</span>
              </Link>
            )}

            {/* Shopping Cart Button with Animated Pop on Landing & Badge Change */}
            <button
              type="button"
              id="navbar-cart-btn"
              onClick={toggleCart}
              aria-label={`Open shopping bag${totalCount > 0 ? `, ${totalCount} items` : ""}`}
              className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-[#F5F0E7] text-xs font-semibold tracking-wider transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 cursor-pointer"
            >
              <span id="navbar-cart-icon" className="inline-flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-[#C9AE8B] transition-transform duration-300 group-hover:-rotate-6" />
              </span>
              <span className="hidden sm:inline">Cart</span>
              {totalCount > 0 && (
                <span
                  id="navbar-cart-count"
                  key={totalCount}
                  className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[#C9AE8B] text-[#173D2B] text-[11px] font-bold animate-badge-pop shadow-xs"
                >
                  {totalCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#173D2B] hover:bg-[#F5F0E7] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5DACB] bg-[#FFFCF7] px-4 pt-4 pb-6 space-y-3 animate-slide-down">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#F5F0E7] text-[#173D2B] font-semibold"
                    : "text-[#573B2C] hover:bg-[#F5F0E7]/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-[#E5DACB] flex items-center justify-between px-3">
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs font-semibold uppercase tracking-wider text-[#173D2B] flex items-center gap-2 py-2"
            >
              <User className="w-4 h-4 text-[#573B2C]" />
              Account / Profile
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[11px] font-medium text-[#573B2C] underline"
            >
              Staff Portal →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
