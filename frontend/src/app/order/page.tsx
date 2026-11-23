"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, type OrderData } from "@/lib/api";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import {
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Coffee,
  Clock,
  RefreshCw,
  FileText,
  BadgeCheck,
  RotateCcw,
} from "lucide-react";

function OrderCheckoutContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "history" ? "history" : "checkout";

  const { items, subtotal, totalCount, clearCart, addItem } = useCart();
  const { user, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"checkout" | "history">(initialTab);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [diningOption, setDiningOption] = useState<"Dine-in" | "Takeaway">("Dine-in");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // User's order history
  const [userOrders, setUserOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Auto-fill from authenticated user profile
  useEffect(() => {
    if (user) {
      setCustomerName(user.full_name || "");
      setCustomerEmail(user.email || "");
      setCustomerPhone(user.phone || "");
      void loadUserOrders();
    }
  }, [user]);

  const loadUserOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !user) return;
    setLoading(true);
    setError(null);

    const payload = {
      order_number: `JHE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: customerName.trim() || user.full_name,
      customer_email: customerEmail.trim() || user.email,
      customer_phone: customerPhone.trim() || user.phone || "+639178889900",
      dining_option: diningOption,
      payment_method: paymentMethod,
      special_notes: notes.trim() || null,
      items: items.map((i) => ({
        product_name: i.name,
        size: i.size || "Regular",
        temperature: i.temperature || "Hot",
        milk_type: i.milk || "Whole Milk",
        sweetness: i.sweetness !== undefined ? i.sweetness : 50,
        add_ons: [
          i.extraShots && i.extraShots > 0 ? `+${i.extraShots} Shot(s)` : null,
          i.toppings && i.toppings.length > 0 ? i.toppings.join(", ") : null,
          i.warming,
          i.addOns && i.addOns.length > 0 ? i.addOns.join(", ") : null,
        ].filter(Boolean).join("; ") || null,
        quantity: i.quantity,
        unit_price: i.price,
        subtotal: i.price * i.quantity,
      })),
      total_amount: subtotal,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to submit order to espresso bar.");
      }

      const orderData = await res.json();
      setSuccessOrder(orderData);
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
            Order Confirmed &amp; Sent to Barista
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
            Order #{successOrder.order_number}
          </h1>
          <p className="text-sm text-[#573B2C] max-w-md mx-auto">
            Mabuhay, {successOrder.customer_name}! Your handcrafted drinks are being prepared right now on our manual espresso bar.
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] max-w-md mx-auto text-left space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#573B2C]">Total Paid:</span>
            <span className="font-bold text-[#173D2B]">₱{successOrder.total_amount || subtotal}.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#573B2C]">Dining Option:</span>
            <span className="font-medium text-[#173D2B]">{successOrder.dining_option}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#573B2C]">Payment Method:</span>
            <span className="font-medium text-[#173D2B] uppercase">{successOrder.payment_method}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#E5DACB]">
            <span className="text-[#573B2C]">Order Status:</span>
            <span className="font-bold uppercase text-emerald-800 tracking-wider">
              {successOrder.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setSuccessOrder(null);
              setActiveTab("history");
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all"
          >
            View My Orders History
          </button>
          <Link
            href="/menu"
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-white text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Order More Coffee
          </Link>
        </div>
      </div>
    );
  }

  // 2. STRICT AUTH GUARD: LOCKED FOR GUESTS / USERS WITHOUT AN ACCOUNT
  if (!user) {
    return (
      <div className="py-16 sm:py-24 bg-[#FFFCF7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

          <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-12 shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

              {/* Left Auth Notice */}
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Exclusive Member Order Page</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B] leading-tight">
                  Sign in or create an account to access the order page.
                </h1>

                <p className="text-sm text-[#573B2C] leading-relaxed">
                  Ang order page ay para lamang sa mga <strong>naka-log in na may account</strong> sa Jhe&apos;s Cafe&apos;. Ito ay upang mai-bind agad ang iyong order sa barista espresso bar, ma-credit ang iyong <strong>loyalty bean points</strong>, at ma-track ang preparasyon nang live.
                </p>

                {/* Direct Google & Apple Redirect Sign In */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    Instant Sign In &amp; Account Binding:
                  </p>
                  <SocialAuthButtons mode="signin" redirectTarget="/order" />
                </div>

                {/* Email Sign In / Register Links */}
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

              {/* Right: Cart Preview so customer knows their order is safe */}
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
                    <Link
                      href="/menu"
                      className="text-xs font-bold text-[#173D2B] hover:underline"
                    >
                      Browse our handcrafted drinks →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-xs">
                        <div className="truncate pr-2">
                          <p className="font-bold text-[#173D2B] truncate">{it.name}</p>
                          <p className="text-[10px] text-[#573B2C]">
                            {it.size} · Qty {it.quantity}
                          </p>
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
            <div className="w-10 h-10 rounded-full bg-emerald-800 text-[#C9AE8B] flex items-center justify-center font-bold text-sm shrink-0">
              {user.full_name ? user.full_name[0].toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#173D2B] text-sm">{user.full_name}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  <BadgeCheck className="w-3 h-3 text-emerald-700" />
                  {user.auth_provider === "google"
                    ? "Google Bound"
                    : user.auth_provider === "apple"
                      ? "Apple ID Bound"
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
                ★ {user.loyalty_points} Bean Points
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
              Authorized ordering, custom preparation, and real-time barista status.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-full border border-[#E5DACB] bg-[#F5F0E7] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("checkout")}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${activeTab === "checkout"
                ? "bg-[#173D2B] text-white shadow-sm"
                : "text-[#573B2C] hover:text-[#173D2B]"
                }`}
            >
              ☕ Place New Order
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${activeTab === "history"
                ? "bg-[#173D2B] text-white shadow-sm"
                : "text-[#573B2C] hover:text-[#173D2B]"
                }`}
            >
              📋 My Orders ({userOrders.length})
            </button>
          </div>
        </div>

        {/* TAB 1: PLACE NEW ORDER */}
        {activeTab === "checkout" && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column: Form Details (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Customer Contact Details (Bound to Account) */}
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    1. Account &amp; Guest Info
                  </h2>
                  <span className="text-[11px] text-[#315640] font-medium">✓ Auto-filled from member account</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-[#173D2B] block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#173D2B] block mb-1">
                      Email Address
                    </label>
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
                      Mobile Number (for SMS &amp; Barista Callout)
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

              {/* Dining Preference */}
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                  2. Dining Preference
                </h2>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => setDiningOption("Dine-in")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${diningOption === "Dine-in"
                      ? "border-[#173D2B] bg-[#173D2B] text-white"
                      : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                      }`}
                  >
                    <p className="font-bold">Dine-in at Highland Lounge</p>
                    <p className="text-[11px] opacity-80 mt-1">Ceramic cup served at cozy walnut lounge</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiningOption("Takeaway")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${diningOption === "Takeaway"
                      ? "border-[#173D2B] bg-[#173D2B] text-white"
                      : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                      }`}
                  >
                    <p className="font-bold">Takeaway / Express Cup</p>
                    <p className="text-[11px] opacity-80 mt-1">Pre-order for fast barista counter pickup</p>
                  </button>
                </div>

                <div>
                  <label className="font-semibold text-[#173D2B] text-xs block mb-1">
                    Barista Customization &amp; Special Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Extra hot, 25% sweetness, oat milk upgrade, or packaging request..."
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7]"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                  3. Payment Method
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { id: "gcash", label: "GCash" },
                    { id: "maya", label: "Maya" },
                    { id: "card", label: "Apple / Card" },
                    { id: "cash", label: "Counter Cash" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${paymentMethod === m.id
                        ? "border-[#173D2B] bg-[#173D2B] text-white font-bold"
                        : "border-[#E5DACB] bg-[#FFFCF7] text-[#573B2C] hover:border-[#173D2B]"
                        }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Summary Sidebar (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-6 sm:p-8 space-y-6 sticky top-28 shadow-sm">
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                  Order Summary
                </h2>

                {items.length === 0 ? (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-[#573B2C]">Your bag is empty.</p>
                    <Link
                      href="/menu"
                      className="inline-block text-xs font-bold text-[#173D2B] underline"
                    >
                      Add drinks from the Menu →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-[#E5DACB]/80 max-h-64 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="pt-3 first:pt-0 flex justify-between items-start text-xs">
                        <div>
                          <p className="font-bold text-[#173D2B]">{item.name}</p>
                          <p className="text-[10px] text-[#573B2C] leading-snug">
                            {item.isBakery
                              ? item.warming || "Freshly Baked"
                              : [
                                  item.size,
                                  item.temperature,
                                  item.milk?.replace(" Milk", ""),
                                  item.sweetness !== undefined ? `${item.sweetness}% sweet` : null,
                                  item.extraShots ? `+${item.extraShots} Shot` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                          </p>
                          <p className="text-[10px] text-[#315640] font-mono">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-mono font-bold text-[#173D2B]">
                          ₱{item.price * item.quantity}.00
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-[#E5DACB] space-y-2 text-xs">
                  <div className="flex justify-between text-[#573B2C]">
                    <span>Subtotal</span>
                    <span className="font-mono">₱{subtotal}.00</span>
                  </div>
                  <div className="flex justify-between text-[#573B2C]">
                    <span>Bean Points to Earn</span>
                    <span className="font-mono text-emerald-800 font-bold">
                      +{Math.floor(subtotal / 50)} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#173D2B] pt-2 border-t border-[#E5DACB]">
                    <span>Total Amount</span>
                    <span className="font-mono text-xl">₱{subtotal}.00</span>
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
                      <span>Sending to Espresso Bar...</span>
                    </div>
                  ) : (
                    <>
                      <span>Send Order to Barista</span>
                      <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

        {/* TAB 2: MY ORDERS HISTORY (ONLY FOR LOGGED IN USERS) */}
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
                <h3 className="font-serif text-xl font-bold text-[#173D2B]">
                  No orders placed yet
                </h3>
                <p className="text-xs text-[#573B2C] max-w-sm mx-auto">
                  You haven&apos;t placed any orders with your account yet. Browse our handcrafted espresso drinks and single-origin pour-overs!
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
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#173D2B]">
                          #{ord.order_number}
                        </span>
                        <span className="text-xs text-[#573B2C]">
                          · {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : "Recent"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <Clock className="w-3 h-3" />
                          {ord.status || "Brewing"}
                        </span>
                      </div>

                      <div className="text-xs text-[#573B2C] space-y-0.5">
                        <p>Dining: <strong className="text-[#173D2B]">{ord.dining_option}</strong> · Payment: <strong className="text-[#173D2B] uppercase">{ord.payment_method}</strong></p>
                        {ord.special_notes && (
                          <p className="italic text-[#315640]">Notes: &ldquo;{ord.special_notes}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E5DACB] gap-1">
                      <span className="font-serif text-xl font-bold text-[#173D2B]">
                        ₱{ord.total_amount}.00
                      </span>
                      <Link
                        href="/track-order"
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
