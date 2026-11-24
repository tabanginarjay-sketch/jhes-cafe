"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  Banknote,
  Utensils,
  ShoppingBag,
  Truck,
  MapPin,
  Clock,
  Bookmark,
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
import {
  formatDeliveryStatusLabel,
  matchServiceableZone,
  type CustomerAddress,
  type DeliveryZone,
  type DiningPreference,
} from "@/lib/deliveryTypes";

const SPECIAL_INSTRUCTIONS_LIMIT = 200;

const SEATING_ZONES = [
  "Communal Walnut Table",
  "Window Bar Counter",
  "Quiet Reading Alcove",
  "Garden Patio Lounge",
];

const PICKUP_TIME_OPTIONS = [
  "ASAP (10–15 mins)",
  "In 30 minutes",
  "In 45 minutes",
  "In 1 hour",
];

const DELIVERY_SCHEDULE_WINDOWS = [
  "Within 1–2 hours",
  "Lunch Window (12:00 PM – 1:00 PM)",
  "Afternoon Coffee (3:00 PM – 4:00 PM)",
  "Evening Drop-off (6:00 PM – 7:00 PM)",
];

const ONLINE_PAYMENT_OPTIONS = [
  {
    id: "gcash" as const,
    label: "GCash",
    modeLabel: "Demo Simulated · Pending Verification",
    description:
      "Simulated portfolio e-wallet option. Recorded with pending payment status until verified.",
    icon: CreditCard,
  },
  {
    id: "maya" as const,
    label: "Maya",
    modeLabel: "Demo Simulated · Pending Verification",
    description:
      "Simulated portfolio e-wallet option. Recorded with pending payment status until verified.",
    icon: CreditCard,
  },
  {
    id: "card" as const,
    label: "Credit / Debit Card",
    modeLabel: "Demo Simulated · Pending Verification",
    description:
      "Simulated portfolio card checkout. No real card charge occurs; recorded pending verification.",
    icon: CreditCard,
  },
];

const COUNTER_CASH_OPTION = {
  id: "cash" as const,
  label: "Counter Cash",
  modeLabel: "Pay at Counter · Cashier Confirmed",
  description:
    "Pay in person at the Jhe's Cafe' counter. Confirmed by an authorized cashier upon receipt.",
  icon: Banknote,
};

const COD_PAYMENT_OPTION = {
  id: "cod" as const,
  label: "Cash on Delivery (COD)",
  modeLabel: "COD_PENDING · Confirmed After Delivery",
  description:
    "Pay exact cash to our assigned rider upon handoff. Recorded as COD_PENDING until delivery completes and cashier confirms cash remittance.",
  icon: Banknote,
};

