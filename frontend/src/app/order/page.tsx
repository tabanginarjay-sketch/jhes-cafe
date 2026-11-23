"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";
import {
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  Sparkles,
  User,
  Coffee,
} from "lucide-react";

export default function OrderCheckoutPage() {
  const { items, subtotal, totalCount, clearCart } = useCart();
  const { user, isLoading } = useAuth();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [diningOption, setDiningOption] = useState<"Dine-in" | "Takeaway">("Dine-in");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill from authenticated user profile
  useEffect(() => {
    if (user) {
      setCustomerName(user.full_name || "");
      setCustomerEmail(user.email || "");
      setCustomerPhone(user.phone || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !user) return;
    setLoading(true);
    setError(null);

    const payload = {
      order_number: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: customerName.trim() || user.full_name,
      customer_email: customerEmail.trim() || user.email,
      customer_phone: customerPhone.trim() || user.phone || null,
      dining_option: diningOption,
      payment_method: paymentMethod,
      special_notes: notes.trim() || null,
      items: items.map((i) => ({
        product_name: i.name,
        size: i.size || "Grande 16oz",
        temperature: i.temperature || "Hot",
        milk_type: i.milk || "Whole Milk",
        sweetness: 50,
        quantity: i.quantity,
        unit_price: i.price,
        subtotal: i.price * i.quantity,
      })),
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
            <span className="font-bold text-[#173D2B]">₱{successOrder.total_amount}.00</span>
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
          <Link
            href="/track-order"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Track Order Live
          </Link>
          <Link
            href="/account"
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-white text-xs font-semibold uppercase tracking-wider transition-all"
          >
            View Account Profile
          </Link>
        </div>
      </div>
    );
  }

  // 2. AUTH GUARD: NOT LOGGED IN SCREEN (Requires Account / Login to Buy)
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
                  <span>Account Required to Buy</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B] leading-tight">
                  Sign in or create an account to complete your purchase.
                </h1>

                <p className="text-sm text-[#573B2C] leading-relaxed">
                  Bago ka makabili o mag-checkout ng kape, kinakailangang mag-sign in o mag-create ng account. Ito ay upang maiugnay ang iyong order sa aming espresso bar, ma-credit ang iyong <strong>loyalty bean points</strong>, at ma-track ang preparasyon nang live.
                </p>

                <div className="p-4 rounded-2xl bg-[#F5F0E7] border border-[#E5DACB] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#173D2B] font-semibold">
                    <Sparkles className="w-4 h-4 text-[#C9AE8B]" />
                    <span>Member Benefits with Every Order:</span>
                  </div>
                  <ul className="text-[11px] text-[#573B2C] space-y-1 list-disc list-inside">
                    <li>1 Loyalty Bean Point bawat ₱50 purchase</li>
                    <li>Digital order receipt &amp; live preparation tracking</li>
                    <li>Free drink voucher once you hit 400 bean points</li>
                  </ul>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/login?redirect=/order"
                    className="flex-1 py-3.5 px-6 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Sign In to Checkout</span>
                    <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                  </Link>
                  <Link
                    href="/register?redirect=/order"
                    className="flex-1 py-3.5 px-6 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider text-center transition-all flex items-center justify-center"
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
                    <span className="font-serif font-bold text-sm text-[#173D2B]">Your Selected Items</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#573B2C]">
                    {totalCount} {totalCount === 1 ? "item" : "items"}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-[#573B2C] py-4 text-center">
                    Your coffee bag is currently empty.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {items.map((it) => (
                      <div key={it.id} className="text-xs flex justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#173D2B]">{it.name}</p>
                          <p className="text-[10px] text-[#573B2C]">{it.size} · {it.temperature} · Qty: {it.quantity}</p>
                        </div>
                        <span className="font-mono font-bold text-[#173D2B]">
                          ₱{it.price * it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-[#E5DACB] flex justify-between items-center text-sm font-bold text-[#173D2B]">
                  <span>Total Amount</span>
                  <span className="font-mono text-lg">₱{subtotal}.00</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // 3. LOGGED IN CHECKOUT FORM (User is authenticated)
  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#315640]">
            Review &amp; Place Order
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B] mt-1">
            Checkout &amp; Express Order
          </h1>
        </div>

        {/* Authenticated Member Verified Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <span className="font-semibold">Logged in as {user.full_name}</span>
              <span className="text-emerald-800 ml-2">({user.email})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white font-mono text-[10px] uppercase font-bold">
              {user.role} Member
            </span>
            <span className="font-mono font-bold text-emerald-900">
              {user.loyalty_points} Bean Points
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Form (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Customer Information (Pre-filled from Member Profile) */}
            <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-[#173D2B] flex items-center gap-2">
                <User className="w-4 h-4 text-[#315640]" />
                <span>Customer Information</span>
              </h2>

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
                  <label className="font-semibold text-[#173D2B] block mb-1">Mobile Contact</label>
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

            {/* Dining & Delivery Choice */}
            <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                Dining Preference
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
                  <p className="font-bold">Dine-in</p>
                  <p className="text-[11px] opacity-80 mt-1">Enjoy inside our cozy walnut lounge</p>
                </button>

                <button
                  type="button"
                  onClick={() => setDiningOption("Takeaway")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${diningOption === "Takeaway"
                      ? "border-[#173D2B] bg-[#173D2B] text-white"
                      : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                    }`}
                >
                  <p className="font-bold">Takeaway / Pickup</p>
                  <p className="text-[11px] opacity-80 mt-1">Pre-order for fast barista counter pickup</p>
                </button>
              </div>

              <div>
                <label className="font-semibold text-[#173D2B] text-xs block mb-1">
                  Barista Special Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Extra ice, less sweet, or packaging instructions..."
                  className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                Payment Method
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { id: "gcash", label: "GCash" },
                  { id: "maya", label: "Maya" },
                  { id: "card", label: "Debit/Credit Card" },
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
                <p className="text-xs text-[#573B2C]">Your bag is empty.</p>
              ) : (
                <div className="space-y-3 divide-y divide-[#E5DACB]/80 max-h-64 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 flex justify-between items-start text-xs">
                      <div>
                        <p className="font-bold text-[#173D2B]">{item.name}</p>
                        <p className="text-[10px] text-[#573B2C]">
                          {item.size} · {item.temperature} · {item.milk}
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
                  <span>Bean Points Earned</span>
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
                    <span>Placing order...</span>
                  </div>
                ) : (
                  <>
                    <span>Confirm &amp; Place Order</span>
                    <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
