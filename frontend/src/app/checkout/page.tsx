"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  Banknote,
  Utensils,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  Tag,
  AlertCircle,
  Info,
  ShieldCheck,
  ChevronRight,
  Coffee,
  Package,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import { BRAND_CONFIG } from "@/lib/brandConfig";
import { getProductImage } from "@/lib/productRegistry";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

const SPECIAL_INSTRUCTIONS_LIMIT = 200;

const SEATING_ZONES = [
  "Communal Walnut Table",
  "Window Bar Counter",
  "Quiet Reading Alcove",
  "Garden Patio Lounge",
];

const PAYMENT_OPTIONS = [
  {
    id: "gcash",
    label: "GCash",
    modeLabel: "Demo Simulated · Pending Verification",
    description:
      "Simulated portfolio e-wallet option. Recorded with pending payment status until verified.",
    icon: CreditCard,
  },
  {
    id: "maya",
    label: "Maya",
    modeLabel: "Demo Simulated · Pending Verification",
    description:
      "Simulated portfolio e-wallet option. Recorded with pending payment status until verified.",
    icon: CreditCard,
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    modeLabel: "Demo Simulated · Pending Verification",
    description:
      "Simulated portfolio card checkout. No real card charge occurs; recorded pending verification.",
    icon: CreditCard,
  },
  {
    id: "cash",
    label: "Counter Cash",
    modeLabel: "Pay at Counter · Cashier Confirmed",
    description:
      "Pay in person at the Jhe's Cafe' counter. Confirmed by an authorized cashier upon receipt.",
    icon: Banknote,
  },
] as const;

