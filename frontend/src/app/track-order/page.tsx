"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, AlertCircle, Truck, ArrowRight } from "lucide-react";
import { API_BASE_URL, type OrderData } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getProductImage } from "@/lib/productRegistry";
import { CORE_DELIVERY_TIMELINE, formatDeliveryStatusLabel } from "@/lib/deliveryTypes";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const { user } = useAuth();

  const [orderCode, setOrderCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentUserOrders, setRecentUserOrders] = useState<OrderData[]>([]);

  useEffect(() => {
    if (!user) {
      setRecentUserOrders([]);
      return;
    }
    fetch(`${API_BASE_URL}/orders`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: OrderData[]) => {
        if (Array.isArray(list)) {
          setRecentUserOrders(
            list
              .filter((o) => o.customer_email?.toLowerCase() === user.email.toLowerCase())
              .slice(0, 4)
          );
        }
      })
      .catch(() => {});
  }, [user]);

  const fetchTrack = async (targetCode: string) => {
    const clean = targetCode.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const directRes = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(clean)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (directRes.ok) {
        const found = await directRes.json();
        setOrder(found);
      } else if (directRes.status === 404) {
        setOrder(null);
      } else {
        throw new Error("Unable to retrieve order status at this time.");
      }
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "Error tracking order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      void fetchTrack(initialCode);
    }
  }, [initialCode]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchTrack(orderCode);
  };

  const steps = [
    { title: "Order Placed", desc: "Ticket queued in kitchen" },
    { title: "Preparing", desc: "Barista & bakery crafting" },
    { title: "Ready at Counter", desc: "Freshly prepared for you" },
    { title: "Completed", desc: "Order fulfilled" },
  ];

  const getStepIndex = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return 3;
      case "ready":
        return 2;
      case "preparing":
      case "brewing":
        return 1;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(order?.status);
  const isCancelled = (order?.status || "").toLowerCase() === "cancelled";

  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#315640]">
            Live Jhe&apos;s Cafe&apos; Barista Queue
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B]">
            Track Your Order
          </h1>
          <p className="text-xs text-[#573B2C] max-w-md mx-auto">
            Enter your exact order number (e.g.{" "}
            <code className="font-mono font-bold text-[#173D2B]">JHE-2026-10001</code>) to check live preparation and payment status from Airtable.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleTrack} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="Enter Order Code (e.g. JHE-2026-...)"
            className="flex-1 rounded-full border border-[#E5DACB] bg-white px-5 py-3 text-xs text-[#173D2B] font-mono tracking-wider focus:outline-hidden focus:border-[#173D2B] shadow-2xs"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Search className="w-4 h-4 text-[#C9AE8B]" />
            <span>Track</span>
          </button>
        </form>

        {/* Signed-in User's Real Recent Orders Quick Chips */}
        {recentUserOrders.length > 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-[#573B2C]">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-[#315640]">
              Your Recent Orders:
            </span>
            {recentUserOrders.map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => {
                  setOrderCode(ord.order_number);
                  void fetchTrack(ord.order_number);
                }}
                className="px-2.5 py-1 rounded-full bg-[#F5F0E7] border border-[#E5DACB] hover:bg-[#173D2B] hover:text-white font-mono transition-all cursor-pointer"
              >
                {ord.order_number}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <p className="text-center text-xs text-[#573B2C] animate-pulse">
            Checking live Airtable order queue...
          </p>
        )}

        {error && !loading && (
          <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-center space-y-1 text-xs text-rose-900">
            <p className="font-bold">Lookup Error</p>
            <p>{error}</p>
          </div>
        )}

        {searched && !loading && !order && !error && (
          <div className="p-8 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-[#573B2C] mx-auto opacity-40" />
            <p className="font-serif text-lg font-bold text-[#173D2B]">
              No order found with code &quot;{orderCode}&quot;
            </p>
            <p className="text-xs text-[#573B2C]">
              Verify your exact order number from your Jhe&apos;s Cafe&apos; order confirmation or account history.
            </p>
          </div>
        )}

        {order && (
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-4 gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#573B2C]">
                  Order Number
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#173D2B]">
                  {order.order_number}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-[#573B2C] block">
                  Customer
                </span>
                <span className="font-semibold text-xs sm:text-sm text-[#173D2B]">
                  {order.customer_name}
                </span>
                <span className="text-[10px] font-mono block text-[#315640]">
                  {order.dining_option}
                </span>
              </div>
            </div>

            {isCancelled ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold text-center">
                This order has been cancelled.
              </div>
            ) : String(order.dining_option || "").toLowerCase() === "delivery" && order.delivery ? (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#173D2B]">
                    <Truck className="w-4 h-4 text-[#315640]" />
                    <span>Delivery Status: {formatDeliveryStatusLabel(order.delivery.delivery_status)}</span>
                  </span>
                  {order.delivery.estimated_delivery_time && (
                    <span className="font-mono text-[11px] text-[#573B2C]">
                      ETA: {order.delivery.estimated_delivery_time}
                    </span>
                  )}
                </div>

                {["CANCELLED", "FAILED_DELIVERY", "RETURNED"].includes(order.delivery.delivery_status) ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
                    Delivery status: <strong>{formatDeliveryStatusLabel(order.delivery.delivery_status)}</strong>.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {CORE_DELIVERY_TIMELINE.map((stage, idx) => {
                      const activeIdx = CORE_DELIVERY_TIMELINE.indexOf(order.delivery.delivery_status);
                      const active = activeIdx >= 0 && idx <= activeIdx;
                      const isCurrent = idx === activeIdx;
                      return (
                        <div key={stage} className="space-y-1.5 text-center">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              active ? "bg-[#173D2B]" : "bg-[#E5DACB]"
                            } ${isCurrent ? "ring-2 ring-[#C9AE8B] ring-offset-2" : ""}`}
                          />
                          <p
                            className={`text-[10px] font-bold leading-tight ${
                              active ? "text-[#173D2B]" : "text-[#573B2C]/40"
                            }`}
                          >
                            {formatDeliveryStatusLabel(stage)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-[#573B2C] bg-[#F5F0E7]/70 border border-[#E5DACB] rounded-2xl p-3">
                  <span>
                    {order.is_owner
                      ? "View full driver details, handoff code, and delivery messages in My Orders."
                      : "Sign in as the order owner in My Orders to view driver contact, handoff code, and address details."}
                  </span>
                  <Link
                    href="/my-orders"
                    prefetch={false}
                    className="inline-flex items-center gap-1 font-semibold text-[#173D2B] hover:underline shrink-0"
                  >
                    <span>Open My Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-4 gap-2">
                  {steps.map((st, idx) => {
                    const active = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div key={st.title} className="space-y-2 text-center">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            active ? "bg-[#173D2B]" : "bg-[#E5DACB]"
                          } ${isCurrent ? "ring-2 ring-[#C9AE8B] ring-offset-2" : ""}`}
                        />
                        <p
                          className={`text-[10px] sm:text-xs font-bold leading-tight ${
                            active ? "text-[#173D2B]" : "text-[#573B2C]/40"
                          }`}
                        >
                          {st.title}
                        </p>
                        <p className="text-[9px] text-[#573B2C]/70 hidden sm:block">{st.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Item Breakdown with Consistent Product Photos */}
            {order.items && order.items.length > 0 && (
              <div className="pt-4 border-t border-[#E5DACB] space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">
                  Items in this Order:
                </span>
                <div className="space-y-2 text-xs text-[#173D2B]">
                  {order.items.map((it: any, idx: number) => {
                    const specs = [
                      it.size,
                      it.temperature,
                      it.milk_type,
                      it.sweetness !== undefined && it.sweetness !== null ? `${it.sweetness}% sweet` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div
                        key={it.id || idx}
                        className="flex items-center justify-between gap-3 py-2 border-b border-[#F5F0E7] last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getProductImage({ name: it.product_name })}
                            alt={it.product_name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E5DACB] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#173D2B] truncate">
                              {it.quantity}x {it.product_name}
                            </p>
                            {specs && <p className="text-[10px] text-[#573B2C] truncate">{specs}</p>}
                          </div>
                        </div>
                        <span className="font-mono font-semibold shrink-0">
                          ₱{Number(it.subtotal ?? (it.unit_price || 0) * (it.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5DACB] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[#573B2C]">
                  Status: <strong className="uppercase text-[#173D2B]">{order.status}</strong>
                </span>
                <span className="text-[#573B2C]">
                  Payment:{" "}
                  <strong
                    className={`uppercase ${
                      order.payment_status === "paid" ? "text-emerald-800" : "text-amber-800"
                    }`}
                  >
                    {order.payment_status === "cod_pending"
                      ? "COD Pending"
                      : order.payment_status || "pending"}
                  </strong>
                </span>
              </div>
              <span className="font-mono font-bold text-base text-[#173D2B]">
                Total: ₱{Number(order.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center bg-[#FFFCF7]">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
