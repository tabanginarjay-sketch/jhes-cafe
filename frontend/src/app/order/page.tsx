"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
  CreditCard,
  Smartphone,
  Wallet,
  Banknote,
  Info,
  Store,
  UtensilsCrossed,
  MessageSquare,
} from "lucide-react";

const SEATING_ZONES = [
  "Communal Walnut Table",
  "Sunlit Botanical Lounge",
  "Espresso & Pour-Over Bar",
  "Outdoor Highland Balcony",
];

const SPECIAL_INSTRUCTIONS_LIMIT = 200;

type PaymentMethodId = "gcash" | "maya" | "card" | "cash";

interface PaymentOptionConfig {
  id: PaymentMethodId;
  label: string;
  badge: string;
  isSimulated: boolean;
  subtitle: string;
}

const PAYMENT_OPTIONS: PaymentOptionConfig[] = [
  {
    id: "gcash",
    label: "GCash",
    badge: "Simulated Demo",
    isSimulated: true,
    subtitle: "Portfolio demo e-wallet flow",
  },
  {
    id: "maya",
    label: "Maya",
    badge: "Simulated Demo",
    isSimulated: true,
    subtitle: "Portfolio demo e-wallet flow",
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    badge: "Simulated Demo",
    isSimulated: true,
    subtitle: "No real card stored or charged",
  },
  {
    id: "cash",
    label: "Counter Cash",
    badge: "Pay at Counter",
    isSimulated: false,
    subtitle: "Pay cashier upon pickup or seating",
  },
];

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `jhe-idem-${crypto.randomUUID()}`;
  }
  return `jhe-idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrderStatusBadgeClass(status?: string): string {
  switch ((status || "pending").toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "ready":
      return "bg-teal-100 text-teal-900 border-teal-300";
    case "preparing":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "confirmed":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "cancelled":
      return "bg-rose-100 text-rose-900 border-rose-300";
    default:
      return "bg-stone-100 text-stone-800 border-stone-300";
  }
}

function getPaymentStatusBadgeClass(status?: string): string {
  switch ((status || "pending").toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "failed":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "refunded":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "unpaid":
      return "bg-stone-100 text-stone-700 border-stone-300";
    default:
      return "bg-amber-50 text-amber-900 border-amber-200";
  }
}

function OrderCheckoutContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "history" ? "history" : "checkout";

  const { items, subtotal, totalCount, clearCart } = useCart();
  const { user, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"checkout" | "history">(initialTab);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Dining preference + conditional dine-in details
  const [diningOption, setDiningOption] = useState<"Dine-in" | "Takeaway">("Dine-in");
  const [tableNumber, setTableNumber] = useState("");
  const [seatingZone, setSeatingZone] = useState(SEATING_ZONES[0]);

  // Dedicated Special Instructions (200-char limit)
  const [notes, setNotes] = useState("");

  // Payment & Promo
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("gcash");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  // Submission & Idempotency State
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Authenticated customer's live order history from Airtable
  const [userOrders, setUserOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const discountAmount =
    appliedPromo === BRAND_CONFIG.promo.code
      ? Math.round(subtotal * BRAND_CONFIG.promo.discountRate)
      : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Regenerate idempotency key whenever the cart composition or promo changes
  const cartFingerprint = `${items.map((i) => `${i.id}:${i.quantity}:${i.price}`).join(",")}|${appliedPromo || ""}`;
  useEffect(() => {
    idempotencyKeyRef.current = generateIdempotencyKey();
  }, [cartFingerprint]);

  // Auto-fill verified account details and load customer-only order history
  useEffect(() => {
    if (user) {
      setCustomerName(user.full_name || "");
      setCustomerEmail(user.email || "");
      setCustomerPhone(user.phone ? String(user.phone) : "");
      void loadUserOrders();
    } else {
      setUserOrders([]);
      setSuccessOrder(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            o.customer_email &&
            o.customer_email.toLowerCase().trim() === user.email.toLowerCase().trim()
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
    if (items.length === 0 || !user || isSubmittingRef.current) return;

    const cleanName = customerName.trim();
    if (cleanName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (notes.trim().length > SPECIAL_INSTRUCTIONS_LIMIT) {
      setError(`Special instructions must be ${SPECIAL_INSTRUCTIONS_LIMIT} characters or fewer.`);
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
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
      promo_code: appliedPromo || undefined,
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
        throw new Error(resJson.detail || "Failed to submit order. Please try again.");
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

      setSuccessOrder({
        ...resJson,
        confirmed_subtotal: resJson.subtotal_before_discount ?? subtotal,
        confirmed_discount: resJson.discount_amount ?? discountAmount,
        confirmed_total: resJson.total_amount ?? finalTotal,
        confirmed_items: confirmedItems,
        confirmed_table: diningOption === "Dine-in" ? tableNumber.trim() : "",
        confirmed_zone: diningOption === "Dine-in" ? seatingZone : "",
        confirmed_notes: notes.trim(),
      });

      // Clear cart strictly AFTER backend order creation succeeds
      setAppliedPromo(null);
      setPromoInput("");
      setPromoFeedback(null);
      setNotes("");
      setTableNumber("");
      idempotencyKeyRef.current = generateIdempotencyKey();
      clearCart();
      void loadUserOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error placing order.");
    } finally {
      isSubmittingRef.current = false;
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

  // 1. Order Confirmation Screen (Displayed only after verified backend order creation)
  if (successOrder) {
    const isCash = String(successOrder.payment_method || "").toLowerCase() === "cash";
    const confirmedItems: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      imageUrl: string;
      customizationSummary?: string;
    }> = Array.isArray(successOrder.confirmed_items) ? successOrder.confirmed_items : [];

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
              Thank you, {successOrder.customer_name}!
            </h1>
            <p className="text-sm text-[#573B2C] max-w-lg mx-auto leading-relaxed">
              Your order <strong className="font-mono text-[#173D2B]">#{successOrder.order_number}</strong> has been recorded for preparation at Jhe&apos;s Cafe&apos;.
            </p>
          </div>

          {/* Order & Payment Status Separation Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                  Order Status
                </p>
                <p className="font-serif text-base font-bold text-[#173D2B] capitalize mt-0.5">
                  {successOrder.status || "pending"}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getOrderStatusBadgeClass(
                  successOrder.status
                )}`}
              >
                {successOrder.status || "pending"}
              </span>
            </div>

            <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                  Payment Status ({String(successOrder.payment_method || "").toUpperCase()})
                </p>
                <p className="font-serif text-base font-bold text-[#173D2B] capitalize mt-0.5">
                  {successOrder.payment_status || "pending"}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getPaymentStatusBadgeClass(
                  successOrder.payment_status
                )}`}
              >
                {successOrder.payment_status || "pending"}
              </span>
            </div>
          </div>

          {/* Payment Next-Step Guidance */}
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
                  <p className="font-bold">Counter Cash Payment Instructions</p>
                  <p className="mt-0.5 text-[#573B2C]">
                    Present reference <strong className="font-mono text-[#173D2B]">{successOrder.order_number}</strong> at the Jhe&apos;s Cafe&apos; cashier counter to pay{" "}
                    <strong>₱{Number(successOrder.confirmed_total || 0).toFixed(2)}</strong>. Payment status remains{" "}
                    <strong>pending</strong> until an authorized cashier confirms receipt.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold">Simulated Demo Payment Notice</p>
                  <p className="mt-0.5">
                    This portfolio demonstration does not process real e-wallet or card charges. Your order is recorded with{" "}
                    <strong>payment_status: pending</strong> and has not been falsely marked as paid. An administrator can verify or update payment status in the staff dashboard.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Itemized Confirmation Card */}
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">Order Receipt</h2>
              <span className="font-mono text-xs font-bold text-[#315640]">
                {successOrder.order_number}
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
                      <p className="font-serif text-sm font-bold text-[#173D2B] leading-snug">
                        {item.name}
                      </p>
                      {item.customizationSummary && (
                        <p className="text-[11px] text-[#573B2C] leading-snug">
                          {item.customizationSummary}
                        </p>
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
                  {successOrder.dining_option}
                  {successOrder.confirmed_zone ? ` · ${successOrder.confirmed_zone}` : ""}
                  {successOrder.confirmed_table ? ` (Table ${successOrder.confirmed_table})` : ""}
                </span>
              </div>
              {successOrder.confirmed_notes && (
                <div className="flex justify-between gap-4 text-[#573B2C]">
                  <span>Special Instructions</span>
                  <span className="text-right italic text-[#173D2B]">&ldquo;{successOrder.confirmed_notes}&rdquo;</span>
                </div>
              )}
              <div className="flex justify-between text-[#573B2C]">
                <span>Subtotal</span>
                <span className="font-mono">₱{Number(successOrder.confirmed_subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(successOrder.confirmed_discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Promo Discount ({successOrder.promo_code})</span>
                  <span className="font-mono">-₱{Number(successOrder.confirmed_discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#173D2B] pt-2 border-t border-[#E5DACB]">
                <span className="font-serif">Final Total</span>
                <span className="font-mono text-xl">
                  ₱{Number(successOrder.confirmed_total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/track-order?code=${encodeURIComponent(successOrder.order_number)}`}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all text-center shadow-sm"
            >
              Track This Order Live
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessOrder(null);
                setActiveTab("history");
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              View Order History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fallback Auth Guard (Edge middleware already redirects guests to /login?redirect=/order)
  if (!user) {
    return (
      <div className="py-16 sm:py-24 bg-[#FFFCF7]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-10 shadow-sm space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Member Account Required</span>
            </div>

            <h1 className="font-serif text-3xl font-bold text-[#173D2B] leading-tight">
              Sign in to complete your order
            </h1>

            <p className="text-sm text-[#573B2C] leading-relaxed">
              Checkout at <strong>Jhe&apos;s Cafe&apos;</strong> requires an authenticated member account so your bag, order history, and live preparation status remain private to you.
            </p>

            <SocialAuthButtons mode="signin" redirectTarget="/order" />

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
                <span>Create Account</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedPaymentOption =
    PAYMENT_OPTIONS.find((opt) => opt.id === paymentMethod) || PAYMENT_OPTIONS[0];

  // 3. Authenticated Customer Checkout & Order History Page
  return (
    <div className="py-10 sm:py-14 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Verified Member Strip */}
        <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/75 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-10 h-10 rounded-full object-cover border border-[#C9AE8B] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center font-serif font-bold text-sm shrink-0">
                {user.full_name ? user.full_name[0].toUpperCase() : "U"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
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
              <span className="text-[10px] uppercase tracking-wider text-[#573B2C] block">
                Loyalty Balance
              </span>
              <span className="text-xs font-mono font-bold text-[#173D2B] bg-white px-2.5 py-1 rounded-lg border border-[#E5DACB] inline-block">
                ★ {user.loyalty_points ?? 0} Bean Points
              </span>
            </div>
          </div>
        </div>

        {/* Customer-Focused Page Heading & View Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DACB] pb-5">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B] tracking-tight">
              Complete Your Order
            </h1>
            <p className="text-xs sm:text-sm text-[#573B2C] mt-1.5">
              Review your selections and prepare your next coffee experience.
            </p>
          </div>

          <div className="flex rounded-full border border-[#E5DACB] bg-[#F5F0E7] p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("checkout")}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "checkout"
                  ? "bg-[#173D2B] text-white shadow-sm"
                  : "text-[#573B2C] hover:text-[#173D2B]"
              }`}
            >
              Checkout
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
              Order History ({userOrders.length})
            </button>
          </div>
        </div>

        {/* TAB 1: CHECKOUT */}
        {activeTab === "checkout" && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* A. ACCOUNT INFORMATION */}
              <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                      Section A
                    </span>
                    <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                      Account Information
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
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B]"
                    />
                  </div>

                  <div>
                    <label htmlFor="checkout-email" className="font-semibold text-[#173D2B] block mb-1.5">
                      Verified Account Email
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      readOnly
                      value={customerEmail}
                      className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#573B2C] bg-[#F5F0E7]/70 cursor-not-allowed"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-phone" className="font-semibold text-[#173D2B] block mb-1.5">
                      Mobile Number <span className="text-[10px] font-normal text-[#573B2C]/75">(Optional — for order readiness updates)</span>
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+63 917 123 4567"
                      className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B]"
                    />
                  </div>
                </div>
              </section>

              {/* B. DINING PREFERENCE */}
              <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-5 shadow-2xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                    Section B
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    Dining Preference
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDiningOption("Dine-in")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      diningOption === "Dine-in"
                        ? "border-[#173D2B] bg-[#173D2B] text-white shadow-sm ring-2 ring-[#C9AE8B]"
                        : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                    }`}
                  >
                    <UtensilsCrossed
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        diningOption === "Dine-in" ? "text-[#C9AE8B]" : "text-[#315640]"
                      }`}
                    />
                    <div>
                      <p className="font-bold">Dine-in at Lounge</p>
                      <p className="text-[11px] opacity-80 mt-0.5">Served fresh to your café table</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiningOption("Takeaway")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      diningOption === "Takeaway"
                        ? "border-[#173D2B] bg-[#173D2B] text-white shadow-sm ring-2 ring-[#C9AE8B]"
                        : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                    }`}
                  >
                    <Store
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        diningOption === "Takeaway" ? "text-[#C9AE8B]" : "text-[#315640]"
                      }`}
                    />
                    <div>
                      <p className="font-bold">Takeaway / Counter Pickup</p>
                      <p className="text-[11px] opacity-80 mt-0.5">Express pickup at our espresso bar</p>
                    </div>
                  </button>
                </div>

                {/* Conditional Dine-in vs Takeaway Information */}
                {diningOption === "Dine-in" ? (
                  <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/65 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label htmlFor="checkout-seating" className="font-semibold text-[#173D2B] block mb-1.5">
                        Preferred Lounge Area
                      </label>
                      <select
                        id="checkout-seating"
                        value={seatingZone}
                        onChange={(e) => setSeatingZone(e.target.value)}
                        className="w-full rounded-xl border border-[#E5DACB] bg-white px-3 py-2.5 text-xs text-[#173D2B] focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20"
                      >
                        {SEATING_ZONES.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="checkout-table" className="font-semibold text-[#173D2B] block mb-1.5">
                        Table Number <span className="text-[10px] font-normal text-[#573B2C]/75">(If already seated)</span>
                      </label>
                      <input
                        id="checkout-table"
                        type="text"
                        maxLength={20}
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. Table 4 (optional)"
                        className="w-full rounded-xl border border-[#E5DACB] bg-white px-3 py-2.5 text-xs text-[#173D2B] focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/65 p-4 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-[#173D2B]">
                      <Clock className="w-4 h-4 text-[#315640]" />
                      <span>Counter Pickup Details</span>
                    </div>
                    <p className="text-[#573B2C] leading-relaxed">
                      <strong>Pickup Location:</strong> Jhe&apos;s Cafe&apos; Main Espresso Bar ({BRAND_CONFIG.location.shortAddress}).
                    </p>
                    <p className="text-[#573B2C]">
                      <strong>Estimated Readiness:</strong> 8–12 minutes once confirmed. Show your <code className="font-mono text-[#173D2B]">JHE-</code> order reference at the pickup shelf.
                    </p>
                  </div>
                )}
              </section>

              {/* C. SPECIAL INSTRUCTIONS */}
              <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                      Section C
                    </span>
                    <h2 className="font-serif text-xl font-bold text-[#173D2B] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#C9AE8B]" />
                      <span>Special Instructions</span>
                    </h2>
                  </div>
                  <span
                    className={`text-[11px] font-mono ${
                      notes.length >= SPECIAL_INSTRUCTIONS_LIMIT ? "text-amber-800 font-bold" : "text-[#573B2C]"
                    }`}
                  >
                    {notes.length} / {SPECIAL_INSTRUCTIONS_LIMIT}
                  </span>
                </div>

                <textarea
                  id="checkout-special-notes"
                  rows={3}
                  maxLength={SPECIAL_INSTRUCTIONS_LIMIT}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, SPECIAL_INSTRUCTIONS_LIMIT))}
                  placeholder="Optional: napkin or carrier request, allergy alert, or seating note..."
                  className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B]"
                />
                <p className="text-[11px] text-[#573B2C] leading-relaxed">
                  For preparation notes and allergen info only. Paid customization options (cup size, plant milk, extra shots, dips, and toppings) must be selected in each item&apos;s customizer.
                </p>
              </section>

              {/* E. PAYMENT METHOD */}
              <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                      Section E
                    </span>
                    <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                      Payment Method
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-semibold">
                    Payment Status: Pending on Submit
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {PAYMENT_OPTIONS.map((option) => {
                    const isSelected = paymentMethod === option.id;
                    const Icon =
                      option.id === "gcash"
                        ? Smartphone
                        : option.id === "maya"
                          ? Wallet
                          : option.id === "card"
                            ? CreditCard
                            : Banknote;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMethod(option.id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? "border-[#173D2B] bg-[#173D2B] text-white shadow-sm ring-2 ring-[#C9AE8B]"
                            : "border-[#E5DACB] bg-[#FFFCF7] text-[#173D2B] hover:border-[#315640]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-white/15 text-[#C9AE8B]" : "bg-[#F5F0E7] text-[#173D2B]"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold">{option.label}</p>
                            <p className={`text-[11px] mt-0.5 ${isSelected ? "text-white/80" : "text-[#573B2C]"}`}>
                              {option.subtitle}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? "bg-[#C9AE8B] text-[#173D2B]"
                              : option.isSimulated
                                ? "bg-amber-50 text-amber-900 border border-amber-200"
                                : "bg-[#F5F0E7] text-[#315640] border border-[#E5DACB]"
                          }`}
                        >
                          {option.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Honest Payment Mode Explanation Panel */}
                {selectedPaymentOption.isSimulated ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/75 p-4 text-xs text-amber-950 flex items-start gap-3 leading-relaxed">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">
                        {selectedPaymentOption.label} — Simulated Demo Payment Flow
                      </p>
                      <p>
                        Jhe&apos;s Cafe&apos; is running in portfolio demonstration mode without a live payment gateway connection. No real money is charged, no credit/debit card details are collected or stored, and orders are recorded with <strong>payment_status: pending</strong> (never automatically marked as paid).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#C9AE8B]/70 bg-[#F5F0E7]/85 p-4 text-xs text-[#173D2B] flex items-start gap-3 leading-relaxed">
                    <Banknote className="w-4 h-4 text-[#315640] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Counter Cash — Pay Upon Arrival</p>
                      <p className="text-[#573B2C]">
                        Your order will be saved with <strong>payment_status: pending</strong>. Present your unique order reference at the Jhe&apos;s Cafe&apos; counter to pay in cash; only an authorized cashier can confirm payment as received.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* D. ORDER SUMMARY (Right Sticky Sidebar) */}
            <aside className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
              <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                      Section D
                    </span>
                    <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                      Order Summary
                    </h2>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#573B2C]">
                    {totalCount} {totalCount === 1 ? "item" : "items"}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-6 text-center space-y-3">
                    <ShoppingBag className="w-8 h-8 text-[#C9AE8B] mx-auto" />
                    <p className="text-xs text-[#573B2C]">Your bag is currently empty.</p>
                    <Link
                      href="/menu"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173D2B] hover:text-[#315640] underline"
                    >
                      <span>Browse the Menu →</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3.5 divide-y divide-[#E5DACB]/85 max-h-[360px] overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="pt-3.5 first:pt-0 flex items-start gap-3 text-xs">
                        <img
                          src={getProductImage(item)}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover border border-[#E5DACB] shrink-0 bg-[#173D2B]"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Complete, untruncated product name */}
                          <p className="font-serif text-sm font-bold text-[#173D2B] leading-snug break-words">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[#573B2C] leading-snug break-words">
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
                          <div className="flex items-center justify-between gap-2 pt-0.5 font-mono">
                            <span className="text-[11px] text-[#315640]">
                              Qty {item.quantity} × ₱{item.price.toFixed(2)}
                            </span>
                            <span className="text-xs font-bold text-[#173D2B]">
                              ₱{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Promo Code Input */}
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

                {/* Totals Breakdown */}
                <div className="pt-4 border-t border-[#E5DACB] space-y-2 text-xs">
                  <div className="flex justify-between text-[#573B2C]">
                    <span>Subtotal</span>
                    <span className="font-mono">₱{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>Discount ({appliedPromo})</span>
                      <span className="font-mono">-₱{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#573B2C]">
                    <span>Bean Points to Earn</span>
                    <span className="font-mono text-emerald-800 font-bold">
                      +{Math.floor(finalTotal / 50)} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-base font-bold text-[#173D2B] pt-2.5 border-t border-[#E5DACB]">
                    <span className="font-serif">Final Total</span>
                    <span className="font-mono text-xl">₱{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Order...</span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {selectedPaymentOption.id === "cash"
                          ? `Place Counter Cash Order · ₱${finalTotal.toFixed(2)}`
                          : `Submit Demo Order · ₱${finalTotal.toFixed(2)}`}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                    </>
                  )}
                </button>
              </div>
            </aside>
          </form>
        )}

        {/* TAB 2: CUSTOMER ORDER HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold text-[#173D2B]">
                Your Order History
              </h2>
              <button
                type="button"
                onClick={() => void loadUserOrders()}
                disabled={loadingOrders}
                className="inline-flex items-center gap-1.5 text-xs text-[#315640] font-semibold hover:underline cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
                <span>Refresh</span>
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
                  Orders placed with your account will appear here in real time.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("checkout")}
                  className="px-6 py-3 rounded-full bg-[#173D2B] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#315640] transition-all cursor-pointer"
                >
                  Return to Checkout →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-6 rounded-3xl border border-[#E5DACB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-[#173D2B]">
                          #{ord.order_number}
                        </span>
                        <span className="text-xs text-[#573B2C]">
                          · {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : "Recent"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getOrderStatusBadgeClass(
                            ord.status
                          )}`}
                        >
                          <Clock className="w-3 h-3" />
                          Order: {ord.status || "pending"}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getPaymentStatusBadgeClass(
                            ord.payment_status
                          )}`}
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

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E5DACB] gap-1 shrink-0">
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
