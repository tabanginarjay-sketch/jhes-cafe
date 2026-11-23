"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Coffee,
  Sparkles,
  ArrowRight,
  Clock,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Package,
  QrCode,
  Phone,
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";

export default function AccountPage() {
  const { user, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"orders" | "rewards" | "card">("orders");

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center bg-[#FFFCF7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          <span className="text-xs text-[#573B2C] font-mono">Loading Jhe&apos;s Cafe&apos; member profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 sm:py-28 flex-1 flex items-center justify-center bg-[#FFFCF7] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-10 shadow-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center mx-auto text-[#173D2B]">
            <User className="w-8 h-8 text-[#315640]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-[#173D2B]">
              Member Sign In Required
            </h1>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Sign in or create an account to view your coffee bean points, order history, and exclusive member perks.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
            </Link>
            <Link
              href="/register"
              className="w-full py-3.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-all"
            >
              <span>Create New Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate initials
  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "JC";

  const isVip = user.role.toLowerCase() === "vip";
  const rewardGoal = 400;
  const progressPercent = Math.min(100, Math.round((user.loyalty_points / rewardGoal) * 100));

  return (
    <div className="py-12 sm:py-20 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Profile Header & Loyalty Overview Card */}
        <div className="rounded-3xl border border-[#E5DACB] bg-gradient-to-br from-[#F5F0E7] to-[#ECE5D8] p-6 sm:p-10 shadow-sm relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            {/* Avatar & User Details */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold shadow-md ring-4 ring-white/60">
                {initials}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173D2B]">
                    {user.full_name}
                  </h1>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#173D2B] text-[#C9AE8B] text-[10px] font-bold uppercase tracking-wider">
                    {isVip ? "★ Highland VIP" : "Highland Reserve"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#573B2C]">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#315640]" />
                    {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#315640]" />
                      {user.phone}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-[#573B2C]/75 font-mono pt-1">
                  Member ID: <span className="text-[#173D2B] font-semibold">{user.id}</span>
                </p>
              </div>
            </div>

            {/* Loyalty Bean Points Counter */}
            <div className="w-full sm:w-auto bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-[#E5DACB] text-center sm:text-right shadow-sm shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#573B2C] block">
                Loyalty Bean Points
              </span>
              <div className="flex items-center justify-center sm:justify-end gap-1.5 mt-0.5">
                <Sparkles className="w-5 h-5 text-[#C9AE8B]" />
                <span className="font-serif text-4xl font-bold text-[#173D2B]">
                  {user.loyalty_points}
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 block font-medium mt-1">
                {user.loyalty_points >= rewardGoal
                  ? "🎉 Reward Available to Redeem!"
                  : `${rewardGoal - user.loyalty_points} pts until free specialty drink`}
              </span>

              {/* Progress Bar */}
              <div className="w-full bg-[#E5DACB] h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-[#173D2B] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-6 border-t border-[#E5DACB]/80 flex flex-wrap items-center justify-between gap-4 text-xs relative z-10">
            <div className="flex items-center gap-3">
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D2B] text-white hover:bg-[#315640] transition-colors font-medium shadow-sm"
              >
                <Coffee className="w-3.5 h-3.5 text-[#C9AE8B]" />
                <span>Order Handcrafted Coffee</span>
              </Link>
              <Link
                href="/track-order"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-white transition-colors font-medium"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Track Active Orders</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-[#573B2C] hover:text-red-700 transition-colors cursor-pointer font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>

        {/* Member Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E5DACB] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#173D2B] text-white"
                : "text-[#573B2C] hover:bg-[#F5F0E7]"
            }`}
          >
            Recent Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rewards")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "rewards"
                ? "bg-[#173D2B] text-white"
                : "text-[#573B2C] hover:bg-[#F5F0E7]"
            }`}
          >
            Bean Rewards &amp; Perks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "card"
                ? "bg-[#173D2B] text-white"
                : "text-[#573B2C] hover:bg-[#F5F0E7]"
            }`}
          >
            Digital Member Card
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#173D2B]">
              Your Order History
            </h2>

            <div className="space-y-3">
              {[
                {
                  code: "ORD-1024",
                  date: "Today, 9:15 AM",
                  items: "Spanish Latte Dulce (Grande / 16oz), Rosemary Butter Croissant",
                  total: 380,
                  status: "Brewing & Preparing",
                  statusColor: "bg-amber-100 text-amber-900 border-amber-300",
                },
                {
                  code: "ORD-1001",
                  date: "Nov 21, 2026",
                  items: "Tagaytay Cloud Cold Brew (Venti / 20oz), Barako Espresso Romano",
                  total: 430,
                  status: "Completed",
                  statusColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
                },
              ].map((ord) => (
                <div
                  key={ord.code}
                  className="p-5 sm:p-6 rounded-2xl border border-[#E5DACB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#173D2B]">
                        {ord.code}
                      </span>
                      <span className="text-[10px] text-[#573B2C]/70">· {ord.date}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ord.statusColor}`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-[#173D2B]">
                      {ord.items}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5DACB]">
                    <span className="font-serif text-lg font-bold text-[#173D2B]">
                      ₱{ord.total}.00
                    </span>
                    <Link
                      href="/track-order"
                      className="text-[11px] font-semibold text-[#315640] hover:underline"
                    >
                      View Live Status →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Rewards */}
        {activeTab === "rewards" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                <Coffee className="w-5 h-5 text-[#315640]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                Free Handcrafted Beverage
              </h3>
              <p className="text-xs text-[#573B2C] leading-relaxed">
                Unlock any 16oz single-origin brew or espresso latte once you reach 400 bean points.
              </p>
              <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                Progress: {user.loyalty_points}/400
              </span>
            </div>

            <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                <Sparkles className="w-5 h-5 text-[#C9AE8B]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                Birthday Roast Celebration
              </h3>
              <p className="text-xs text-[#573B2C] leading-relaxed">
                Receive a voucher for a complimentary slice of Burnt Basque Cheesecake during your birthday week.
              </p>
              <span className="text-[10px] font-mono font-semibold text-[#173D2B] bg-[#F5F0E7] px-2 py-0.5 rounded-md inline-block">
                Active Tier Benefit
              </span>
            </div>

            <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                <ShieldCheck className="w-5 h-5 text-[#315640]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                Free Alternative Milk
              </h3>
              <p className="text-xs text-[#573B2C] leading-relaxed">
                Enjoy complimentary Barista Oat or Roasted Almond milk upgrades on every custom drink order.
              </p>
              <span className="text-[10px] font-mono font-semibold text-[#173D2B] bg-[#F5F0E7] px-2 py-0.5 rounded-md inline-block">
                Exclusive to Members
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Digital Member Card */}
        {activeTab === "card" && (
          <div className="max-w-md mx-auto rounded-3xl bg-[#173D2B] text-white p-8 shadow-xl border border-[#0F2A1D] space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <JhesCafeLogo variant="emblem" size="sm" />
              <div className="text-right">
                <span className="font-serif font-bold text-lg text-[#FFFCF7] block">
                  Jhe&apos;s Cafe&apos;
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#C9AE8B] font-mono">
                  Highland Member Pass
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[#C9AE8B]">Member Name</p>
              <p className="font-serif text-2xl font-bold tracking-tight text-[#FFFCF7]">
                {user.full_name}
              </p>
              <p className="text-xs text-white/70">{user.email}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#C9AE8B] block">
                  Airtable ID
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  {user.id}
                </span>
              </div>

              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[#173D2B]">
                <QrCode className="w-9 h-9" />
              </div>
            </div>

            <p className="text-[10px] text-center text-white/50">
              Present this digital pass at the counter to scan and claim bean points.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
