"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ShoppingBag,
  User,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  Award,
  CreditCard,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";
import { TopAnnouncementTicker } from "@/components/common/TopAnnouncementTicker";

const MAIN_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "My Orders", href: "/my-orders" },
  { label: "Our Space", href: "/our-cafe" },
  { label: "Our Story", href: "/our-story" },
  { label: "Find Us", href: "/contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalCount, toggleCart } = useCart();
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  // Close account dropdown on outside click or Escape key
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
    if (
      pathname.startsWith("/account") ||
      pathname.startsWith("/my-orders") ||
      pathname.startsWith("/checkout")
    ) {
      router.push("/");
    }
  };

  const firstName = user?.full_name ? user.full_name.trim().split(/\s+/)[0] : "Member";
  const initial = user?.full_name ? user.full_name.trim()[0].toUpperCase() : "M";

  return (
    <header className="sticky top-0 z-40 bg-[#FFFCF7]/95 backdrop-blur-md border-b border-[#E5DACB] transition-all">
      {/* Global Horizontal Sliding Discount & Perks Marquee Ticker */}
      <TopAnnouncementTicker />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Wordmark & Emblem */}
          <Link href="/" className="group cursor-pointer shrink-0">
            <JhesCafeLogo variant="horizontal" size="md" />
          </Link>

          {/* Desktop Main Navigation */}
          <nav aria-label="Primary Customer Navigation" className="hidden lg:flex items-center gap-7">
            {MAIN_NAV_LINKS.map((link) => {
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

          {/* Utility Action Buttons: Account Dropdown + Cart + Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Account Menu / Sign In */}
            {isLoading ? (
              <div
                aria-label="Loading member session"
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#E5DACB] bg-[#F5F0E7]/60"
              >
                <div className="w-5 h-5 rounded-full bg-[#E5DACB] animate-pulse" />
                <div className="w-16 h-3 rounded bg-[#E5DACB] animate-pulse" />
              </div>
            ) : user ? (
              <div className="relative hidden sm:block" ref={accountMenuRef}>
                <button
                  type="button"
                  id="navbar-account-btn"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-xs font-semibold text-[#173D2B] hover:text-[#315640] px-3 py-1.5 rounded-full bg-white hover:bg-[#F5F0E7] transition-all duration-200 border border-[#E5DACB] shadow-2xs cursor-pointer"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-6 h-6 rounded-full object-cover border border-[#C9AE8B]"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center text-[10px] font-serif font-bold">
                      {initial}
                    </div>
                  )}
                  <span className="max-w-[96px] truncate">{firstName}</span>
                  <span
                    id="navbar-loyalty-points"
                    className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono text-[#173D2B] bg-[#F5F0E7] border border-[#E5DACB] px-2 py-0.5 rounded-full"
                    title="Authoritative Loyalty Bean Points"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-[#C9AE8B]" />
                    <span>{user.loyalty_points} pts</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#573B2C] transition-transform duration-200 ${
                      accountMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Account Dropdown Menu */}
                {accountMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Customer Account Menu"
                    className="absolute right-0 mt-2.5 w-64 rounded-2xl border border-[#E5DACB] bg-white shadow-xl py-2 z-50 animate-fade-in"
                  >
                    {/* Member Snapshot Header */}
                    <div className="px-4 py-3 border-b border-[#E5DACB] bg-[#FFFCF7] rounded-t-2xl">
                      <p className="font-serif text-sm font-bold text-[#173D2B] truncate">
                        {user.full_name}
                      </p>
                      <p className="text-[11px] font-mono text-[#573B2C]/80 truncate">
                        {user.email}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#173D2B] text-[#C9AE8B] text-[10px] font-mono font-bold">
                        <Sparkles className="w-3 h-3" />
                        <span>{user.loyalty_points} Bean Points</span>
                      </div>
                    </div>

                    <div className="py-1.5 px-2 space-y-0.5 text-xs font-medium text-[#173D2B]">
                      <Link
                        href="/account"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F5F0E7] transition-colors"
                      >
                        <User className="w-4 h-4 text-[#315640]" />
                        <span>My Account</span>
                      </Link>
                      <Link
                        href="/account?tab=rewards"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F5F0E7] transition-colors"
                      >
                        <Award className="w-4 h-4 text-[#C9AE8B]" />
                        <span>My Rewards</span>
                      </Link>
                      <Link
                        href="/account?tab=card"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F5F0E7] transition-colors"
                      >
                        <CreditCard className="w-4 h-4 text-[#315640]" />
                        <span>Digital Member Card</span>
                      </Link>
                    </div>

                    <div className="border-t border-[#E5DACB] mt-1 pt-1.5 px-2">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleSignOut()}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] px-3.5 py-2 rounded-full border border-[#E5DACB] hover:bg-[#F5F0E7] transition-all duration-200"
                title="Sign In to Jhe's Cafe'"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Shopping Cart Button (Preserves exact IDs for curved flight animation) */}
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
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-lg text-[#173D2B] hover:bg-[#F5F0E7] transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E5DACB] bg-[#FFFCF7] px-4 pt-4 pb-6 space-y-4 animate-slide-down">
          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-mono uppercase tracking-widest text-[#573B2C]/70">
              Explore Jhe&apos;s Cafe&apos;
            </p>
            {MAIN_NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#F5F0E7] text-[#173D2B] font-semibold"
                      : "text-[#573B2C] hover:bg-[#F5F0E7]/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Account Menu Section */}
          <div className="pt-3 border-t border-[#E5DACB] space-y-1.5">
            <p className="px-3 text-[10px] font-mono uppercase tracking-widest text-[#573B2C]/70">
              Member Account
            </p>
            {user ? (
              <>
                <div className="px-3 py-2 rounded-xl bg-[#F5F0E7] flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#173D2B] truncate">{user.full_name}</p>
                    <p className="text-[10px] font-mono text-[#573B2C] truncate">{user.email}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#173D2B] text-[#C9AE8B]">
                    {user.loyalty_points} pts
                  </span>
                </div>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7]"
                >
                  <User className="w-4 h-4 text-[#315640]" />
                  <span>My Account</span>
                </Link>
                <Link
                  href="/account?tab=rewards"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7]"
                >
                  <Award className="w-4 h-4 text-[#C9AE8B]" />
                  <span>My Rewards</span>
                </Link>
                <Link
                  href="/account?tab=card"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7]"
                >
                  <CreditCard className="w-4 h-4 text-[#315640]" />
                  <span>Digital Member Card</span>
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7]"
                >
                  <ShoppingBag className="w-4 h-4 text-[#315640]" />
                  <span>Cart ({totalCount})</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-800 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-[#173D2B] text-white text-center text-xs font-semibold uppercase tracking-wider"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-[#173D2B] text-[#173D2B] text-center text-xs font-semibold uppercase tracking-wider"
                >
                  Create Account
                </Link>
              </div>
            )}

            <div className="pt-2 px-3 flex justify-end">
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#573B2C] hover:text-[#173D2B] underline"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
