"use client";

import { useState } from "react";
import { Search, Clock, CheckCircle2, Coffee, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function TrackOrderPage() {
  const [orderCode, setOrderCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (!res.ok) throw new Error("Could not connect to orders service");
      const list = await res.json();
      const found = list.find(
        (o: any) =>
          o.order_number?.toLowerCase() === orderCode.trim().toLowerCase()
      );

      if (!found) {
        // If not found in list, show sample demo match or not found
        setOrder(null);
      } else {
        setOrder(found);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error tracking order");
    } finally {
      setLoading(false);
    }
  };

  const steps = ["Order Received", "Extracting Espresso", "Ready for Pickup", "Completed"];
  const currentStep = order?.status === "ready" ? 2 : order?.status === "completed" ? 3 : 1;

  return (
    <div className="py-16 sm:py-24 bg-[#FFFCF7]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="text-center space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#315640]">
            Live Barista Queue
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B]">
            Track Your Coffee
          </h1>
          <p className="text-xs text-[#573B2C]">
            Enter your order code (e.g. ORD-1001) to view real-time preparation status.
          </p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            placeholder="Enter Order Code (e.g. ORD-1001)"
            className="flex-1 rounded-full border border-[#E5DACB] bg-white px-5 py-3 text-xs text-[#173D2B] font-mono tracking-wider focus:outline-hidden focus:border-[#173D2B]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-4 h-4 text-[#C9AE8B]" />
            <span>Track</span>
          </button>
        </form>

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
              Verify your code from your order confirmation or receipt. Sample active codes: <code className="font-mono">ORD-1001</code>
            </p>
          </div>
        )}

        {order && (
          <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5DACB] pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#573B2C]">Order Number</span>
                <h3 className="font-serif text-2xl font-bold text-[#173D2B]">{order.order_number}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-[#573B2C] block">Customer</span>
                <span className="font-semibold text-xs text-[#173D2B]">{order.customer_name}</span>
              </div>
            </div>

            {/* Stepper */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {steps.map((st, idx) => {
                const active = idx <= currentStep;
                return (
                  <div key={st} className="space-y-2 text-center">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        active ? "bg-[#173D2B]" : "bg-[#E5DACB]"
                      }`}
                    />
                    <span className={`text-[10px] font-semibold block leading-tight ${
                      active ? "text-[#173D2B]" : "text-[#573B2C]/50"
                    }`}>
                      {st}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#E5DACB] flex items-center justify-between text-xs">
              <span className="text-[#573B2C]">Dining: <strong>{order.dining_option}</strong></span>
              <span className="font-mono font-bold text-sm text-[#173D2B]">Total: ₱{order.total_amount}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