type PaymentMethodId = (typeof PAYMENT_OPTIONS)[number]["id"];

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutPage() {
  const {
    items,
    subtotal,
    totalCount,
    clearCart,
    appliedPromoCode,
    setAppliedPromoCode,
  } = useCart();
  const { user, isLoading, refreshUser, updateUserLocally } = useAuth();

  // Section A — Contact Information (auto-filled from account, order-specific editable)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Section B — Dining Preference
  const [diningOption, setDiningOption] = useState<"Dine-in" | "Takeaway">("Takeaway");
  const [seatingZone, setSeatingZone] = useState(SEATING_ZONES[0]);
  const [tableNumber, setTableNumber] = useState("");

  // Section C — Special Instructions
  const [notes, setNotes] = useState("");

  // Section D — Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("cash");

  // Promo code (initialized from CartContext if customer applied one in /cart)
  const [promoInput, setPromoInput] = useState("");
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  // Submission & Confirmation state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Auto-fill Section A contact details from verified authenticated account
  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.full_name || "");
      setCustomerEmail(user.email || "");
      setCustomerPhone((prev) => prev || (user.phone ? String(user.phone) : ""));
    }
  }, [user]);

  useEffect(() => {
    if (appliedPromoCode) {
      setPromoInput(appliedPromoCode);
    }
  }, [appliedPromoCode]);

  const isPromoApplied = appliedPromoCode === BRAND_CONFIG.promo.code;
  const discountAmount = isPromoApplied
    ? Math.round(subtotal * BRAND_CONFIG.promo.discountRate)
    : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const pointsToEarn = Math.floor(finalTotal / 50);

  const handleApplyPromo = () => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) {
      setAppliedPromoCode(null);
      setPromoFeedback(null);
      return;
    }
    if (clean === BRAND_CONFIG.promo.code) {
      setAppliedPromoCode(BRAND_CONFIG.promo.code);
      setPromoFeedback(`Promo ${BRAND_CONFIG.promo.code} applied (15% off).`);
    } else {
      setAppliedPromoCode(null);
      setPromoFeedback(`Unknown promo code "${clean}". Try ${BRAND_CONFIG.promo.code}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0 || isSubmittingRef.current) return;

    const cleanName = customerName.trim();
    if (cleanName.length < 2) {
      setError("Please enter a valid contact name (at least 2 characters).");
      return;
    }
    if (notes.trim().length > SPECIAL_INSTRUCTIONS_LIMIT) {
      setError(`Special instructions must be ${SPECIAL_INSTRUCTIONS_LIMIT} characters or fewer.`);
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const trimmedPhone = customerPhone.trim() || (user.phone ? String(user.phone).trim() : "");
    const currentIdempotencyKey = idempotencyKeyRef.current;

    const payload = {
      order_number: `JHE-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      idempotency_key: currentIdempotencyKey,
      customer_name: cleanName,
      customer_email: user.email,
      ...(trimmedPhone ? { customer_phone: trimmedPhone } : {}),
      dining_option: diningOption,
      ...(diningOption === "Dine-in"
        ? {
            table_number: tableNumber.trim() || undefined,
            seating_zone: seatingZone,
          }
        : {}),
      payment_method: paymentMethod,
      promo_code: isPromoApplied ? appliedPromoCode : undefined,
      special_notes: notes.trim().slice(0, SPECIAL_INSTRUCTIONS_LIMIT) || undefined,
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
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": currentIdempotencyKey,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        // NEVER display confirmation screen unless backend saved order cleanly
        throw new Error(resJson.detail || "Order could not be saved. Please review and try again.");
      }

      const confirmedItems = items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        lineTotal: i.price * i.quantity,
        imageUrl: getProductImage(i),
        customizationSummary: i.customizationSummary,
      }));

      setConfirmedOrder({
        ...resJson,
        confirmed_subtotal: resJson.subtotal_before_discount ?? subtotal,
        confirmed_discount: resJson.discount_amount ?? discountAmount,
        confirmed_total: resJson.total_amount ?? finalTotal,
        confirmed_items: confirmedItems,
        confirmed_zone: diningOption === "Dine-in" ? seatingZone : "",
        confirmed_table: diningOption === "Dine-in" ? tableNumber.trim() : "",
        confirmed_notes: notes.trim(),
        loyalty_points_earned: resJson.loyalty_points_earned ?? pointsToEarn,
      });

      // Immediately sync authoritative loyalty balance across Header & Account
      if (typeof resJson.updated_loyalty_points === "number") {
        updateUserLocally({ loyalty_points: resJson.updated_loyalty_points });
      }
      void refreshUser();

      // Clear cart ONLY after backend confirms order saved
      setNotes("");
      setTableNumber("");
      setPromoInput("");
      setPromoFeedback(null);
      idempotencyKeyRef.current = generateIdempotencyKey();
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting order.");
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center bg-[#FFFCF7] min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#573B2C]">Preparing checkout...</span>
        </div>
      </div>
    );
  }

  // Fallback Auth Guard
  if (!user) {
    return (
      <div className="py-16 sm:py-24 bg-[#FFFCF7]">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-10 shadow-sm space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Authentication Required</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
              Sign in to complete checkout
            </h1>
            <p className="text-sm text-[#573B2C] leading-relaxed">
              Sign in to your Jhe&apos;s Cafe&apos; account so your order, receipt, and Bean Points remain securely tied to you.
            </p>
            <SocialAuthButtons mode="signin" redirectTarget="/checkout" />
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?redirect=/checkout"
                className="flex-1 py-3 px-5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In with Email</span>
                <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
              </Link>
              <Link
                href="/register?redirect=/checkout"
                className="flex-1 py-3 px-5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider text-center transition-all flex items-center justify-center"
              >
                <span>Create Account</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SECTION 6 — VERIFIED ORDER CONFIRMATION SCREEN
  if (confirmedOrder) {
    const isCash = String(confirmedOrder.payment_method || "").toLowerCase() === "cash";
    const confirmedItems: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      imageUrl: string;
      customizationSummary?: string;
    }> = Array.isArray(confirmedOrder.confirmed_items) ? confirmedOrder.confirmed_items : [];

    return (
      <div className="py-12 sm:py-16 bg-[#FFFCF7] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.22em] text-[#315640]">
              Order Confirmed &amp; Saved
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B]">
              Thank you, {confirmedOrder.customer_name}!
            </h1>
            <p className="text-sm text-[#573B2C] max-w-lg mx-auto leading-relaxed">
              Your order reference is{" "}
              <strong className="font-mono text-[#173D2B]">#{confirmedOrder.order_number}</strong>.
              {Number(confirmedOrder.loyalty_points_earned || 0) > 0 && (
                <>
                  {" "}You earned{" "}
                  <strong className="text-emerald-800">
                    +{confirmedOrder.loyalty_points_earned} Bean Points
                  </strong>
                  !
                </>
              )}
            </p>
          </div>

          {/* Separated Order Status & Payment Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                  Order Status
                </p>
                <p className="font-serif text-base font-bold text-[#173D2B] capitalize mt-0.5">
                  {confirmedOrder.status || "pending"}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border bg-stone-100 text-stone-800 border-stone-300">
                {confirmedOrder.status || "pending"}
              </span>
            </div>

            <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                  Payment Status ({String(confirmedOrder.payment_method || "").toUpperCase()})
                </p>
                <p className="font-serif text-base font-bold text-[#173D2B] capitalize mt-0.5">
                  {confirmedOrder.payment_status || "pending"}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border bg-amber-50 text-amber-900 border-amber-200">
                {confirmedOrder.payment_status || "pending"}
              </span>
            </div>
          </div>

          {/* Clear Next Steps */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 text-xs leading-relaxed flex items-start gap-3 ${
              isCash
                ? "bg-[#F5F0E7] border-[#C9AE8B] text-[#173D2B]"
                : "bg-amber-50/80 border-amber-200 text-amber-950"
            }`}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#315640]" />
            <div>
              {isCash ? (
                <>
                  <p className="font-bold">Next Steps — Counter Cash Payment</p>
                  <p className="mt-0.5 text-[#573B2C]">
                    Present order reference{" "}
                    <strong className="font-mono text-[#173D2B]">#{confirmedOrder.order_number}</strong> at the counter to pay{" "}
                    <strong>₱{Number(confirmedOrder.confirmed_total || 0).toFixed(2)}</strong>. Your payment status stays{" "}
                    <strong>pending</strong> until confirmed by our cashier.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold">Next Steps — Portfolio Demo Payment</p>
                  <p className="mt-0.5">
                    This portfolio demonstration records online methods with{" "}
                    <strong>payment_status: pending</strong> (no real e-wallet or card charge is processed). You can monitor live order progress anytime on My Orders.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Confirmed Order Summary */}
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">Order Summary</h2>
              <span className="font-mono text-xs font-bold text-[#315640]">
                #{confirmedOrder.order_number}
              </span>
            </div>

            {confirmedItems.length > 0 && (
              <div className="divide-y divide-[#E5DACB]/70">
                {confirmedItems.map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 flex items-start gap-3.5 text-xs">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-[#E5DACB] shrink-0 bg-[#173D2B]"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-serif text-sm font-bold text-[#173D2B]">{item.name}</p>
                      {item.customizationSummary && (
                        <p className="text-[11px] text-[#573B2C]">{item.customizationSummary}</p>
                      )}
                      <p className="text-[11px] font-mono text-[#315640]">
                        Qty {item.quantity} × ₱{item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#173D2B] shrink-0">
                      ₱{item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[#E5DACB] space-y-2 text-xs">
              <div className="flex justify-between text-[#573B2C]">
                <span>Dining Preference</span>
                <span className="font-semibold text-[#173D2B]">
                  {confirmedOrder.dining_option}
                  {confirmedOrder.confirmed_zone ? ` · ${confirmedOrder.confirmed_zone}` : ""}
                  {confirmedOrder.confirmed_table ? ` (Table ${confirmedOrder.confirmed_table})` : ""}
                </span>
              </div>
              {confirmedOrder.confirmed_notes && (
                <div className="flex justify-between gap-4 text-[#573B2C]">
                  <span>Special Instructions</span>
                  <span className="text-right italic text-[#173D2B]">
                    &ldquo;{confirmedOrder.confirmed_notes}&rdquo;
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#573B2C]">
                <span>Subtotal</span>
                <span className="font-mono">
                  ₱{Number(confirmedOrder.confirmed_subtotal || 0).toFixed(2)}
                </span>
              </div>
              {Number(confirmedOrder.confirmed_discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Discount ({confirmedOrder.promo_code})</span>
                  <span className="font-mono">
                    -₱{Number(confirmedOrder.confirmed_discount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#173D2B] pt-2 border-t border-[#E5DACB]">
                <span className="font-serif">Total Amount</span>
                <span className="font-mono text-xl">
                  ₱{Number(confirmedOrder.confirmed_total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/my-orders"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all text-center shadow-sm inline-flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4 text-[#C9AE8B]" />
              <span>View in My Orders</span>
            </Link>
            <Link
              href={`/track-order?code=${encodeURIComponent(confirmedOrder.order_number)}`}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-all text-center"
            >
              Track Live Status
            </Link>
            <Link
              href="/menu"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-[#573B2C] hover:text-[#173D2B] text-xs font-semibold uppercase tracking-wider text-center"
            >
              Back to Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY CART GUARD — Never allow checkout submission on an empty cart
  if (items.length === 0) {
    return (
      <div className="py-16 sm:py-24 bg-[#FFFCF7] min-h-[70vh]">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-10 sm:p-14 shadow-xs space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center mx-auto text-[#573B2C]">
              <ShoppingBag className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173D2B]">
                Your cart is empty
              </h1>
              <p className="text-sm text-[#573B2C] leading-relaxed">
                Add at least one handcrafted drink or pastry to your bag before checking out.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/menu"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <Coffee className="w-4 h-4 text-[#C9AE8B]" />
                <span>Return to Menu</span>
              </Link>
              <Link
                href="/my-orders"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full border border-[#E5DACB] text-[#573B2C] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-all inline-flex items-center justify-center"
              >
                <span>View My Orders</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FOCUSED CHECKOUT PAGE (Sections A–E — zero account dashboard or order history clutter)
  return (
    <div className="py-10 sm:py-14 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#573B2C]">
          <Link href="/" className="hover:text-[#173D2B] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <Link href="/cart" className="hover:text-[#173D2B] transition-colors">
            Cart
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#173D2B]">Checkout</span>
        </nav>

        {/* Clean Checkout Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DACB] pb-5">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B] tracking-tight">
              Checkout
            </h1>
            <p className="text-xs sm:text-sm text-[#573B2C] mt-1">
              Review your order details and select how you&apos;d like to dine and pay.
            </p>
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315640] hover:text-[#173D2B]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Cart</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sections A–D */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION A — CONTACT INFORMATION */}
            <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                    Section A
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    Contact Information
                  </h2>
                </div>
                <span className="text-[11px] text-[#315640] font-medium bg-[#F5F0E7] px-3 py-1 rounded-full">
                  Auto-filled from your account
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="checkout-name" className="font-semibold text-[#173D2B] block mb-1.5">
                    Customer Name <span className="text-amber-800">*</span>
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    minLength={2}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-email" className="font-semibold text-[#173D2B] block mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    readOnly
                    value={customerEmail}
                    className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#573B2C] bg-[#F5F0E7]/70 font-mono cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-phone" className="font-semibold text-[#173D2B] block mb-1.5">
                    Mobile Number <span className="text-[#573B2C]/60 font-normal">(for pickup or order updates)</span>
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0917 888 9900"
                    className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] font-mono bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                  />
                </div>
              </div>
            </section>

            {/* SECTION B — DINING PREFERENCE */}
            <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                  Section B
                </span>
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                  Dining Preference
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDiningOption("Dine-in")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    diningOption === "Dine-in"
                      ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm"
                      : "bg-[#FFFCF7] text-[#173D2B] border-[#E5DACB] hover:border-[#C9AE8B]"
                  }`}
                >
                  <Utensils
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      diningOption === "Dine-in" ? "text-[#C9AE8B]" : "text-[#315640]"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm">Dine-in</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        diningOption === "Dine-in" ? "text-white/75" : "text-[#573B2C]"
                      }`}
                    >
                      Served fresh to your café table
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDiningOption("Takeaway")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    diningOption === "Takeaway"
                      ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm"
                      : "bg-[#FFFCF7] text-[#173D2B] border-[#E5DACB] hover:border-[#C9AE8B]"
                  }`}
                >
                  <ShoppingBag
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      diningOption === "Takeaway" ? "text-[#C9AE8B]" : "text-[#315640]"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm">Takeaway / Counter Pickup</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        diningOption === "Takeaway" ? "text-white/75" : "text-[#573B2C]"
                      }`}
                    >
                      Packed ready for express counter pickup
                    </p>
                  </div>
                </button>
              </div>

              {diningOption === "Dine-in" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  <div>
                    <label htmlFor="seating-zone" className="font-semibold text-[#173D2B] block mb-1.5">
                      Preferred Seating Area
                    </label>
                    <select
                      id="seating-zone"
                      value={seatingZone}
                      onChange={(e) => setSeatingZone(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                    >
                      {SEATING_ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="table-number" className="font-semibold text-[#173D2B] block mb-1.5">
                      Table Number <span className="text-[#573B2C]/60 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="table-number"
                      type="text"
                      maxLength={20}
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="e.g. Table 4"
                      className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* SECTION C — SPECIAL INSTRUCTIONS */}
            <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                    Section C
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    Special Instructions
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#573B2C]">
                  {notes.length} / {SPECIAL_INSTRUCTIONS_LIMIT}
                </span>
              </div>

              <textarea
                id="checkout-notes"
                rows={3}
                maxLength={SPECIAL_INSTRUCTIONS_LIMIT}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional barista or packaging note (e.g. less ice, separate cup sleeve, allergen note)..."
                className="w-full rounded-2xl border border-[#E5DACB] px-4 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
              />
            </section>

            {/* SECTION D — PAYMENT METHOD */}
            <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                    Section D
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    Payment Method
                  </h2>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                  Pending Until Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                        selected
                          ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm"
                          : "bg-[#FFFCF7] text-[#173D2B] border-[#E5DACB] hover:border-[#C9AE8B]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 font-bold text-sm">
                          <Icon
                            className={`w-4 h-4 ${selected ? "text-[#C9AE8B]" : "text-[#315640]"}`}
                          />
                          <span>{opt.label}</span>
                        </span>
                      </div>
                      <p
                        className={`text-[10px] font-mono uppercase ${
                          selected ? "text-[#C9AE8B]" : "text-[#315640]"
                        }`}
                      >
                        {opt.modeLabel}
                      </p>
                      <p
                        className={`text-[11px] leading-snug ${
                          selected ? "text-white/75" : "text-[#573B2C]"
                        }`}
                      >
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: SECTION E — ORDER SUMMARY */}
          <aside className="lg:col-span-5 xl:col-span-4 sticky top-28">
            <section className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-6 sm:p-7 space-y-5 shadow-md">
              <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                    Section E
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    Order Summary
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#573B2C]">
                  {totalCount} {totalCount === 1 ? "item" : "items"}
                </span>
              </div>

              {/* Itemized List */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-xs">
                    <img
                      src={getProductImage(item)}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#E5DACB] shrink-0 bg-[#173D2B]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-[#173D2B] truncate">{item.name}</p>
                      {item.customizationSummary && (
                        <p className="text-[11px] text-[#573B2C] line-clamp-2">
                          {item.customizationSummary}
                        </p>
                      )}
                      <p className="text-[11px] font-mono text-[#315640]">
                        Qty {item.quantity} × ₱{item.price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-[#173D2B] shrink-0">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="pt-3 border-t border-[#E5DACB] space-y-2">
                <label
                  htmlFor="checkout-promo"
                  className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] flex items-center gap-1.5"
                >
                  <Tag className="w-3 h-3 text-[#315640]" />
                  <span>Promo Code (Demo: {BRAND_CONFIG.promo.code})</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="checkout-promo"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder={BRAND_CONFIG.promo.code}
                    className="flex-1 rounded-xl border border-[#E5DACB] bg-white px-3 py-2 text-xs font-mono uppercase text-[#173D2B]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 rounded-xl bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {promoFeedback && (
                  <p className="text-[11px] text-[#315640]">{promoFeedback}</p>
                )}
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-[#E5DACB] space-y-2 text-xs text-[#573B2C]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-[#173D2B]">
                    ₱{subtotal.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Discount ({appliedPromoCode})</span>
                    <span className="font-mono">-₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bean Points to Earn</span>
                  </span>
                  <span className="font-mono font-bold">+{pointsToEarn} pts</span>
                </div>

                <div className="flex justify-between items-baseline pt-3 border-t border-[#E5DACB] text-[#173D2B]">
                  <span className="font-serif text-base font-bold">Total Amount</span>
                  <span className="font-serif text-3xl font-bold tracking-tight">
                    ₱{finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {submitting ? "Placing Order..." : `Place Order · ₱${finalTotal.toFixed(2)}`}
                </span>
                {!submitting && <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />}
              </button>

              <p className="text-[11px] text-center text-[#573B2C] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#315640]" />
                <span>Server-validated pricing · Live Airtable order queue</span>
              </p>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
