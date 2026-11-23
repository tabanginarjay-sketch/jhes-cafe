"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { ShoppingBag, CheckCircle, Clock } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch(`${API_BASE_URL}/orders`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch {
        // Fallback demo orders
      }
    }
    void loadOrders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Order Management Queue</h1>
        <p className="text-xs text-[#573B2C] mt-1">
          Review incoming drinks, advance preparation statuses, and monitor live totals.
        </p>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Order Code</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Dining</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {(orders.length > 0 ? orders : [
                { order_number: "ORD-1001", customer_name: "Juan Ramos", dining_option: "Dine-in", total_amount: 440, payment_method: "gcash", status: "preparing" },
                { order_number: "ORD-1002", customer_name: "Patricia Valdez", dining_option: "Takeaway", total_amount: 190, payment_method: "cash", status: "ready" },
              ]).map((ord, idx) => (
                <tr key={idx} className="hover:bg-[#F5F0E7]/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-[#173D2B]">{ord.order_number}</td>
                  <td className="p-4 font-medium">{ord.customer_name}</td>
                  <td className="p-4">{ord.dining_option}</td>
                  <td className="p-4 font-bold">₱{ord.total_amount}</td>
                  <td className="p-4 uppercase font-mono text-[10px]">{ord.payment_method}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                      {ord.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-xs font-semibold text-[#173D2B] hover:text-[#315640] underline cursor-pointer">
                      Mark Ready
                    </button>
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
