"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import type {
  NormalizedPayment,
  PaymentDashboardStats,
} from "@/lib/paymentLedger";
import {
  PaymentDetailDrawer,
  formatPhp,
  formatPaymentDate,
  formatMethodLabel,
  renderPaymentStatusBadge,
} from "@/components/admin/PaymentDetailDrawer";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Search,
  User,
  CreditCard,
  ShieldCheck,
  Award,
  X,
  ChevronRight,
  ChevronLeft,
  FlaskConical,
  Banknote,
  Filter,
} from "lucide-react";

const STATUS_TABS = [
  { id: "all", label: "All Payments" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
  { id: "refunded", label: "Refunded" },
] as const;

const METHOD_OPTIONS = [
  { id: "all", label: "All Methods" },
  { id: "cod", label: "Cash on Delivery (COD)" },
  { id: "cash", label: "Counter Cash" },
  { id: "gcash", label: "GCash" },
  { id: "maya", label: "Maya" },
  { id: "card", label: "Credit / Debit Card" },
] as const;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<NormalizedPayment[]>([]);
  const [stats, setStats] = useState<PaymentDashboardStats>({
    total_count: 0,
    total_collected: 0,
    completed_count: 0,
    verified_live_collected: 0,
    simulated_demo_collected: 0,
    pending_count: 0,
    pending_amount: 0,
    failed_count: 0,
    failed_amount: 0,
    refunded_count: 0,
    refunded_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Payment Detail Drawer
  const [selectedPayment, setSelectedPayment] = useState<NormalizedPayment | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setErrorBanner(null);
      const res = await fetch(`${API_BASE_URL}/payments?include_meta=true&page=1&page_size=100`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const list: NormalizedPayment[] = Array.isArray(data?.payments)
          ? data.payments
          : Array.isArray(data)
            ? data
            : [];
        setPayments(list);
        if (data?.stats) {
          setStats(data.stats);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorBanner(err.detail || "Failed to load payment records from Airtable.");
      }
    } catch {
      setErrorBanner("Unable to connect to the Payments API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cq = customerSearch.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).getTime() : null;

    return payments.filter((p) => {
      if (activeTab !== "all" && p.status !== activeTab) return false;
      if (methodFilter !== "all" && p.provider !== methodFilter) return false;
      if (q) {
        const matchesIdOrOrder =
          p.id.toLowerCase().includes(q) ||
          p.payment_ref.toLowerCase().includes(q) ||
          p.order_number.toLowerCase().includes(q) ||
          p.order_id.toLowerCase().includes(q) ||
          p.transaction_id.toLowerCase().includes(q) ||
          (p.refund?.refund_ref || "").toLowerCase().includes(q);
        if (!matchesIdOrOrder) return false;
      }
      if (cq) {
        const matchesCustomer =
          p.customer_name.toLowerCase().includes(cq) ||
          (p.customer_email || "").toLowerCase().includes(cq);
        if (!matchesCustomer) return false;
      }
      if (fromTs !== null && !Number.isNaN(fromTs)) {
        const t = new Date(p.created_at).getTime();
        if (Number.isNaN(t) || t < fromTs) return false;
      }
      if (toTs !== null && !Number.isNaN(toTs)) {
        const t = new Date(p.created_at).getTime();
        if (Number.isNaN(t) || t > toTs) return false;
      }
      return true;
    });
  }, [payments, activeTab, methodFilter, searchQuery, customerSearch, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedPayments = filteredPayments.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilters =
    activeTab !== "all" ||
    methodFilter !== "all" ||
    searchQuery.trim() !== "" ||
    customerSearch.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const clearAllFilters = () => {
    setActiveTab("all");
    setMethodFilter("all");
    setSearchQuery("");
    setCustomerSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const tabCount = (tabId: string) => {
    switch (tabId) {
      case "pending":
        return stats.pending_count;
      case "completed":
        return stats.completed_count;
      case "failed":
        return stats.failed_count;
      case "refunded":
        return stats.refunded_count;
      default:
        return stats.total_count;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#315640] bg-[#173D2B]/10 px-2.5 py-1 rounded-full mb-2">
            <ShieldCheck className="w-3 h-3" />
            <span>PHP Order Payments Only · Loyalty &amp; Cart Excluded</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
            Payment Management
          </h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Click any payment row to inspect verification evidence, audit history, or perform authorized cashier/refund actions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/loyalty"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-white text-xs font-semibold text-[#573B2C] hover:text-[#173D2B] hover:bg-[#F5F0E7] transition-all"
          >
            <Award className="w-3.5 h-3.5 text-[#C9AE8B]" />
            <span>Loyalty Ledger</span>
          </Link>
          <button
            type="button"
            onClick={() => void loadPayments()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D2B] text-white text-xs font-semibold hover:bg-[#315640] transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-center justify-between gap-3">
          <span>{errorBanner}</span>
          <button type="button" onClick={() => setErrorBanner(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successBanner && (
        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center justify-between gap-3">
          <span className="font-medium">{successBanner}</span>
          <button type="button" onClick={() => setSuccessBanner(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
              Total Collected
            </span>
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="font-serif text-3xl font-bold text-[#173D2B]">
            {formatPhp(stats.total_collected)}
          </p>
          <div className="text-[11px] text-[#573B2C] space-y-0.5">
            <p className="font-medium">
              {stats.completed_count} completed order {stats.completed_count === 1 ? "payment" : "payments"}
            </p>
            <p className="text-[10px] font-mono text-[#573B2C]/80">
              Cash/Live: {formatPhp(stats.verified_live_collected)} · Demo Sim: {formatPhp(stats.simulated_demo_collected)}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
              Pending Payments
            </span>
            <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="font-serif text-3xl font-bold text-amber-900">
            {formatPhp(stats.pending_amount)}
          </p>
          <p className="text-[11px] text-[#573B2C]">
            {stats.pending_count} awaiting authorized verification
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
              Failed Payments
            </span>
            <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="font-serif text-3xl font-bold text-rose-900">
            {stats.failed_count}
          </p>
          <p className="text-[11px] text-[#573B2C]">
            {formatPhp(stats.failed_amount)} excluded from revenue
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
              Refunded Payments
            </span>
            <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <p className="font-serif text-3xl font-bold text-slate-900">
            {formatPhp(stats.refunded_amount)}
          </p>
          <p className="text-[11px] text-[#573B2C]">
            {stats.refunded_count} linked refund {stats.refunded_count === 1 ? "record" : "records"}
          </p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#173D2B] text-white shadow-xs"
                  : "bg-white border border-[#E5DACB] text-[#573B2C] hover:text-[#173D2B] hover:bg-[#FFFCF7]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-[#315640] text-[#C9AE8B]" : "bg-[#F5F0E7] text-[#573B2C]"
                }`}
              >
                {tabCount(tab.id)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Multi-Facet Filter Bar */}
      <div className="p-4 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#573B2C]">
            <Filter className="w-3.5 h-3.5 text-[#173D2B]" />
            <span>Search &amp; Filter Transactions</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] font-semibold text-rose-800 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="w-3.5 h-3.5 text-[#573B2C]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Payment ID, PAY ref, Order ref, or TX ref..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5DACB] bg-[#FFFCF7] text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
            />
          </div>

          <div className="relative">
            <User className="w-3.5 h-3.5 text-[#573B2C]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Customer name or email..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5DACB] bg-[#FFFCF7] text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
            />
          </div>

          <div className="relative">
            <CreditCard className="w-3.5 h-3.5 text-[#573B2C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filter by payment method"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5DACB] bg-[#FFFCF7] text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter by payment status"
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#E5DACB] bg-[#FFFCF7] text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
            >
              {STATUS_TABS.map((t) => (
                <option key={t.id} value={t.id}>
                  Status: {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="date"
              aria-label="From date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-2 rounded-xl border border-[#E5DACB] bg-[#FFFCF7] text-[11px] text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
              title="Start date"
            />
            <input
              type="date"
              aria-label="To date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-2 rounded-xl border border-[#E5DACB] bg-[#FFFCF7] text-[11px] text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
              title="End date"
            />
          </div>
        </div>
      </div>

      {/* Main Payments Table */}
      <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F0E7] text-[#573B2C] uppercase tracking-wider font-semibold border-b border-[#E5DACB]">
              <tr>
                <th className="p-4">Payment Reference</th>
                <th className="p-4">Order Ref</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Method</th>
                <th className="p-4 text-right">Amount (PHP)</th>
                <th className="p-4">Status</th>
                <th className="p-4">Recorded</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACB] text-[#173D2B]">
              {pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[#573B2C]">
                    {loading
                      ? "Loading verified order payments from Airtable..."
                      : "No order payment transactions match your current filters."}
                  </td>
                </tr>
              ) : (
                pagedPayments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    className="hover:bg-[#F5F0E7]/60 transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="font-mono font-bold text-[#173D2B] flex items-center gap-1.5 flex-wrap">
                        <span>{p.payment_ref}</span>
                        {p.is_simulated && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-sans font-bold text-[9px] uppercase tracking-wider">
                            <FlaskConical className="w-2.5 h-2.5" />
                            Demo Sim
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#573B2C]/70 mt-0.5">
                        ID: {p.id}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono font-semibold text-[#173D2B]">
                        {p.order_number}
                      </div>
                      {p.order_status && (
                        <span className="text-[10px] text-[#573B2C]/80 capitalize">
                          Order: {p.order_status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-[#173D2B]">{p.customer_name}</div>
                      <div className="text-[11px] font-mono text-[#573B2C]/80">
                        {p.customer_email || "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F0E7] text-[#173D2B] font-semibold text-[11px]">
                        {p.provider === "cash" ? (
                          <Banknote className="w-3 h-3 text-[#315640]" />
                        ) : (
                          <CreditCard className="w-3 h-3 text-[#315640]" />
                        )}
                        <span>{formatMethodLabel(p.provider)}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-sm text-right whitespace-nowrap">
                      {formatPhp(p.amount)}
                      {p.refund && (
                        <div className="text-[10px] font-normal text-slate-600">
                          Refunded {formatPhp(p.refund.amount)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">{renderPaymentStatusBadge(p.status)}</td>
                    <td className="p-4 text-[#573B2C] whitespace-nowrap">
                      {formatPaymentDate(p.created_at)}
                    </td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F5F0E7] group-hover:bg-[#173D2B] group-hover:text-white text-[#173D2B] font-semibold text-[11px] transition-colors">
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-[#E5DACB] bg-[#FFFCF7] text-xs text-[#573B2C]">
          <div className="flex items-center gap-3">
            <span>
              {filteredPayments.length === 0
                ? "0 results"
                : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(
                    safePage * pageSize,
                    filteredPayments.length
                  )} of ${filteredPayments.length} order payments`}
            </span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-[#E5DACB] bg-white text-[11px] text-[#173D2B]"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E5DACB] bg-white disabled:opacity-40 hover:bg-[#F5F0E7] text-[#173D2B] font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono font-semibold text-[#173D2B] px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E5DACB] bg-white disabled:opacity-40 hover:bg-[#F5F0E7] text-[#173D2B] font-semibold cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Shared Payment Detail & Verification Slide-Over Drawer */}
      <PaymentDetailDrawer
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onUpdated={async (updated, message) => {
          setSelectedPayment(updated);
          setSuccessBanner(message);
          await loadPayments();
        }}
      />
    </div>
  );
}
