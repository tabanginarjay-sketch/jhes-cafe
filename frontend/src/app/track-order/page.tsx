"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Clock,
  CheckCircle2,
  Coffee,
  AlertCircle,
  Package,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [orderCode, setOrderCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrack = async (targetCode: string) => {
    if (!targetCode.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      // 1. Try direct route /orders/[id]
      const clean = targetCode.trim();
      const directRes = await fetch(`${API_BASE_URL}/orders/${clean}`, { cache: "no-store" });
      if (directRes.ok) {
        const found = await directRes.json();
        setOrder(found);
        setLoading(false);
        return;
      }

      // 2. Fallback to list search
      const res = await fetch(`${API_BASE_URL}/orders`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not connect to orders service");
      const list = await res.json();
      const matched = list.find(
        (o: any) =>
          o.order_number?.toLowerCase() === clean.toLowerCase() ||
          o.id?.toLowerCase() === clean.toLowerCase()
      );

      if (matched) {
        setOrder(matched);
      } else {
        // Fallback demo mock if checking specific codes
        if (clean.toUpperCase().includes("1001")) {
          setOrder({
            id: "rec-demo-1",
            order_number: "BNC-001001",
            customer_name: "Juan Ramos",
            dining_option: "Dine-in",
            status: "preparing",
            total_amount: 440,
            payment_status: "paid",
            items: [
              { product_name: "Spanish Latte Dulce", size: "Grande 16oz", quantity: 1, unit_price: 220 },
              { product_name: "Barako Espresso Romano", size: "Tall 12oz", quantity: 1, unit_price: 190 },
            ],
          });
        } else if (clean.toUpperCase().includes("1002")) {
          setOrder({
            id: "rec-demo-2",
            order_number: "BNC-001002",
            customer_name: "Patricia Valdez",
            dining_option: "Takeaway",
            status: "ready",
            total_amount: 190,
            payment_status: "paid",
            items: [
              { product_name: "Tagaytay Cloud Cold Brew", size: "Venti 20oz", quantity: 1, unit_price: 240 },
            ],
          });
        } else {
          setOrder(null);
        }
      }
    } catch (err) {
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
    { title: "Order Placed", desc: "Ticket queued at espresso bar" },
    { title: "Brewing & Steaming", desc: "9-Bar extraction in progress" },
    { title: "Ready at Counter", desc: "Freshly poured & waiting for you" },
    { title: "Completed", desc: "Enjoy your specialty brew!" },
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

  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#315640]">
            Live Barista Queue
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B]">
            Track Your Coffee
          </h1>
          <p className="text-xs text-[#573B2C] max-w-md mx-auto">
            Enter your order code (e.g. <code className="font-mono font-bold text-[#173D2B]">BNC-001001</code>) to view real-time espresso extraction and preparation status.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleTrack} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="Enter Order Code (e.g. BNC-001001)"
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

        {/* Quick Test Chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-[#573B2C]">
          <span className="font-semibold text-[10px] uppercase tracking-wider text-[#315640]">Sample Codes:</span>
          {["BNC-001001", "BNC-001002"].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setOrderCode(code);
                void fetchTrack(code);
              }}
              className="px-2.5 py-1 rounded-full bg-[#F5F0E7] border border-[#E5DACB] hover:bg-[#173D2B] hover:text-white font-mono transition-all cursor-pointer"
            >
              {code}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-center text-xs text-[#573B2C] animate-pulse">
            Connecting to espresso bar queue...
          </p>
        )}

        {searched && !loading && !order && (
          <div className="p-8 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-[#573B2C] mx-auto opacity-40" />
            <p className="font-serif text-lg font-bold text-[#173D2B]">No order found with code &quot;{orderCode}&quot;</p>
            <p className="text-xs text-[#573B2C]">
              Verify your order code from your receipt or email confirmation.
            </p>
          </div>
        )}

        {order && (
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-4">
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

            {/* Stepper with Descriptions */}
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
                      <p className={`text-[10px] sm:text-xs font-bold leading-tight ${
                        active ? "text-[#173D2B]" : "text-[#573B2C]/40"
                      }`}>
                        {st.title}
                      </p>
                      <p className="text-[9px] text-[#573B2C]/70 hidden sm:block">
                        {st.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Item Breakdown if available */}
            {order.items && order.items.length > 0 && (
              <div className="pt-4 border-t border-[#E5DACB] space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">
                  Drink Items in this Order:
                </span>
                <div className="space-y-1.5 text-xs text-[#173D2B]">
                  {order.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-[#F5F0E7]">
                      <span>
                        {it.quantity}x {it.product_name} {it.size ? `(${it.size})` : ""}
                      </span>
                      <span className="font-mono font-semibold">₱{(it.unit_price || 0) * (it.quantity || 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5DACB] flex items-center justify-between text-xs">
              <span className="text-[#573B2C]">
                Status: <strong className="uppercase text-[#173D2B]">{order.status}</strong>
              </span>
              <span className="font-mono font-bold text-base text-[#173D2B]">
                Total: ₱{order.total_amount}
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
