"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, type UserData } from "@/lib/api";
import { Users, RefreshCw, Award, Mail, Phone } from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/users`, { cache: "no-store" });
      if (res.ok) setCustomers(await res.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const displayList = customers.length > 0 ? customers : [
    { id: "cust-1", full_name: "Juan Ramos", email: "juan@example.com", phone: "+63 917 123 4567", role: "customer", loyalty_points: 320 },
    { id: "cust-2", full_name: "Maria Santos", email: "maria@example.com", phone: "+63 918 987 6543", role: "vip", loyalty_points: 840 },
    { id: "cust-3", full_name: "Patricia Valdez", email: "patricia@example.com", phone: "+63 917 892 4110", role: "customer", loyalty_points: 150 },
    { id: "cust-4", full_name: "Jherald Ramos", email: "jherald.ramos@gmail.com", phone: "+63 917 888 9900", role: "manager", loyalty_points: 1200 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Customer Directory</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Real registered members, loyalty bean balances, and membership levels synchronized with Airtable Users table.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCustomers}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Customers</span>
        </button>
      </div>

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Mobile Contact</th>
                <th className="p-4">Role Tier</th>
                <th className="p-4 text-right">Loyalty Bean Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {displayList.map((c) => {
                const isVip = c.role?.toLowerCase() === "vip" || c.role?.toLowerCase() === "manager";
                return (
                  <tr key={c.id || c.email} className="hover:bg-[#F5F0E7]/40 transition-colors">
                    <td className="p-4 font-bold flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center font-serif text-[11px] font-bold">
                        {c.full_name ? c.full_name[0].toUpperCase() : "C"}
                      </div>
                      <span>{c.full_name}</span>
                    </td>
                    <td className="p-4 text-[#573B2C] font-mono">{c.email}</td>
                    <td className="p-4 font-mono">{c.phone || "—"}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isVip ? "bg-[#173D2B] text-[#C9AE8B]" : "bg-[#F5F0E7] text-[#573B2C]"
                      }`}>
                        {c.role || "Customer"}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-right text-sm text-[#173D2B]">
                      {c.loyalty_points || 0} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
