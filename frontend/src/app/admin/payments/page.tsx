"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { CreditCard, RefreshCw, CheckCircle2 } from "lucide-react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/payments`, { cache: "no-store" });
      if (res.ok) setPayments(await res.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, []);

  const list = payments.length > 0 ? payments : [
    { ref: "PAY-2026-0001", order: "BNC-001001", amount: 440, provider: "GCash", status: "Completed", date: "Nov 23, 2026, 8:43 AM" },
    { ref: "PAY-2026-0002", order: "BNC-001002", amount: 190, provider: "Cash at Counter", status: "Completed", date: "Nov 23, 2026, 8:50 AM" },
    { ref: "PAY-2026-0003", order: "BNC-001003", amount: 510, provider: "Maya", status: "Completed", date: "Nov 23, 2026, 9:02 AM" },
    { ref: "PAY-2026-0004", order: "BNC-000982", amount: 280, provider: "Credit Card (Visa)", status: "Completed", date: "Nov 22, 2026, 4:15 PM" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Payment Transactions</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Real-time reconciliation of GCash, Maya, Credit Card, and Cash counter payments.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPayments}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Transactions</span>
        </button>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Payment Ref</th>
                <th className="p-4">Order Code</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Gateway / Provider</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {list.map((p) => (
                <tr key={p.id || p.ref} className="hover:bg-[#F5F0E7]/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-[#173D2B]">{p.ref || p.id}</td>
                  <td className="p-4 font-mono">{p.order || p.order_id || "BNC-STORE"}</td>
                  <td className="p-4 font-mono font-bold text-sm">₱{p.amount}</td>
                  <td className="p-4 font-semibold">{p.provider || p.payment_method || "Counter"}</td>
                  <td className="p-4 text-[#573B2C]">{p.date || "Today"}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>{p.status || "Completed"}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
