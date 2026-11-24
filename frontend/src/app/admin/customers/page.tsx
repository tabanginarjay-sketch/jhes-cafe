"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, type UserData } from "@/lib/api";
import { RefreshCw } from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/users`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        setCustomers(await res.json());
      } else {
        setError("Failed to fetch customer directory from Airtable.");
      }
    } catch {
      setError("Unable to reach customer directory API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Customer Directory</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Live registered accounts from Airtable Users table ({customers.length} records).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCustomers()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F5F0E7] transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Customers</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Mobile Contact</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Loyalty Bean Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-[#573B2C]">
                    {loading ? "Loading customer records from Airtable..." : "No customers registered yet."}
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isElevated = ["vip", "manager", "admin"].includes(
                    String(c.role || "").toLowerCase()
                  );
                  return (
                    <tr key={c.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                      <td className="p-4 font-bold flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center font-serif text-[11px] font-bold">
                          {c.full_name ? c.full_name[0].toUpperCase() : "C"}
                        </div>
                        <span>{c.full_name || "Unnamed User"}</span>
                      </td>
                      <td className="p-4 text-[#573B2C] font-mono">{c.email}</td>
                      <td className="p-4 font-mono">{c.phone || "—"}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isElevated ? "bg-[#173D2B] text-[#C9AE8B]" : "bg-[#F5F0E7] text-[#573B2C]"
                          }`}
                        >
                          {c.role || "customer"}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-right text-sm text-[#173D2B]">
                        {Number(c.loyalty_points) || 0} pts
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
