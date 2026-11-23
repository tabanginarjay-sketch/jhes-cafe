"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Users,
  BadgeCheck,
  CreditCard,
  BarChart3,
  Settings,
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if session has admin unlock or user is admin
    const sessionUnlocked = typeof window !== "undefined" && sessionStorage.getItem("bnc_admin_unlocked") === "true";
    if (sessionUnlocked || (user && (user.role === "admin" || user.role === "manager"))) {
      setIsAuthorized(true);
    }
    setChecking(false);
  }, [user]);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passcode.trim() === "brew2026" || passcode.trim() === "1234" || passcode.trim() === "admin") {
      sessionStorage.setItem("bnc_admin_unlocked", "true");
      setIsAuthorized(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Invalid manager passcode. Hint: brew2026");
    }
  };

  const handleManagerQuickUnlock = () => {
    sessionStorage.setItem("bnc_admin_unlocked", "true");
    setIsAuthorized(true);
    setErrorMsg("");
  };

  const handleLock = () => {
    sessionStorage.removeItem("bnc_admin_unlocked");
    setIsAuthorized(false);
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Live Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Products Catalog", href: "/admin/products", icon: Package },
    { label: "Categories", href: "/admin/categories", icon: Layers },
    { label: "Inventory Stock", href: "/admin/inventory", icon: Boxes },
    { label: "Customers", href: "/admin/customers", icon: Users },
    { label: "Barista Staff", href: "/admin/staff", icon: BadgeCheck },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Sales Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E7]">
        <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
      </div>
    );
  }

  // Security Gate if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F5F0E7] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-[#E5DACB] shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#573B2C] block">
                Security Guard
              </span>
              <h1 className="font-serif text-2xl font-bold text-[#173D2B]">
                BREW &amp; CO. Manager Console
              </h1>
            </div>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Restricted management area. Authenticate with manager credentials or security passcode to manage live orders and roasts.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#173D2B] block mb-1.5">
                Admin Security Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter Passcode (hint: brew2026)"
                  className="w-full rounded-xl border border-[#E5DACB] px-4 py-3 text-xs text-[#173D2B] font-mono tracking-wider focus:outline-hidden focus:border-[#173D2B] bg-[#FFFCF7]"
                />
                <KeyRound className="w-4 h-4 text-[#573B2C]/50 absolute right-3.5 top-3.5" />
              </div>
              {errorMsg && (
                <p className="text-[11px] text-rose-800 mt-1 font-semibold">{errorMsg}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-[#C9AE8B]" />
              <span>Unlock Console</span>
            </button>
          </form>

          <div className="pt-4 border-t border-[#E5DACB] text-center space-y-3">
            <button
              type="button"
              onClick={handleManagerQuickUnlock}
              className="w-full py-2.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#315640]" />
              <span>Quick Unlock as Store Manager</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#573B2C] hover:text-[#173D2B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F0E7]">
      {/* Admin Top Header */}
      <header className="bg-[#173D2B] text-white h-16 border-b border-[#0F2A1D] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#315640] flex items-center justify-center text-[#C9AE8B]">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif font-bold text-lg text-[#FFFCF7]">BREW &amp; CO.</span>
            <span className="ml-2 text-[10px] uppercase font-mono tracking-widest text-[#C9AE8B] bg-[#0F2A1D] px-2 py-0.5 rounded">
              Manager Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLock}
            className="inline-flex items-center gap-1 text-[11px] text-[#C9AE8B] hover:text-white transition-colors cursor-pointer"
            title="Lock Admin Session"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Session</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#F5F0E7]/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#C9AE8B]" />
            <span>Storefront</span>
          </Link>
        </div>
      </header>

      {/* Admin Body Container */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block">
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-4 space-y-1 shadow-2xs sticky top-24">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#573B2C] px-3 py-2">
              Management Modules
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#173D2B] text-white shadow-xs"
                      : "text-[#573B2C] hover:bg-[#F5F0E7] hover:text-[#173D2B]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#C9AE8B]" : "text-[#573B2C]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
