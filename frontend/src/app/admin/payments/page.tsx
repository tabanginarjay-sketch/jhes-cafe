"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import type {
  NormalizedPayment,
  PaymentDashboardStats,
} from "@/lib/paymentLedger";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Search,
  User,
  Calendar,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Award,
  X,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  FileText,
  FlaskConical,
  Banknote,
  Receipt,
  History,
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
  { id: "cash", label: "Counter Cash" },
  { id: "gcash", label: "GCash" },
  { id: "maya", label: "Maya" },
  { id: "card", label: "Credit / Debit Card" },
] as const;

function formatPhp(val: number): string {
  return `₱${Number(val || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMethodLabel(provider: string): string {
  switch (provider.toLowerCase()) {
    case "gcash":
      return "GCash";
    case "maya":
      return "Maya";
    case "card":
      return "Card";
    case "cash":
      return "Counter Cash";
    default:
      return provider.toUpperCase();
  }
}

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
  const [detailLoading, setDetailLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Action Form States inside Modal
  const [activeActionPanel, setActiveActionPanel] = useState<
    "none" | "confirm_cash" | "verify_demo" | "mark_failed" | "refund"
  >("none");
  const [cashReceiptRef, setCashReceiptRef] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [demoRef, setDemoRef] = useState("");
  const [demoAck, setDemoAck] = useState(false);
  const [demoNote, setDemoNote] = useState("");
  const [failReason, setFailReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

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

  const resetModalForms = (payment?: NormalizedPayment | null) => {
    setActiveActionPanel("none");
    setModalError(null);
    setModalSuccess(null);
    setCashReceiptRef("");
    setCashNote("");
    setDemoRef("");
    setDemoAck(false);
    setDemoNote("");
    setFailReason("");
    setRefundAmount(payment ? String(payment.amount) : "");
    setRefundReason("");
  };

  const openPaymentDetail = async (payment: NormalizedPayment) => {
    setSelectedPayment(payment);
    resetModalForms(payment);
    try {
      setDetailLoading(true);
      const res = await fetch(`${API_BASE_URL}/payments/${payment.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const fresh: NormalizedPayment = await res.json();
        setSelectedPayment(fresh);
        setRefundAmount(String(fresh.amount));
      }
    } catch {
      // Keep row snapshot if live refresh fails
    } finally {
      setDetailLoading(false);
    }
  };

  const closePaymentDetail = () => {
    setSelectedPayment(null);
    resetModalForms(null);
  };

  const submitPaymentAction = async (payload: Record<string, unknown>, successMsg: string) => {
    if (!selectedPayment) return;
    try {
      setSubmittingAction(true);
      setModalError(null);
      setModalSuccess(null);

      const res = await fetch(`${API_BASE_URL}/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModalError(data.detail || "Payment action rejected by server security checks.");
        return;
      }

      setSelectedPayment(data);
      resetModalForms(data);
      setModalSuccess(successMsg);
      setSuccessBanner(successMsg);
      // Reload full ledger + recomputed KPIs from Airtable
      await loadPayments();
    } catch {
      setModalError("Network error while communicating with Payments API.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Client-side filtered list (synced with exact server KPIs)
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

  const renderStatusBadge = (status: NormalizedPayment["status"]) => {
    if (status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold uppercase text-[10px] tracking-wider">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          <span>Completed</span>
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-bold uppercase text-[10px] tracking-wider">
          <XCircle className="w-3 h-3 text-rose-700" />
          <span>Failed</span>
        </span>
      );
    }
    if (status === "refunded") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-900 font-bold uppercase text-[10px] tracking-wider">
          <RotateCcw className="w-3 h-3 text-slate-700" />
          <span>Refunded</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold uppercase text-[10px] tracking-wider">
        <Clock className="w-3 h-3 text-amber-700" />
        <span>Pending</span>
      </span>
    );
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

      {/* Feedback Banners */}
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
        {/* Total Collected */}
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

        {/* Pending Payments */}
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

        {/* Failed Payments */}
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

        {/* Refunded Payments */}
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
          {/* Payment ID / Order Ref Search */}
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

          {/* Customer Search */}
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

          {/* Payment Method Filter */}
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

          {/* Status Filter */}
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

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="relative">
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
            </div>
            <div className="relative">
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
                    onClick={() => void openPaymentDetail(p)}
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
                    <td className="p-4">{renderStatusBadge(p.status)}</td>
                    <td className="p-4 text-[#573B2C] whitespace-nowrap">
                      {formatDate(p.created_at)}
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

        {/* Pagination Footer */}
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

      {/* Payment Detail Slide-Over Modal */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 bg-[#0F2A1D]/55 backdrop-blur-xs flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Payment Transaction Details"
          onClick={closePaymentDetail}
        >
          <div
            className="w-full max-w-2xl bg-[#FFFCF7] h-full overflow-y-auto shadow-2xl border-l border-[#E5DACB] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-[#173D2B] text-white px-6 py-5 flex items-start justify-between gap-4 border-b border-[#0F2A1D]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9AE8B]">
                    Payment Audit Record
                  </span>
                  {selectedPayment.is_simulated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-300/40 text-purple-100 text-[10px] font-semibold">
                      <FlaskConical className="w-3 h-3" />
                      Simulated Portfolio Demo
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-2xl font-bold text-[#FFFCF7]">
                  {selectedPayment.payment_ref}
                </h2>
                <p className="text-[11px] font-mono text-[#DECDB8]">
                  Record ID: {selectedPayment.id}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentDetail}
                aria-label="Close payment details"
                className="p-2 rounded-full bg-[#315640] hover:bg-[#3e6d51] text-[#FFFCF7] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {detailLoading && (
                <div className="text-xs font-mono text-[#573B2C] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing live Airtable record...</span>
                </div>
              )}

              {modalError && (
                <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
                  <span>{modalError}</span>
                </div>
              )}
              {modalSuccess && (
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                  <span className="font-medium">{modalSuccess}</span>
                </div>
              )}

              {/* Primary Financial & Status Summary Card */}
              <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACB] pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block">
                      Payment Amount ({selectedPayment.currency})
                    </span>
                    <p className="font-serif text-3xl font-bold text-[#173D2B] mt-0.5">
                      {formatPhp(selectedPayment.amount)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {renderStatusBadge(selectedPayment.status)}
                    <span className="text-[10px] font-mono text-[#573B2C]">
                      Method: {formatMethodLabel(selectedPayment.provider)}
                    </span>
                  </div>
                </div>

                {/* Structured Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                      Payment ID
                    </span>
                    <span className="font-mono text-[#173D2B] font-semibold break-all">
                      {selectedPayment.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                      Order Reference
                    </span>
                    <div className="font-mono text-[#173D2B] font-semibold">
                      {selectedPayment.order_number}
                    </div>
                    <div className="text-[10px] font-mono text-[#573B2C]/75">
                      Order ID: {selectedPayment.order_id || "—"}
                      {selectedPayment.order_status ? ` · Prep: ${selectedPayment.order_status}` : ""}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                      Customer
                    </span>
                    <div className="font-semibold text-[#173D2B]">
                      {selectedPayment.customer_name}
                    </div>
                    <div className="text-[11px] font-mono text-[#573B2C]/80">
                      {selectedPayment.customer_email || "No email linked"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                      Currency &amp; Verification Channel
                    </span>
                    <div className="font-semibold text-[#173D2B]">
                      PHP (Philippine Peso)
                    </div>
                    <div className="text-[11px] text-[#573B2C]">
                      {selectedPayment.verification_mode === "cashier_counter"
                        ? "Authorized Counter Cashier"
                        : selectedPayment.verification_mode === "provider_webhook"
                          ? "Signed Provider Webhook"
                          : selectedPayment.verification_mode === "demo_simulated"
                            ? "Portfolio Demo Simulation (Not Real Funds)"
                            : "Awaiting Verification"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                      Provider Transaction Reference
                    </span>
                    <div className="mt-1 px-3 py-2 rounded-xl bg-[#F5F0E7] font-mono text-[11px] text-[#173D2B] break-all">
                      {selectedPayment.provider_transaction_ref || "Not yet issued"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                      Created Date
                    </span>
                    <span className="text-[#173D2B] font-medium inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#573B2C]" />
                      {formatDate(selectedPayment.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                      Last Updated Date
                    </span>
                    <span className="text-[#173D2B] font-medium inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#573B2C]" />
                      {formatDate(selectedPayment.updated_at)}
                    </span>
                  </div>
                </div>

                {/* Immutability Policy Notice */}
                <div className="pt-3 border-t border-[#E5DACB] flex items-center gap-2 text-[11px] text-[#573B2C]">
                  <Lock className="w-3.5 h-3.5 text-[#173D2B] shrink-0" />
                  <span>
                    Amounts, payment methods, and references are locked against arbitrary edits. Payment status is strictly separated from order preparation status.
                  </span>
                </div>
              </div>

              {/* Status-Specific Info Cards (FAILED / REFUNDED / COMPLETED Evidence) */}
              {selectedPayment.status === "failed" && (
                <div className="p-5 rounded-3xl border border-rose-200 bg-rose-50/70 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-900">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    <span>Payment Failure Reason</span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    {selectedPayment.failure_reason || "Payment declined or failed to verify."}
                  </p>
                  <p className="text-[11px] text-rose-800/80">
                    This failed payment is excluded from collected revenue and preserved as an immutable audit record.
                  </p>
                </div>
              )}

              {selectedPayment.status === "refunded" && (
                <div className="p-5 rounded-3xl border border-slate-300 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
                      <RotateCcw className="w-4 h-4 text-slate-700" />
                      <span>Linked Refund Record</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {selectedPayment.refund?.refund_ref || "Refund Linked"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Original Transaction
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {selectedPayment.payment_ref} ({formatPhp(selectedPayment.amount)})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Refund Amount
                      </span>
                      <span className="font-mono font-bold text-rose-800">
                        {formatPhp(selectedPayment.refund?.amount ?? selectedPayment.amount)} PHP
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Refund Record ID
                      </span>
                      <span className="font-mono text-slate-800">
                        {selectedPayment.refund?.id || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Processed By &amp; Date
                      </span>
                      <span className="text-slate-800">
                        {selectedPayment.refund?.refunded_by || "Administrator"} ·{" "}
                        {formatDate(selectedPayment.refund?.refunded_at || selectedPayment.updated_at)}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Refund Reason
                      </span>
                      <p className="text-slate-900 mt-0.5">
                        {selectedPayment.refund?.reason || "Audited refund issued."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedPayment.status === "completed" && (
                <div className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    <span>Verification Evidence</span>
                  </div>
                  <p className="text-xs text-emerald-950 font-mono break-all">
                    Ref: {selectedPayment.provider_transaction_ref}
                  </p>
                  {selectedPayment.is_simulated ? (
                    <p className="text-[11px] text-purple-900 bg-purple-100/80 border border-purple-200 rounded-xl px-3 py-2">
                      <strong>Portfolio Demo Simulation:</strong> This transaction was verified using the controlled demo workflow and does not represent real live money settled via a payment gateway.
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-900/90">
                      Verified through{" "}
                      {selectedPayment.verification_mode === "provider_webhook"
                        ? "cryptographically signed provider webhook"
                        : "authorized counter cashier confirmation"}
                      .
                    </p>
                  )}
                </div>
              )}

              {/* Authorized Status-Based Action Controls */}
              {selectedPayment.status === "pending" && (
                <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                      Authorized Verification Actions
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Pending Review
                    </span>
                  </div>

                  {/* Provider-Specific Guidance */}
                  {selectedPayment.provider !== "cash" && (
                    <div className="p-3.5 rounded-2xl bg-[#F5F0E7] border border-[#E5DACB] text-[11px] text-[#573B2C] space-y-1">
                      <p className="font-bold text-[#173D2B]">
                        Online Payment Security ({formatMethodLabel(selectedPayment.provider)}):
                      </p>
                      <p>
                        Generic one-click confirmation is disabled. Real online payments require a signed provider webhook (<code className="font-mono">/api/v1/payments/webhook</code>). For portfolio demonstrations, you may run the clearly labeled Controlled Demo Verification below.
                      </p>
                    </div>
                  )}

                  {/* Action Selector Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {selectedPayment.provider === "cash" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveActionPanel(
                            activeActionPanel === "confirm_cash" ? "none" : "confirm_cash"
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          activeActionPanel === "confirm_cash"
                            ? "bg-[#173D2B] text-white"
                            : "bg-emerald-100 text-emerald-950 hover:bg-emerald-800 hover:text-white"
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Confirm Counter Cash Received</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveActionPanel(
                            activeActionPanel === "verify_demo" ? "none" : "verify_demo"
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          activeActionPanel === "verify_demo"
                            ? "bg-purple-900 text-white"
                            : "bg-purple-100 text-purple-950 hover:bg-purple-800 hover:text-white"
                        }`}
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>Controlled Demo Verification</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setActiveActionPanel(
                          activeActionPanel === "mark_failed" ? "none" : "mark_failed"
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        activeActionPanel === "mark_failed"
                          ? "bg-rose-800 text-white"
                          : "bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-700 hover:text-white"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Mark Payment Failed</span>
                    </button>
                  </div>

                  {/* Cash Confirmation Form */}
                  {activeActionPanel === "confirm_cash" && selectedPayment.provider === "cash" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitPaymentAction(
                          {
                            action: "confirm_cash",
                            receipt_reference: cashReceiptRef.trim(),
                            note: cashNote.trim() || "Counter cash received and verified by cashier.",
                          },
                          `Counter cash payment ${selectedPayment.payment_ref} confirmed with cashier audit trail.`
                        );
                      }}
                      className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3"
                    >
                      <p className="text-xs font-bold text-emerald-950">
                        Authorized Cashier Confirmation ({formatPhp(selectedPayment.amount)})
                      </p>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-emerald-950 block">
                          POS / Counter Receipt Reference (Optional)
                        </label>
                        <input
                          type="text"
                          value={cashReceiptRef}
                          onChange={(e) => setCashReceiptRef(e.target.value)}
                          placeholder="e.g. RCPT-0412"
                          className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs text-[#173D2B] font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-emerald-950 block">
                          Cashier Verification Note
                        </label>
                        <input
                          type="text"
                          value={cashNote}
                          onChange={(e) => setCashNote(e.target.value)}
                          placeholder="Exact cash received at front register"
                          className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs text-[#173D2B]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingAction}
                        className="px-5 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAction ? "Recording Verification..." : "Record Cashier Cash Confirmation"}
                      </button>
                    </form>
                  )}

                  {/* Controlled Demo Verification Form */}
                  {activeActionPanel === "verify_demo" && selectedPayment.provider !== "cash" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitPaymentAction(
                          {
                            action: "verify_demo",
                            verification_reference: demoRef.trim(),
                            demo_acknowledgement: demoAck,
                            note:
                              demoNote.trim() ||
                              "Controlled portfolio demo verification (simulated — no real funds settled).",
                          },
                          `Simulated demo verification recorded for ${selectedPayment.payment_ref}.`
                        );
                      }}
                      className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3"
                    >
                      <p className="text-xs font-bold text-purple-950">
                        Controlled Portfolio Demo Verification ({formatMethodLabel(selectedPayment.provider)})
                      </p>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-purple-950 block">
                          Simulated Provider Reference (Required, min 4 chars)
                        </label>
                        <input
                          type="text"
                          required
                          minLength={4}
                          value={demoRef}
                          onChange={(e) => setDemoRef(e.target.value)}
                          placeholder="e.g. SIM-GCASH-9921"
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs text-[#173D2B] font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-purple-950 block">
                          Audit Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={demoNote}
                          onChange={(e) => setDemoNote(e.target.value)}
                          placeholder="Simulated online checkout walkthrough"
                          className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs text-[#173D2B]"
                        />
                      </div>
                      <label className="flex items-start gap-2 text-[11px] text-purple-950 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={demoAck}
                          onChange={(e) => setDemoAck(e.target.checked)}
                          className="mt-0.5 accent-purple-800"
                        />
                        <span>
                          I acknowledge this is a <strong>simulated portfolio demo payment</strong> and will be visibly labeled as demo data, not actual settled gateway funds.
                        </span>
                      </label>
                      <button
                        type="submit"
                        disabled={submittingAction || !demoAck || demoRef.trim().length < 4}
                        className="px-5 py-2.5 rounded-full bg-purple-900 hover:bg-purple-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAction ? "Verifying Simulation..." : "Complete Controlled Demo Verification"}
                      </button>
                    </form>
                  )}

                  {/* Mark Failed Form */}
                  {activeActionPanel === "mark_failed" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitPaymentAction(
                          {
                            action: "mark_failed",
                            reason: failReason.trim(),
                          },
                          `Payment ${selectedPayment.payment_ref} marked as failed and excluded from revenue.`
                        );
                      }}
                      className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3"
                    >
                      <p className="text-xs font-bold text-rose-950">
                        Mark Payment Failed (Mandatory Audit Reason)
                      </p>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-rose-950 block">
                          Failure Reason (Required)
                        </label>
                        <textarea
                          required
                          minLength={3}
                          rows={2}
                          value={failReason}
                          onChange={(e) => setFailReason(e.target.value)}
                          placeholder="e.g. Customer canceled at counter / GCash transfer expired / insufficient funds"
                          className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs text-[#173D2B]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingAction || failReason.trim().length < 3}
                        className="px-5 py-2.5 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAction ? "Updating Status..." : "Confirm Mark as Failed"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Supported Auditable Refund Workflow for COMPLETED Payments */}
              {selectedPayment.status === "completed" && (
                <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                      Auditable Refund Workflow
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveActionPanel(activeActionPanel === "refund" ? "none" : "refund")
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-900 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{activeActionPanel === "refund" ? "Cancel Refund" : "Initiate Refund"}</span>
                    </button>
                  </div>

                  {activeActionPanel !== "refund" ? (
                    <p className="text-xs text-[#573B2C]">
                      Completed payments cannot be edited directly. If an adjustment or reversal is needed, initiate an auditable refund to generate a linked <code className="font-mono">REF-*</code> record while preserving the original payment intact.
                    </p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitPaymentAction(
                          {
                            action: "refund",
                            refund_amount: Number(refundAmount),
                            reason: refundReason.trim(),
                          },
                          `Refund issued and linked to original payment ${selectedPayment.payment_ref}.`
                        );
                      }}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-900 block">
                            Refund Amount (PHP, max {formatPhp(selectedPayment.amount)})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={selectedPayment.amount}
                            required
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-[#173D2B] font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-900 block">
                            Original Payment Protected
                          </label>
                          <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-700">
                            {selectedPayment.payment_ref} · {formatPhp(selectedPayment.amount)}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-900 block">
                          Refund Reason (Required for Audit Trail)
                        </label>
                        <textarea
                          required
                          minLength={3}
                          rows={2}
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="e.g. Wrong drink prepared / customer requested cancellation before pickup"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-[#173D2B]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingAction || refundReason.trim().length < 3}
                        className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAction ? "Creating Linked Refund..." : "Issue Linked Refund Record"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Payment Verification History / Audit Timeline */}
              <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#173D2B]" />
                  <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                    Payment Verification History
                  </h3>
                </div>

                {selectedPayment.verification_history.length === 0 ? (
                  <p className="text-xs text-[#573B2C]">No verification events logged yet.</p>
                ) : (
                  <ol className="relative border-l-2 border-[#E5DACB] ml-2 space-y-4">
                    {selectedPayment.verification_history.map((entry, idx) => (
                      <li key={`${entry.at}-${idx}`} className="ml-5 space-y-1">
                        <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-[#173D2B] border-2 border-[#FFFCF7] flex items-center justify-center">
                          <FileText className="w-2 h-2 text-[#C9AE8B]" />
                        </span>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#173D2B] capitalize">
                            {entry.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-mono text-[#573B2C]">
                            {formatDate(entry.at)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#573B2C]">
                          Actor: <span className="font-semibold text-[#173D2B]">{entry.by}</span>
                          {entry.role ? ` (${entry.role})` : ""}
                          {entry.is_simulated ? " · [Simulated Demo]" : ""}
                        </div>
                        {entry.ref && (
                          <div className="text-[10px] font-mono text-[#315640] break-all">
                            Ref: {entry.ref}
                          </div>
                        )}
                        {entry.reason && (
                          <p className="text-[11px] text-[#573B2C] bg-[#F5F0E7]/70 rounded-lg px-2.5 py-1.5">
                            {entry.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