type PaymentMethodId = "gcash" | "maya" | "card" | "cash" | "cod";

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

  // Section B — Dining Preference (Dine-in | Takeaway | Delivery)
  const [diningOption, setDiningOption] = useState<DiningPreference>("Takeaway");
  const [seatingZone, setSeatingZone] = useState(SEATING_ZONES[0]);
  const [tableNumber, setTableNumber] = useState("");
  const [pickupTimePreference, setPickupTimePreference] = useState(PICKUP_TIME_OPTIONS[0]);

  // Delivery-specific fields & configured serviceable zones (zero hardcoded rates)
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  const [recipientName, setRecipientName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [landmark, setLandmark] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [scheduleType, setScheduleType] = useState<"asap" | "scheduled">("asap");
  const [scheduledWindow, setScheduledWindow] = useState(DELIVERY_SCHEDULE_WINDOWS[0]);
  const [saveAddressForLater, setSaveAddressForLater] = useState(true);
  const [addressLabel, setAddressLabel] = useState("Home");

  // Section C — Special Instructions
  const [notes, setNotes] = useState("");

  // Section D — Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("cash");

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  // Submission & Confirmation state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Auto-fill contact details & delivery recipient from authenticated account
  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.full_name || "");
      setCustomerEmail(user.email || "");
      const phoneStr = user.phone ? String(user.phone) : "";
      setCustomerPhone((prev) => prev || phoneStr);
      setRecipientName((prev) => prev || user.full_name || "");
      setDeliveryPhone((prev) => prev || phoneStr);
    }
  }, [user]);

  // Fetch active configured delivery zones & customer saved addresses
  useEffect(() => {
    if (!user) return;
    let active = true;
    setZonesLoading(true);

    Promise.all([
      fetch(`${API_BASE_URL}/delivery/zones`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { zones: [] }))
        .catch(() => ({ zones: [] })),
      fetch(`${API_BASE_URL}/addresses`, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { addresses: [] }))
        .catch(() => ({ addresses: [] })),
    ])
      .then(([zData, aData]) => {
        if (!active) return;
        setDeliveryZones(Array.isArray(zData?.zones) ? zData.zones : []);
        setSavedAddresses(Array.isArray(aData?.addresses) ? aData.addresses : []);
      })
      .finally(() => {
        if (active) setZonesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (appliedPromoCode) {
      setPromoInput(appliedPromoCode);
    }
  }, [appliedPromoCode]);

  // Switch between COD and Counter Cash cleanly when dining preference changes
  const handleSelectDining = (next: DiningPreference) => {
    setDiningOption(next);
    setError(null);
    if (next === "Delivery" && paymentMethod === "cash") {
      setPaymentMethod("cod");
    } else if (next !== "Delivery" && paymentMethod === "cod") {
      setPaymentMethod("cash");
    }
  };

  const applySavedAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setRecipientName(addr.recipient_name || customerName);
    setDeliveryPhone(addr.contact_number || customerPhone);
    setHouseNumber(addr.house_number);
    setStreet(addr.street);
    setBarangay(addr.barangay);
    setCity(addr.city);
    setLandmark(addr.landmark);
    setDeliveryInstructions(addr.delivery_instructions);
    setAddressLabel(addr.label || "Home");
    setError(null);
  };

  const applyQuickZone = (zone: DeliveryZone) => {
    setCity(zone.city);
    setBarangay(zone.barangay);
    setError(null);
  };

  // Match typed or selected city + barangay strictly against active configured zones
  const matchedZone = useMemo(() => {
    if (diningOption !== "Delivery") return null;
    return matchServiceableZone(deliveryZones, city, barangay);
  }, [diningOption, deliveryZones, city, barangay]);

  const hasEnteredZoneFields = Boolean(city.trim() && barangay.trim());
  const isDeliveryBelowMin = Boolean(
    diningOption === "Delivery" && matchedZone && subtotal < matchedZone.min_order_amount
  );
  const deliveryFee = diningOption === "Delivery" && matchedZone ? matchedZone.delivery_fee : 0;

  const isPromoApplied = appliedPromoCode === BRAND_CONFIG.promo.code;
  const discountAmount = isPromoApplied
    ? Math.round(subtotal * BRAND_CONFIG.promo.discountRate)
    : 0;
  const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);
  const pointsToEarn = Math.floor(finalTotal / 50);

  const visiblePaymentOptions =
    diningOption === "Delivery"
      ? [COD_PAYMENT_OPTION, ...ONLINE_PAYMENT_OPTIONS]
      : [...ONLINE_PAYMENT_OPTIONS, COUNTER_CASH_OPTION];

  const handleApplyPromo = () => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) {
      setAppliedPromoCode(null);
      setPromoFeedback(null);
      return;
    }
    if (clean === BRAND_CONFIG.promo.code) {
      setAppliedPromoCode(BRAND_CONFIG.promo.code);
      setPromoFeedback(`Promo ${BRAND_CONFIG.promo.code} applied (15% off subtotal).`);
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

    // Strict client-side Delivery pre-validation (authoritatively re-validated on backend!)
    if (diningOption === "Delivery") {
      if (recipientName.trim().length < 2) {
        setError("Please enter the delivery recipient's full name.");
        return;
      }
      if (deliveryPhone.replace(/\D/g, "").length < 7) {
        setError("Please provide a valid recipient contact number (at least 7 digits).");
        return;
      }
      if (!houseNumber.trim() || !street.trim() || !barangay.trim() || !city.trim()) {
        setError(
          "Please complete the delivery address (house/building number, street, barangay, and city)."
        );
        return;
      }
      if (deliveryZones.length === 0) {
        setError(
          "Delivery is currently unavailable because no serviceable delivery zones are configured yet."
        );
        return;
      }
      if (!matchedZone) {
        setError(
          `Sorry, Brgy. ${barangay.trim()}, ${city.trim()} is outside our configured delivery zones. Please select a serviceable area or switch to Takeaway / Dine-in.`
        );
        return;
      }
      if (subtotal < matchedZone.min_order_amount) {
        setError(
          `Minimum order for ${matchedZone.area_label} is ₱${matchedZone.min_order_amount.toFixed(2)} (current subtotal: ₱${subtotal.toFixed(2)}).`
        );
        return;
      }
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const trimmedPhone =
      (diningOption === "Delivery" ? deliveryPhone.trim() : customerPhone.trim()) ||
      (user.phone ? String(user.phone).trim() : "");
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
        : diningOption === "Takeaway"
          ? {
              pickup_time_preference: pickupTimePreference,
            }
          : {
              delivery_address: {
                recipient_name: recipientName.trim(),
                contact_number: deliveryPhone.trim(),
                house_number: houseNumber.trim(),
                street: street.trim(),
                barangay: barangay.trim(),
                city: city.trim(),
                landmark: landmark.trim(),
                delivery_instructions: deliveryInstructions.trim(),
                schedule_type: scheduleType,
                scheduled_window: scheduleType === "scheduled" ? scheduledWindow : undefined,
                save_address: saveAddressForLater,
                address_label: addressLabel.trim() || "Home",
              },
            }),
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
        confirmed_delivery_fee: resJson.delivery_fee ?? deliveryFee,
        confirmed_discount: resJson.discount_amount ?? discountAmount,
        confirmed_total: resJson.total_amount ?? finalTotal,
        confirmed_items: confirmedItems,
        confirmed_zone: diningOption === "Dine-in" ? seatingZone : "",
        confirmed_table: diningOption === "Dine-in" ? tableNumber.trim() : "",
        confirmed_pickup_time: diningOption === "Takeaway" ? pickupTimePreference : "",
        confirmed_notes: notes.trim(),
        loyalty_points_earned: resJson.loyalty_points_earned ?? pointsToEarn,
      });

      if (typeof resJson.updated_loyalty_points === "number") {
        updateUserLocally({ loyalty_points: resJson.updated_loyalty_points });
      }
      void refreshUser();

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
              Sign in to your Jhe&apos;s Cafe&apos; account so your order, delivery tracking, and Bean Points remain securely tied to you.
            </p>
            <SocialAuthButtons mode="signin" redirectTarget="/checkout" />
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?redirect=/checkout"
                prefetch={false}
                className="flex-1 py-3 px-5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In with Email</span>
                <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
              </Link>
              <Link
                href="/register?redirect=/checkout"
                prefetch={false}
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

  // VERIFIED ORDER CONFIRMATION SCREEN
  if (confirmedOrder) {
    const payMethod = String(confirmedOrder.payment_method || "").toLowerCase();
    const isCash = payMethod === "cash";
    const isCod = payMethod === "cod";
    const isDelivery = String(confirmedOrder.dining_option || "").toLowerCase() === "delivery";
    const dlv = confirmedOrder.delivery || null;
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

          {/* Separated Order, Delivery & Payment Status Cards */}
          <div className={`grid grid-cols-1 ${isDelivery ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
            <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                  Order Status
                </p>
                <p className="font-serif text-base font-bold text-[#173D2B] capitalize mt-0.5">
                  {confirmedOrder.status || "pending"}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border bg-stone-100 text-stone-800 border-stone-300">
                {confirmedOrder.status || "pending"}
              </span>
            </div>

            {isDelivery && dlv && (
              <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                    Delivery Status
                  </p>
                  <p className="font-serif text-sm font-bold text-[#173D2B] mt-0.5">
                    {formatDeliveryStatusLabel(dlv.delivery_status)}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border bg-sky-50 text-sky-900 border-sky-200">
                  {dlv.delivery_status}
                </span>
              </div>
            )}

            <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-[#573B2C]">
                  Payment ({payMethod.toUpperCase()})
                </p>
                <p className="font-serif text-base font-bold text-[#173D2B] uppercase mt-0.5">
                  {confirmedOrder.payment_status || (isCod ? "cod_pending" : "pending")}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border bg-amber-50 text-amber-900 border-amber-200">
                {confirmedOrder.payment_status || (isCod ? "cod_pending" : "pending")}
              </span>
            </div>
          </div>

          {/* Delivery Handoff Card */}
          {isDelivery && dlv && (
            <div className="rounded-2xl border border-[#C9AE8B] bg-[#F5F0E7] p-5 text-xs space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-[#173D2B] inline-flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#315640]" />
                  <span>Delivery Dispatch Details ({dlv.delivery_ref})</span>
                </span>
                <span className="font-mono font-bold px-3 py-1 rounded-full bg-[#173D2B] text-[#C9AE8B]">
                  Handoff Code: {dlv.confirmation_code}
                </span>
              </div>
              <p className="text-[#573B2C]">
                <strong className="text-[#173D2B]">Recipient:</strong> {dlv.recipient_name} ({dlv.contact_number})
              </p>
              <p className="text-[#573B2C]">
                <strong className="text-[#173D2B]">Address:</strong> {dlv.full_address}
              </p>
              <p className="text-[#573B2C]">
                <strong className="text-[#173D2B]">Estimated Delivery:</strong> {dlv.estimated_delivery_time}
              </p>
              <p className="text-[11px] text-[#315640]">
                Share your 6-character handoff code with your assigned driver upon delivery to record proof of handoff.
              </p>
            </div>
          )}

          {/* Clear Next Steps */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 text-xs leading-relaxed flex items-start gap-3 ${
              isCash || isCod
                ? "bg-[#F5F0E7] border-[#C9AE8B] text-[#173D2B]"
                : "bg-amber-50/80 border-amber-200 text-amber-950"
            }`}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#315640]" />
            <div>
              {isCod ? (
                <>
                  <p className="font-bold">Next Steps — Cash on Delivery (COD_PENDING)</p>
                  <p className="mt-0.5 text-[#573B2C]">
                    Prepare{" "}
                    <strong className="text-[#173D2B]">
                      ₱{Number(confirmedOrder.confirmed_total || 0).toFixed(2)}
                    </strong>{" "}
                    for your assigned rider upon handoff. Your payment status remains{" "}
                    <strong>COD_PENDING</strong> until delivery completes and our cashier confirms cash remittance.
                  </p>
                </>
              ) : isCash ? (
                <>
                  <p className="font-bold">Next Steps — Counter Cash Payment</p>
                  <p className="mt-0.5 text-[#573B2C]">
                    Present order reference{" "}
                    <strong className="font-mono text-[#173D2B]">#{confirmedOrder.order_number}</strong> at the counter to pay{" "}
                    <strong>₱{Number(confirmedOrder.confirmed_total || 0).toFixed(2)}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold">Next Steps — Portfolio Demo Payment</p>
                  <p className="mt-0.5">
                    This portfolio demonstration records online methods with{" "}
                    <strong>payment_status: pending</strong> (no real e-wallet or card charge is processed). Track status updates anytime on My Orders.
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
                  {confirmedOrder.confirmed_pickup_time ? ` · ${confirmedOrder.confirmed_pickup_time}` : ""}
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
              {Number(confirmedOrder.confirmed_delivery_fee || 0) > 0 && (
                <div className="flex justify-between text-[#573B2C]">
                  <span>Delivery Fee</span>
                  <span className="font-mono">
                    +₱{Number(confirmedOrder.confirmed_delivery_fee).toFixed(2)}
                  </span>
                </div>
              )}
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
              prefetch={false}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all text-center shadow-sm inline-flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4 text-[#C9AE8B]" />
              <span>Track in My Orders</span>
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

  // EMPTY CART GUARD
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
                prefetch={false}
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

  // FOCUSED CHECKOUT PAGE (Sections A–E with Dine-in, Takeaway, and Complete Delivery)
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
              Review your order details and choose Dine-in, Takeaway, or Delivery.
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
                    Mobile Number{" "}
                    <span className="text-[#573B2C]/60 font-normal">
                      ({diningOption === "Delivery" ? "used for order & rider updates" : "for pickup or order updates"})
                    </span>
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (!deliveryPhone) setDeliveryPhone(e.target.value);
                    }}
                    placeholder="e.g. 0917 888 9900"
                    className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] font-mono bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                  />
                </div>
              </div>
            </section>

            {/* SECTION B — DINING PREFERENCE (3 OPTIONS: DINE-IN, TAKEAWAY, DELIVERY) */}
            <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-7 space-y-5 shadow-2xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                  Section B
                </span>
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                  Dining Preference
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectDining("Dine-in")}
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
                      Served fresh to your table
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDining("Takeaway")}
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
                    <p className="font-bold text-sm">Takeaway</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        diningOption === "Takeaway" ? "text-white/75" : "text-[#573B2C]"
                      }`}
                    >
                      Express counter pickup
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDining("Delivery")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    diningOption === "Delivery"
                      ? "bg-[#173D2B] text-white border-[#173D2B] shadow-sm"
                      : "bg-[#FFFCF7] text-[#173D2B] border-[#E5DACB] hover:border-[#C9AE8B]"
                  }`}
                >
                  <Truck
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      diningOption === "Delivery" ? "text-[#C9AE8B]" : "text-[#315640]"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-sm">Delivery</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        diningOption === "Delivery" ? "text-white/75" : "text-[#573B2C]"
                      }`}
                    >
                      Delivered to serviceable zones
                    </p>
                  </div>
                </button>
              </div>

              {/* DINE-IN FIELDS ONLY */}
              {diningOption === "Dine-in" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E5DACB]/70 text-xs animate-fade-in">
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

              {/* TAKEAWAY / COUNTER PICKUP FIELDS ONLY */}
              {diningOption === "Takeaway" && (
                <div className="pt-3 border-t border-[#E5DACB]/70 space-y-3 text-xs animate-fade-in">
                  <div>
                    <label htmlFor="pickup-time" className="font-semibold text-[#173D2B] block mb-1.5">
                      Pickup Time Preference
                    </label>
                    <select
                      id="pickup-time"
                      value={pickupTimePreference}
                      onChange={(e) => setPickupTimePreference(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                    >
                      {PICKUP_TIME_OPTIONS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F5F0E7]/80 border border-[#E5DACB] flex items-center gap-2.5 text-[11px] text-[#573B2C]">
                    <Clock className="w-4 h-4 text-[#315640] shrink-0" />
                    <span>
                      Track live pickup status (<strong className="text-[#173D2B]">Placed → Preparing → Ready</strong>) on My Orders after submitting.
                    </span>
                  </div>
                </div>
              )}

              {/* DELIVERY FIELDS ONLY */}
              {diningOption === "Delivery" && (
                <div className="pt-4 border-t border-[#E5DACB]/70 space-y-5 text-xs animate-fade-in">
                  {/* Configured Serviceable Zones Selector */}
                  <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/70 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-[#173D2B] inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#315640]" />
                        <span>Configured Serviceable Delivery Zones</span>
                      </span>
                      {zonesLoading && (
                        <span className="text-[11px] font-mono text-[#573B2C]">Loading zones...</span>
                      )}
                    </div>

                    {!zonesLoading && deliveryZones.length === 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
                        <strong>No active delivery zones configured yet.</strong> Ask a café manager to configure serviceable barangays, fees, and minimum order amounts in <strong>Admin → Delivery Management</strong> before placing a Delivery order.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {deliveryZones.map((zone) => {
                          const isSelected = matchedZone?.id === zone.id;
                          return (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => applyQuickZone(zone)}
                              className={`px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#173D2B] text-white border-[#173D2B] shadow-2xs"
                                  : "bg-white text-[#173D2B] border-[#E5DACB] hover:border-[#315640]"
                              }`}
                            >
                              <span>{zone.area_label}</span>
                              <span
                                className={`ml-1.5 font-mono ${
                                  isSelected ? "text-[#C9AE8B]" : "text-[#315640]"
                                }`}
                              >
                                · ₱{zone.delivery_fee}
                                {zone.min_order_amount > 0 ? ` (min ₱${zone.min_order_amount})` : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Saved Addresses Picker */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-semibold text-[#173D2B] inline-flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-[#315640]" />
                        <span>Saved Delivery Addresses</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {savedAddresses.map((addr) => {
                          const active = selectedAddressId === addr.id;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => applySavedAddress(addr)}
                              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                active
                                  ? "border-[#173D2B] bg-[#F5F0E7] ring-1 ring-[#173D2B]"
                                  : "border-[#E5DACB] bg-[#FFFCF7] hover:border-[#C9AE8B]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#173D2B]">{addr.label}</span>
                                <span className="text-[10px] font-mono text-[#315640]">
                                  {addr.barangay}, {addr.city}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#573B2C] truncate mt-0.5">
                                {addr.house_number} {addr.street}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recipient & Complete Structured Address Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dlv-recipient" className="font-semibold text-[#173D2B] block mb-1.5">
                        Recipient Full Name <span className="text-amber-800">*</span>
                      </label>
                      <input
                        id="dlv-recipient"
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Recipient full name"
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>

                    <div>
                      <label htmlFor="dlv-phone" className="font-semibold text-[#173D2B] block mb-1.5">
                        Recipient Contact Number <span className="text-amber-800">*</span>
                      </label>
                      <input
                        id="dlv-phone"
                        type="tel"
                        required
                        value={deliveryPhone}
                        onChange={(e) => setDeliveryPhone(e.target.value)}
                        placeholder="e.g. 0917 888 9900"
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] font-mono bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>

                    <div>
                      <label htmlFor="dlv-house" className="font-semibold text-[#173D2B] block mb-1.5">
                        House / Unit / Building No. <span className="text-amber-800">*</span>
                      </label>
                      <input
                        id="dlv-house"
                        type="text"
                        required
                        value={houseNumber}
                        onChange={(e) => setHouseNumber(e.target.value)}
                        placeholder="e.g. Lot 12 Blk 4 / Unit 3B"
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>

                    <div>
                      <label htmlFor="dlv-street" className="font-semibold text-[#173D2B] block mb-1.5">
                        Street / Subdivision <span className="text-amber-800">*</span>
                      </label>
                      <input
                        id="dlv-street"
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="e.g. Aguinaldo Highway / Mahogany St."
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>

                    <div>
                      <label htmlFor="dlv-barangay" className="font-semibold text-[#173D2B] block mb-1.5">
                        Barangay <span className="text-amber-800">*</span>
                      </label>
                      <input
                        id="dlv-barangay"
                        type="text"
                        required
                        value={barangay}
                        onChange={(e) => setBarangay(e.target.value)}
                        placeholder="e.g. Maharlika East"
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>

                    <div>
                      <label htmlFor="dlv-city" className="font-semibold text-[#173D2B] block mb-1.5">
                        City / Municipality <span className="text-amber-800">*</span>
                      </label>
                      <input
                        id="dlv-city"
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Tagaytay City"
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="dlv-landmark" className="font-semibold text-[#173D2B] block mb-1.5">
                        Landmark <span className="text-[#573B2C]/60 font-normal">(Helps our rider find you faster)</span>
                      </label>
                      <input
                        id="dlv-landmark"
                        type="text"
                        maxLength={120}
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Across Sky Ranch gate / beside green chapel"
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="dlv-instructions" className="font-semibold text-[#173D2B] block mb-1.5">
                        Delivery Instructions <span className="text-[#573B2C]/60 font-normal">(Gate code, drop-off note)</span>
                      </label>
                      <input
                        id="dlv-instructions"
                        type="text"
                        maxLength={240}
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        placeholder="e.g. Call upon arrival at main lobby / leave with guard"
                        className="w-full rounded-xl border border-[#E5DACB] px-3.5 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                      />
                    </div>
                  </div>

                  {/* Live Zone Validation Feedback */}
                  {hasEnteredZoneFields && (
                    matchedZone ? (
                      <div
                        className={`p-3.5 rounded-2xl border text-[11px] flex items-start justify-between gap-3 flex-wrap ${
                          isDeliveryBelowMin
                            ? "bg-amber-50 border-amber-300 text-amber-950"
                            : "bg-emerald-50 border-emerald-200 text-emerald-950"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold">
                            {isDeliveryBelowMin
                              ? `Minimum Order Not Met for ${matchedZone.area_label}`
                              : `Serviceable Zone Verified: ${matchedZone.area_label}`}
                          </p>
                          <p>
                            Delivery Fee: <strong className="font-mono">₱{matchedZone.delivery_fee.toFixed(2)}</strong> · Est. Time:{" "}
                            <strong>{matchedZone.estimated_minutes}</strong>
                            {matchedZone.min_order_amount > 0 && (
                              <>
                                {" "}· Min. Order:{" "}
                                <strong className="font-mono">₱{matchedZone.min_order_amount.toFixed(2)}</strong>
                              </>
                            )}
                          </p>
                        </div>
                        {!isDeliveryBelowMin && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px]">
                            Eligible
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 text-[11px] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
                        <span>
                          <strong>Outside Serviceable Delivery Zones:</strong> Brgy. {barangay.trim()}, {city.trim()} is not currently covered. Choose one of the configured serviceable zones above or switch to Takeaway / Dine-in.
                        </span>
                      </div>
                    )
                  )}

                  {/* ASAP vs Scheduled Delivery + Save Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-2">
                      <span className="font-semibold text-[#173D2B] block">Delivery Timing</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setScheduleType("asap")}
                          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            scheduleType === "asap"
                              ? "bg-[#173D2B] text-white border-[#173D2B]"
                              : "bg-[#FFFCF7] text-[#573B2C] border-[#E5DACB]"
                          }`}
                        >
                          ASAP
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleType("scheduled")}
                          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            scheduleType === "scheduled"
                              ? "bg-[#173D2B] text-white border-[#173D2B]"
                              : "bg-[#FFFCF7] text-[#573B2C] border-[#E5DACB]"
                          }`}
                        >
                          Scheduled
                        </button>
                      </div>
                      {scheduleType === "scheduled" && (
                        <select
                          value={scheduledWindow}
                          onChange={(e) => setScheduledWindow(e.target.value)}
                          className="w-full rounded-xl border border-[#E5DACB] px-3 py-2.5 text-xs text-[#173D2B] bg-[#FFFCF7]"
                        >
                          {DELIVERY_SCHEDULE_WINDOWS.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 font-semibold text-[#173D2B] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAddressForLater}
                          onChange={(e) => setSaveAddressForLater(e.target.checked)}
                          className="accent-[#173D2B] w-4 h-4 rounded"
                        />
                        <span>Save address to my account</span>
                      </label>
                      {saveAddressForLater && (
                        <input
                          type="text"
                          maxLength={40}
                          value={addressLabel}
                          onChange={(e) => setAddressLabel(e.target.value)}
                          placeholder="Label (e.g. Home, Office)"
                          className="w-full rounded-xl border border-[#E5DACB] px-3 py-2.5 text-xs text-[#173D2B] bg-[#FFFCF7]"
                        />
                      )}
                    </div>
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
                  {paymentMethod === "cod" ? "COD_PENDING Until Confirmed" : "Pending Until Verified"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visiblePaymentOptions.map((opt) => {
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
                {promoFeedback && <p className="text-[11px] text-[#315640]">{promoFeedback}</p>}
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-[#E5DACB] space-y-2 text-xs text-[#573B2C]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-[#173D2B]">
                    ₱{subtotal.toFixed(2)}
                  </span>
                </div>

                {diningOption === "Delivery" && (
                  <>
                    <div className="flex justify-between">
                      <span>
                        Delivery Fee {matchedZone ? `(${matchedZone.barangay})` : ""}
                      </span>
                      <span className="font-mono font-semibold text-[#173D2B]">
                        {matchedZone ? `₱${deliveryFee.toFixed(2)}` : "Enter valid zone"}
                      </span>
                    </div>
                    {matchedZone && (
                      <div className="flex justify-between text-[11px] text-[#315640]">
                        <span>Estimated Delivery</span>
                        <span className="font-medium">
                          {scheduleType === "scheduled"
                            ? scheduledWindow
                            : matchedZone.estimated_minutes}
                        </span>
                      </div>
                    )}
                  </>
                )}

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
                disabled={
                  submitting ||
                  items.length === 0 ||
                  (diningOption === "Delivery" && (!matchedZone || isDeliveryBelowMin))
                }
                className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {submitting
                    ? "Placing Order..."
                    : diningOption === "Delivery" && !matchedZone
                      ? "Select Valid Delivery Zone"
                      : `Place Order · ₱${finalTotal.toFixed(2)}`}
                </span>
                {!submitting && <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />}
              </button>

              <p className="text-[11px] text-center text-[#573B2C] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#315640]" />
                <span>Server-validated zone fees &amp; pricing</span>
              </p>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
