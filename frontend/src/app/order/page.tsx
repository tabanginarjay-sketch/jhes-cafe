"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, type OrderData } from "@/lib/api";
import { BRAND_CONFIG } from "@/lib/brandConfig";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { getProductImage } from "@/lib/productRegistry";
import {
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  Coffee,
  Clock,
  RefreshCw,
  BadgeCheck,
  Tag,
  X,
} from "lucide-react";

function OrderCheckoutContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "history" ? "history" : "checkout";

  const { items, subtotal, totalCount, clearCart } = useCart();
  const { user, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"checkout" | "history">(initialTab);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [diningOption, setDiningOption] = useState<"Dine-in" | "Takeaway">("Dine-in");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [notes, setNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // User's live order history from Airtable
  const [userOrders, setUserOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const discountAmount =
    appliedPromo === BRAND_CONFIG.promo.code
      ? Math.round(subtotal * BRAND_CONFIG.promo.discountRate)
      : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Auto-fill from authenticated user profile
  useEffect(() => {
    if (user) {
      setCustomerName(user.full_name || "");
      setCustomerEmail(user.email || "");
      setCustomerPhone(user.phone ? String(user.phone) : "");
      void loadUserOrders();
    }
  }, [user]);

  const loadUserOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const allOrders: OrderData[] = await res.json();
        const filtered = allOrders.filter(
          (o) =>
            o.customer_email?.toLowerCase() === user.email.toLowerCase() ||
            o.customer_name?.toLowerCase() === user.full_name.toLowerCase()
        );
        setUserOrders(filtered);
      }
    } catch (e) {
      console.warn("Could not load user order history", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleApplyPromo = () => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) {
      setAppliedPromo(null);
      setPromoFeedback(null);
      return;
    }
    if (clean === BRAND_CONFIG.promo.code) {
      setAppliedPromo(BRAND_CONFIG.promo.code);
      setPromoFeedback(`Demo promo ${BRAND_CONFIG.promo.code} applied (15% off).`);
    } else {
      setAppliedPromo(null);
      setPromoFeedback(`Unknown promo code "${clean}". Try ${BRAND_CONFIG.promo.code}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !user) return;
    setLoading(true);
    setError(null);

    const trimmedPhone = customerPhone.trim() || (user.phone ? String(user.phone).trim() : "");

    const payload = {
      order_number: `JHE-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      customer_name: customerName.trim() || user.full_name,
      customer_email: customerEmail.trim() || user.email,
      ...(trimmedPhone ? { customer_phone: trimmedPhone } : {}),
      dining_option: diningOption,
      payment_method: paymentMethod,
      promo_code: appliedPromo || undefined,
      special_notes: notes.trim() || undefined,
      items: items.map((i) => {
        const isFood = Boolean(i.isBakery);
        const addOnsList = isFood
          ? [
              i.servingStyle,
              i.warming,
              i.finishes && i.finishes.length > 0 ? i.finishes.join(", ") : null,
              i.addOns && i.addOns.length > 0 ? i.addOns.join(", ") : null,
            ]
          : [
              i.extraShots && i.extraShots > 0 ? `+${i.extraShots} Shot(s)` : null,
              i.toppings && i.toppings.length > 0 ? i.toppings.join(", ") : null,
            ];

        return {
          product_id: i.productId,
          product_name: i.name,
          is_bakery: isFood,
          // Strictly omit drink-only fields (cup size, Hot/Iced, milk, sweetness) for food/pastry/cake items
          ...(isFood
            ? {}
            : {
                size: i.size || "Grande 16oz",
                temperature: i.temperature || "Hot",
                milk_type: i.milk || "Whole Milk",
                sweetness: i.sweetness !== undefined ? i.sweetness : 50,
              }),
          add_ons: addOnsList.filter(Boolean).join("; ") || undefined,
          customization_summary: i.customizationSummary || undefined,
          quantity: i.quantity,
          unit_price: i.price,
          subtotal: i.price * i.quantity,
        };
      }),
      total_amount: finalTotal,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to submit order to espresso bar.");
      }

      const orderData = await res.json();
      setSuccessOrder({
        ...orderData,
        confirmed_total: orderData.total_amount ?? finalTotal,
        confirmed_items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          imageUrl: getProductImage(i),
          customizationSummary: i.customizationSummary,
        })),
      });
      setAppliedPromo(null);
      setPromoInput("");
      setPromoFeedback(null);
      clearCart();
      void loadUserOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error placing order");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center bg-[#FFFCF7]">
        <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Success Order Confirmation Screen
  if (successOrder) {
    return (
      <div className="py-20 max-w-2xl mx-auto px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#315640]">
            Order Placed &amp; Recorded in Database
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
            Order #{successOrder.order_number}
          </h1>
          <p className="text-sm text-[#573B2C] max-w-md mx-auto">
            Thank you, {successOrder.customer_name}! Your order has been submitted to the Jhe&apos;s Cafe&apos; queue and awaits payment confirmation at the counter/gateway.
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] max-w-md mx-auto text-left space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#573B2C]">Total Due:</span>
            <span className="font-bold text-[#173D2B]">
              ₱{Number(successOrder.confirmed_total ?? successOrder.total_amount ?? 0).toFixed(2)}
            </span>
          </div>
          {successOrder.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-800">
              <span>Promo Discount ({successOrder.promo_code}):</span>
              <span className="font-mono font-semibold">-₱{Number(successOrder.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#573B2C]">Dining Option:</span>
            <span className="font-medium text-[#173D2B]">{successOrder.dining_option}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#573B2C]">Payment Method:</span>
            <span className="font-medium text-[#173D2B] uppercase">{successOrder.payment_method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#573B2C]">Payment Status:</span>
            <span className="font-bold uppercase text-amber-800 tracking-wider">
              {successOrder.payment_status || "pending"}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#E5DACB]">
            <span className="text-[#573B2C]">Preparation Status:</span>
            <span className="font-bold uppercase text-emerald-800 tracking-wider">
              {successOrder.status || "pending"}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={`/track-order?code=${encodeURIComponent(successOrder.order_number)}`}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Track This Order Live
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccessOrder(null);
              setActiveTab("history");
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            View My Orders History
          </button>
        </div>
      </div>
    );
  }

  // 2. STRICT AUTH GUARD: LOCKED FOR GUESTS
  if (!user) {
    return (
      <div className="py-16 sm:py-24 bg-[#FFFCF7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-12 shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Member Account Required</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B] leading-tight">
                  Sign in or create an account to place your order.
                </h1>

                <p className="text-sm text-[#573B2C] leading-relaxed">
                  Checkout at <strong>Jhe&apos;s Cafe&apos;</strong> requires a signed-in member account so your order is linked to your history, loyalty points, and live barista tracking.
                </p>

                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    Instant OAuth Sign In:
                  </p>
                  <SocialAuthButtons mode="signin" redirectTarget="/order" />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login?redirect=/order"
                    className="flex-1 py-3 px-5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2"
                  >
                    <span>Sign In with Email</span>
                    <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                  </Link>
                  <Link
                    href="/register?redirect=/order"
                    className="flex-1 py-3 px-5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider text-center transition-all flex items-center justify-center"
                  >
                    <span>Create New Account</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#173D2B]" />
                    <span className="font-serif font-bold text-sm text-[#173D2B]">Your Bagged Items</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#573B2C]">
                    {totalCount} {totalCount === 1 ? "item" : "items"}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <Coffee className="w-8 h-8 text-[#C9AE8B] mx-auto opacity-70" />
                    <p className="text-xs text-[#573B2C]">Bag is currently empty.</p>
                    <Link href="/menu" className="text-xs font-bold text-[#173D2B] hover:underline">
                      Browse our menu →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={getProductImage(it)}
                            alt={it.name}
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-[#E5DACB]"
                          />
                          <div className="truncate">
                            <p className="font-bold text-[#173D2B] truncate">{it.name}</p>
                            <p className="text-[10px] text-[#573B2C] truncate">
                              {it.isBakery ? it.customizationSummary || "Bakery Item" : it.size || "Standard"} · Qty {it.quantity}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[#173D2B] shrink-0">
                          ₱{it.price * it.quantity}.00
                        </span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-[#E5DACB] flex justify-between font-bold text-sm text-[#173D2B]">
                      <span>Estimated Total</span>
                      <span className="font-mono">₱{subtotal}.00</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. LOGGED-IN CUSTOMER ORDER PAGE
  return (
    <div className="py-12 sm:py-16 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Logged-In Account Verification Banner */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-10 h-10 rounded-full object-cover border border-emerald-300 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-800 text-[#C9AE8B] flex items-center justify-center font-bold text-sm shrink-0">
                {user.full_name ? user.full_name[0].toUpperCase() : "U"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#173D2B] text-sm">{user.full_name}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  <BadgeCheck className="w-3 h-3 text-emerald-700" />
                  {user.auth_provider === "google"
                    ? "Google Verified"
                    : user.auth_provider === "facebook"
                      ? "Facebook Verified"
                      : "Verified Member"}
                </span>
              </div>
              <p className="text-xs text-[#573B2C] font-mono">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#573B2C] block">Loyalty Balance</span>
              <span className="text-xs font-mono font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                ★ {user.loyalty_points ?? 0} Bean Points
              </span>
            </div>
          </div>
        </div>

        {/* Page Title & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DACB] pb-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
              Order &amp; Barista Portal
            </h1>
            <p className="text-xs text-[#573B2C] mt-1">
              Authorized ordering, custom preparation, and live Airtable order queue.
            </p>
          </div>

          <div className="flex rounded-full border border-[#E5DACB] bg-[#F5F0E7] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("checkout")}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "checkout"
                  ? "bg-[#173D2B] text-white shadow-sm"
                  : "text-[#573B2C] hover:text-[#173D2B]"
              }`}
            >
              Place New Order
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-[#173D2B] text-white shadow-sm"
                  : "text-[#573B2C] hover:text-[#173D2B]"
              }`}
            >
              My Orders ({userOrders.length})
            </button>
          </div>
        </div>

        {/* TAB 1: PLACE NEW ORDER */}
        {activeTab === "checkout" && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Customer Details */}
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    1. Account &amp; Guest Info
                  </h2>
                  <span className="text-[11px] text-[#315640] font-medium">Auto-filled from member account</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-[#173D2B] block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#173D2B] block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#173D2B] block mb-1">
                      Mobile Number <span className="text-[10px] font-normal text-[#573B2C]/70">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+63 917 123 4567"
                      className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Dining Preference */}
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">2. Dining Preference</h2>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => setDiningOption("Dine-in")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      diningOption === "Dine-in"
                        ? "border-[#173D2B] bg-[#173D2B] text-white"
                        : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                    }`}
                  >
                    <p className="font-bold">Dine-in at Lounge</p>
                    <p className="text-[11px] opacity-80 mt-1">Served fresh to your café table</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiningOption("Takeaway")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      diningOption === "Takeaway"
                        ? "border-[#173D2B] bg-[#173D2B] text-white"
                        : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                    }`}
                  >
                    <p className="font-bold">Takeaway / Counter Pickup</p>
                    <p className="text-[11px] opacity-80 mt-1">Pre-order for express barista pickup</p>
                  </button>
                </div>

                <div>
                  <label className="font-semibold text-[#173D2B] text-xs block mb-1">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Packaging note, allergen preference, or table number..."
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7]"
                  />
                </div>
              </div>

              {/* 3. Payment Method */}
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">3. Payment Method</h2>
                  <span className="text-[10px] font-mono uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Pending until confirmed
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { id: "gcash", label: "GCash" },
                    { id: "maya", label: "Maya" },
                    { id: "card", label: "Credit / Debit Card" },
                    { id: "cash", label: "Counter Cash" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? "border-[#173D2B] bg-[#173D2B] text-white font-bold"
                          : "border-[#E5DACB] bg-[#FFFCF7] text-[#573B2C] hover:border-[#173D2B]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#573B2C]">
                  Orders are recorded with <strong>pending</strong> payment status until verified by the cashier or payment gateway.
                </p>
              </div>
            </div>

            {/* Right Summary Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-6 sm:p-8 space-y-5 sticky top-28 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">Order Summary</h2>

                {items.length === 0 ? (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-[#573B2C]">Your bag is empty.</p>
                    <Link href="/menu" className="inline-block text-xs font-bold text-[#173D2B] underline">
                      Add items from the Menu →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-[#E5DACB]/80 max-h-64 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="pt-3 first:pt-0 flex items-start gap-3 text-xs">
                        <img
                          src={getProductImage(item)}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#E5DACB] shrink-0 bg-[#173D2B]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#173D2B] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#573B2C] leading-snug line-clamp-2">
                            {item.customizationSummary ||
                              (item.isBakery
                                ? item.warming || item.servingStyle || "Freshly Baked"
                                : [
                                    item.size,
                                    item.temperature,
                                    item.milk?.replace(" Milk", ""),
                                    item.sweetness !== undefined ? `${item.sweetness}% sweet` : null,
                                    item.extraShots ? `+${item.extraShots} Shot` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · "))}
                          </p>
                          <p className="text-[10px] text-[#315640] font-mono mt-0.5">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-mono font-bold text-[#173D2B] shrink-0">
                          ₱{item.price * item.quantity}.00
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Promo Code Input */}
                <div className="pt-3 border-t border-[#E5DACB] space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-[#315640]" />
                    <span>Promo Code (Demo: {BRAND_CONFIG.promo.code})</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder={BRAND_CONFIG.promo.code}
                      className="flex-1 rounded-xl border border-[#E5DACB] bg-white px-3 py-2 text-xs font-mono uppercase text-[#173D2B]"
                    />
                    {appliedPromo ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromo(null);
                          setPromoInput("");
                          setPromoFeedback(null);
                        }}
                        className="px-3 py-2 rounded-xl border border-[#E5DACB] bg-white text-[#573B2C] hover:text-rose-700 text-xs font-semibold cursor-pointer"
                        title="Remove promo code"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-4 py-2 rounded-xl bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold cursor-pointer"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  {promoFeedback && (
                    <p
                      className={`text-[11px] font-medium ${
                        appliedPromo ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {promoFeedback}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#E5DACB] space-y-2 text-xs">
                  <div className="flex justify-between text-[#573B2C]">
                    <span>Subtotal</span>
                    <span className="font-mono">₱{subtotal}.00</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>Promo ({appliedPromo})</span>
                      <span className="font-mono">-₱{discountAmount}.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#573B2C]">
                    <span>Bean Points to Earn</span>
                    <span className="font-mono text-emerald-800 font-bold">
                      +{Math.floor(finalTotal / 50)} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#173D2B] pt-2 border-t border-[#E5DACB]">
                    <span>Total Amount</span>
                    <span className="font-mono text-xl">₱{finalTotal}.00</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Order...</span>
                    </div>
                  ) : (
                    <>
                      <span>Place Order · ₱{finalTotal}</span>
                      <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: MY ORDERS HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-[#173D2B]">
                Your Order History &amp; Live Barista Queue
              </h2>
              <button
                type="button"
                onClick={() => void loadUserOrders()}
                disabled={loadingOrders}
                className="inline-flex items-center gap-1.5 text-xs text-[#315640] font-semibold hover:underline cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
                <span>Refresh Queue</span>
              </button>
            </div>

            {loadingOrders ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
              </div>
            ) : userOrders.length === 0 ? (
              <div className="p-12 rounded-3xl border border-[#E5DACB] bg-white text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center mx-auto text-[#173D2B]">
                  <Coffee className="w-8 h-8 text-[#C9AE8B]" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#173D2B]">No orders placed yet</h3>
                <p className="text-xs text-[#573B2C] max-w-sm mx-auto">
                  Orders placed with your account will appear here in real time from our database.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("checkout")}
                  className="px-6 py-3 rounded-full bg-[#173D2B] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#315640] transition-all cursor-pointer"
                >
                  Place Your First Order →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-6 rounded-3xl border border-[#E5DACB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-bold text-[#173D2B]">
                          #{ord.order_number}
                        </span>
                        <span className="text-xs text-[#573B2C]">
                          · {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : "Recent"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <Clock className="w-3 h-3" />
                          {ord.status || "pending"}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            ord.payment_status === "paid"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          Payment: {ord.payment_status || "pending"}
                        </span>
                      </div>

                      <div className="text-xs text-[#573B2C] space-y-0.5">
                        <p>
                          Dining: <strong className="text-[#173D2B]">{ord.dining_option}</strong> · Method:{" "}
                          <strong className="text-[#173D2B] uppercase">{ord.payment_method}</strong>
                        </p>
                        {ord.special_notes && (
                          <p className="italic text-[#315640]">Notes: &ldquo;{ord.special_notes}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E5DACB] gap-1">
                      <span className="font-serif text-xl font-bold text-[#173D2B]">
                        ₱{Number(ord.total_amount || 0).toFixed(2)}
                      </span>
                      <Link
                        href={`/track-order?code=${encodeURIComponent(ord.order_number)}`}
                        className="text-xs font-semibold text-[#315640] hover:underline"
                      >
                        Track Live Status →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFCF7] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <OrderCheckoutContent />
    </Suspense>
  );
}
