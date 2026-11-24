"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import {
  Award,
  RefreshCw,
  Search,
  Sparkles,
  Gift,
  ShoppingBag,
  ArrowDownCircle,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

interface LoyaltyTx {
  id: string;
  transaction_ref: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  transaction_type: "signup_bonus" | "order_earned" | "redemption" | "adjustment";
  points: number;
  signed_points: number;
  unit: string;
  order_reference: string | null;
  idempotency_key: string;
  description: string;
  created_at: string;
}

interface LoyaltyStats {
  total_transactions: number;
  total_points_issued: number;
  signup_bonus_points: number;
  order_earned_points: number;
  redeemed_points: number;
  net_points: number;
}

const TYPE_TABS = [
  { id: "all", label: "All Loyalty Activity" },
  { id: "signup_bonus", label: "Signup Bonuses" },
  { id: "order_earned", label: "Order Earned" },
  { id: "redemption", label: "Redemptions" },
] as const;

export default function AdminLoyaltyPage() {
  const [transactions, setTransactions] = useState<LoyaltyTx[]>([]);
  const [stats, setStats] = useState<LoyaltyStats>({
    total_transactions: 0,
    total_points_issued: 0,
    signup_bonus_points: 0,
    order_earned_points: 0,
    redeemed_points: 0,
    net_points: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadLoyaltyLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/loyalty/transactions`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
        if (data?.stats) setStats(data.stats);
      } else {
        setError("Failed to load Loyalty Bean Points ledger from Airtable.");
      }
    } catch {
      setError("Unable to reach Loyalty Ledger API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLoyaltyLedger();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (activeTab !== "all" && tx.transaction_type !== activeTab) return false;
      if (!q) return true;
      return (
        tx.transaction_ref.toLowerCase().includes(q) ||
        tx.customer_name.toLowerCase().includes(q) ||
        (tx.customer_email || "").toLowerCase().includes(q) ||
        (tx.order_reference || "").toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
      );
    });
  }, [transactions, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const renderTypeBadge = (type: LoyaltyTx["transaction_type"]) => {
    switch (type) {
      case "signup_bonus":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#173D2B]/10 text-[#173D2B] font-bold uppercase text-[10px]">
            <Gift className="w-3 h-3 text-[#315640]" />
            <span>Signup Bonus</span>
          </span>
        );
      case "order_earned":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px]">
            <ShoppingBag className="w-3 h-3 text-emerald-700" />
            <span>Order Earned</span>
          </span>
        );
      case "redemption":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold uppercase text-[10px]">
            <ArrowDownCircle className="w-3 h-3 text-amber-700" />
            <span>Redemption</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 font-bold uppercase text-[10px]">
            <Sparkles className="w-3 h-3" />
            <span>Adjustment</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#315640] bg-[#173D2B]/10 px-2.5 py-1 rounded-full mb-2">
            <Award className="w-3 h-3" />
            <span>Non-Monetary Rewards Ledger · Separated from PHP Revenue</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
            Loyalty Bean Points Ledger
          </h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Audit history of signup bonuses, order-earned points, and redemptions. Measured strictly in Bean Points (pts), never Philippine Pesos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#573B2C] hover:text-[#173D2B] hover:bg-[#F5F0E7] transition-all"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>PHP Payments</span>
          </Link>
          <button
            type="button"
            onClick={() => void loadLoyaltyLedger()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D2B] text-white text-xs font-semibold hover:bg-[#315640] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Separation Guarantee Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#C9AE8B]/60 bg-[#FFFCF7] text-xs text-[#573B2C]">
        <ShieldCheck className="w-4 h-4 text-[#173D2B] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#173D2B]">Strict Financial Isolation:</span> Loyalty Bean Point entries (<code className="font-mono text-[11px]">LTX-*</code>) are strictly excluded from the Payments module and never counted in Collected Peso Revenue.
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900">
          {error}
        </div>
      )}

      {/* KPI Summary Cards (Strictly in Bean Points, never PHP) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Total Points Issued
          </span>
          <p className="font-serif text-3xl font-bold text-[#173D2B]">
            +{stats.total_points_issued.toLocaleString()}{" "}
            <span className="text-sm font-sans font-semibold text-[#573B2C]">pts</span>
          </p>
          <span className="text-[11px] text-[#573B2C]">
            Across {stats.total_transactions} ledger records
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Signup Welcome Bonuses
          </span>
          <p className="font-serif text-3xl font-bold text-[#315640]">
            +{stats.signup_bonus_points.toLocaleString()}{" "}
            <span className="text-sm font-sans font-semibold text-[#573B2C]">pts</span>
          </p>
          <span className="text-[11px] text-[#573B2C]">25 pts per verified new member</span>
        </div>

        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Earned From Orders
          </span>
          <p className="font-serif text-3xl font-bold text-emerald-900">
            +{stats.order_earned_points.toLocaleString()}{" "}
            <span className="text-sm font-sans font-semibold text-[#573B2C]">pts</span>
          </p>
          <span className="text-[11px] text-[#573B2C]">1 Bean Point per ₱50 spent</span>
        </div>

        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
            Points Redeemed
          </span>
          <p className="font-serif text-3xl font-bold text-amber-900">
            -{stats.redeemed_points.toLocaleString()}{" "}
            <span className="text-sm font-sans font-semibold text-[#573B2C]">pts</span>
          </p>
          <span className="text-[11px] text-[#573B2C]">
            Net circulating: {stats.net_points.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#173D2B] text-white shadow-xs"
                  : "bg-white border border-[#E5DACB] text-[#573B2C] hover:text-[#173D2B]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#573B2C]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search LTX ref, customer, or order..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
          />
        </div>
      </div>

      {/* Loyalty Ledger Table */}
      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Transaction Ref</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Order Ref</th>
                <th className="p-4">Description</th>
                <th className="p-4">Recorded</th>
                <th className="p-4 text-right">Bean Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#573B2C]">
                    {loading
                      ? "Loading Loyalty Bean Points transactions..."
                      : "No matching loyalty transactions found."}
                  </td>
                </tr>
              ) : (
                paged.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F5F0E7]/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#173D2B]">
                      {tx.transaction_ref}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-[#173D2B]">{tx.customer_name}</div>
                      <div className="text-[11px] font-mono text-[#573B2C]/80">
                        {tx.customer_email || tx.customer_id}
                      </div>
                    </td>
                    <td className="p-4">{renderTypeBadge(tx.transaction_type)}</td>
                    <td className="p-4 font-mono text-[#573B2C]">
                      {tx.order_reference || "—"}
                    </td>
                    <td className="p-4 text-[#573B2C] max-w-xs">{tx.description}</td>
                    <td className="p-4 text-[#573B2C] whitespace-nowrap">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : "—"}
                    </td>
                    <td
                      className={`p-4 font-mono font-bold text-right text-sm whitespace-nowrap ${
                        tx.signed_points < 0 ? "text-amber-800" : "text-emerald-800"
                      }`}
                    >
                      {tx.signed_points >= 0 ? `+${tx.points}` : `-${tx.points}`} pts
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5DACB] bg-[#FFFCF7] text-xs text-[#573B2C]">
            <span>
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of{" "}
              {filtered.length} loyalty entries
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-full border border-[#E5DACB] bg-white disabled:opacity-40 hover:bg-[#F5F0E7] cursor-pointer"
              >
                Previous
              </button>
              <span className="font-mono font-semibold text-[#173D2B]">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-full border border-[#E5DACB] bg-white disabled:opacity-40 hover:bg-[#F5F0E7] cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
