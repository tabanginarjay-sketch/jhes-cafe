"use client";

import { useState, useEffect, useCallback } from "react";
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
  Award,
  BarChart3,
  Settings,
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Mail,
  Truck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api";

interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminIdentity | null>(null);
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const verifyAdminSession = useCallback(async () => {
    try {
      setChecking(true);
      const res = await fetch(`${API_BASE_URL}/auth/admin`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.admin) {
          setAdminUser(data.admin);
          return;
        }
      }
      setAdminUser(null);
    } catch {
      setAdminUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void verifyAdminSession();
  }, [verifyAdminSession, user]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !credential.trim()) {
      setErrorMsg("Please enter your manager email and staff credential.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/auth/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          credential: credential.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated) {
        setAdminUser(data.admin);
        setCredential("");
      } else {
        setErrorMsg(data.detail || "Invalid administrator credentials.");
      }
    } catch {
      setErrorMsg("Unable to reach authentication service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLock = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/admin`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setAdminUser(null);
    setCredential("");
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Live Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Deliveries", href: "/admin/deliveries", icon: Truck },
    { label: "Products Catalog", href: "/admin/products", icon: Package },
    { label: "Categories", href: "/admin/categories", icon: Layers },
    { label: "Inventory Stock", href: "/admin/inventory", icon: Boxes },
    { label: "Customers", href: "/admin/customers", icon: Users },
    { label: "Barista Staff", href: "/admin/staff", icon: BadgeCheck },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Loyalty Ledger", href: "/admin/loyalty", icon: Award },
    { label: "Sales Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#573B2C]">Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  // Server-Verified Security Gate
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#F5F0E7] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-[#E5DACB] shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#573B2C] block">
                Server-Verified RBAC Gate
              </span>
              <h1 className="font-serif text-2xl font-bold text-[#173D2B]">
                Jhe&apos;s Cafe&apos; Admin Console
              </h1>
            </div>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Restricted management console. Sign in with an active manager email and staff credential registered in Airtable.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#173D2B] block mb-1.5">
                Manager Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@jhescafe.com"
                  className="w-full rounded-xl border border-[#E5DACB] px-4 py-3 text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B] bg-[#FFFCF7] pr-10"
                />
                <Mail className="w-4 h-4 text-[#573B2C]/50 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#173D2B] block mb-1.5">
                Staff Credential / Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="Enter your Staff ID or admin credential"
                  className="w-full rounded-xl border border-[#E5DACB] px-4 py-3 text-xs text-[#173D2B] font-mono tracking-wider focus:outline-hidden focus:border-[#173D2B] bg-[#FFFCF7] pr-10"
                />
                <KeyRound className="w-4 h-4 text-[#573B2C]/50 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {errorMsg && (
              <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 font-medium">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-[#C9AE8B]" />
              <span>{submitting ? "Verifying..." : "Sign In to Admin Console"}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-[#E5DACB] text-center space-y-2">
            <p className="text-[11px] text-[#573B2C]/75">
              Public customer accounts cannot access administrator routes.
            </p>
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
            <span className="font-serif font-bold text-lg text-[#FFFCF7]">Jhe&apos;s Cafe&apos;</span>
            <span className="ml-2 text-[10px] uppercase font-mono tracking-widest text-[#C9AE8B] bg-[#0F2A1D] px-2 py-0.5 rounded">
              Admin Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-[11px] font-mono text-[#DECDB8]">
            {adminUser.name} ({adminUser.role})
          </span>

          <button
            type="button"
            onClick={() => void handleLock()}
            className="inline-flex items-center gap-1 text-[11px] text-[#C9AE8B] hover:text-white transition-colors cursor-pointer"
            title="Lock Admin Session"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
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

      {/* Mobile Admin Module Bar (replaces customer nav cleanly on small screens) */}
      <nav
        aria-label="Admin Modules"
        className="md:hidden bg-white border-b border-[#E5DACB] px-3 py-2.5 overflow-x-auto flex items-center gap-1.5 sticky top-16 z-20"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                isActive
                  ? "bg-[#173D2B] text-white shadow-xs"
                  : "bg-[#F5F0E7] text-[#573B2C] hover:text-[#173D2B]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C9AE8B]" : "text-[#573B2C]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
