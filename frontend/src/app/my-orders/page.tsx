"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coffee,
  Package,
  RefreshCw,
  Clock,
  CheckCircle2,
  CreditCard,
  Banknote,
  Utensils,
  ShoppingBag,
  Truck,
  MapPin,
  Phone,
  Bell,
  Send,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
  Lock,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, type OrderData, type OrderItemData } from "@/lib/api";
import { getProductImage } from "@/lib/productRegistry";
import {
  CORE_DELIVERY_TIMELINE,
  formatDeliveryStatusLabel,
  type CustomerNotification,
  type DeliveryStatus,
} from "@/lib/deliveryTypes";

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "brewing", "ready"]);
const TRACK_STEPS = ["Placed", "Preparing", "Ready", "Completed"];

function getTrackStepIndex(status?: string): number {
  const s = String(status || "pending").trim().toLowerCase();
  if (s === "completed") return 3;
  if (s === "ready") return 2;
  if (s === "preparing" || s === "brewing") return 1;
  return 0;
}

function getDeliveryStepIndex(status?: DeliveryStatus | string): number {
  const idx = CORE_DELIVERY_TIMELINE.indexOf(status as DeliveryStatus);
  return idx >= 0 ? idx : 0;
}

function getOrderStatusBadge(status?: string): string {
  switch (String(status || "pending").trim().toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "ready":
      return "bg-teal-100 text-teal-900 border-teal-300";
    case "preparing":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "confirmed":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "cancelled":
      return "bg-rose-100 text-rose-900 border-rose-300";
    default:
      return "bg-stone-100 text-stone-800 border-stone-300";
  }
}

function getPaymentStatusBadge(status?: string): string {
  switch (String(status || "pending").trim().toLowerCase()) {
    case "paid":
    case "completed":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "failed":
      return "bg-rose-50 text-rose-900 border-rose-200";
    case "refunded":
      return "bg-slate-100 text-slate-800 border-slate-300";
    default:
      return "bg-amber-50 text-amber-900 border-amber-200";
  }
}

function getDeliveryStatusBadge(status?: string): string {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "OUT_FOR_DELIVERY":
      return "bg-teal-100 text-teal-900 border-teal-300";
    case "PICKED_UP":
    case "READY_FOR_PICKUP":
    case "DRIVER_ASSIGNED":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "FAILED_DELIVERY":
    case "CANCELLED":
    case "RETURNED":
      return "bg-rose-100 text-rose-900 border-rose-300";
    default:
      return "bg-amber-100 text-amber-900 border-amber-300";
  }
}

function formatMethodLabel(method?: string): string {
  switch (String(method || "").toLowerCase().trim()) {
    case "cod":
      return "Cash on Delivery (COD)";
    case "gcash":
      return "GCash";
    case "maya":
      return "Maya";
    case "card":
      return "Credit / Debit Card";
    case "cash":
      return "Counter Cash";
    default:
      return String(method || "—").toUpperCase();
  }
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history" | "all">("active");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [fallbackItemsByOrder, setFallbackItemsByOrder] = useState<Record<string, OrderItemData[]>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Per-delivery restricted customer message & issue reporting state
  const [msgTextByDlv, setMsgTextByDlv] = useState<Record<string, string>>({});
  const [msgKindByDlv, setMsgKindByDlv] = useState<Record<string, "message" | "issue">>({});
  const [sendingMsgId, setSendingMsgId] = useState<string | null>(null);
  const [msgSuccessId, setMsgSuccessId] = useState<string | null>(null);

  const loadOrdersAndNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [ordRes, ntfRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders?include_items=true`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/notifications`, {
          credentials: "include",
          cache: "no-store",
        }).catch(() => null),
      ]);

      if (ordRes.status === 401) {
        await refreshUser();
        router.replace("/login?redirect=/my-orders");
        return;
      }
      if (!ordRes.ok) {
        throw new Error("Unable to retrieve your orders right now. Please try again.");
      }

      const data: OrderData[] = await ordRes.json();
      const cleanMine = (Array.isArray(data) ? data : []).filter((o) => {
        const emailMatch =
          o.customer_email &&
          o.customer_email.toLowerCase().trim() === user.email.toLowerCase().trim();
        const st = String(o.status || "").trim().toLowerCase();
        const num = String(o.order_number || "").trim().toUpperCase();
        return (
          emailMatch &&
          st !== "cart" &&
          st !== "cart_cleared" &&
          !num.startsWith("CART-") &&
          !num.startsWith("LOYALTY-")
        );
      });
      setOrders(cleanMine);

      if (ntfRes && ntfRes.ok) {
        const nData = await ntfRes.json();
        setNotifications(Array.isArray(nData?.notifications) ? nData.notifications : []);
      }

      const hasActive = cleanMine.some((o) => {
        const st = String(o.status || "pending").trim().toLowerCase();
        const dlvSt = o.delivery?.delivery_status;
        if (dlvSt) {
          return !["DELIVERED", "CANCELLED", "RETURNED"].includes(dlvSt);
        }
        return ACTIVE_STATUSES.has(st);
      });
      if (!hasActive && cleanMine.length > 0) {
        setActiveTab((prev) => (prev === "active" ? "history" : prev));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading orders.");
    } finally {
      setLoading(false);
    }
  }, [user, refreshUser, router]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadOrdersAndNotifications();
    } else if (!authLoading && !user) {
      setOrders([]);
      setLoading(false);
      router.replace("/login?redirect=/my-orders");
    }
  }, [authLoading, user, loadOrdersAndNotifications, router]);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleMarkAllRead = async () => {
    await fetch(`${API_BASE_URL}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleSendCustomerDeliveryMessage = async (deliveryId: string) => {
    const text = (msgTextByDlv[deliveryId] || "").trim();
    if (text.length < 2) return;
    const kind = msgKindByDlv[deliveryId] || "message";

    setSendingMsgId(deliveryId);
    setMsgSuccessId(null);
    try {
      const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind,
          text,
          ...(kind === "issue" ? { issue_category: "Customer Delivery Issue" } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Unable to send message.");
      }
      setMsgTextByDlv((prev) => ({ ...prev, [deliveryId]: "" }));
      setMsgSuccessId(deliveryId);
      await loadOrdersAndNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit message.");
    } finally {
      setSendingMsgId(null);
    }
  };

  const activeOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (o.delivery?.delivery_status) {
          return !["DELIVERED", "CANCELLED", "RETURNED"].includes(o.delivery.delivery_status);
        }
        return ACTIVE_STATUSES.has(String(o.status || "pending").trim().toLowerCase());
      }),
    [orders]
  );

  const pastOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (o.delivery?.delivery_status) {
          return ["DELIVERED", "CANCELLED", "RETURNED"].includes(o.delivery.delivery_status);
        }
        return !ACTIVE_STATUSES.has(String(o.status || "pending").trim().toLowerCase());
      }),
    [orders]
  );

  const displayedOrders =
    activeTab === "active" ? activeOrders : activeTab === "history" ? pastOrders : orders;

  const toggleExpandOrder = async (ord: OrderData) => {
    if (expandedOrderId === ord.id) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(ord.id);

    if ((!ord.items || ord.items.length === 0) && !fallbackItemsByOrder[ord.id]) {
      setLoadingDetailId(ord.id);
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(ord.id)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const detail = await res.json();
          if (Array.isArray(detail?.items)) {
            setFallbackItemsByOrder((prev) => ({ ...prev, [ord.id]: detail.items }));
          }
        }
      } catch {
        // Non-blocking
      } finally {
        setLoadingDetailId(null);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="py-24 flex items-center justify-center bg-[#FFFCF7] min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          <span className="text-xs text-[#573B2C] font-mono">Loading your orders...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 sm:py-28 flex-1 flex items-center justify-center bg-[#FFFCF7] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-10 shadow-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center mx-auto text-[#173D2B]">
            <Lock className="w-8 h-8 text-[#315640]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-[#173D2B]">Sign in to view My Orders</h1>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Your active orders, delivery updates, and itemized receipts are private to your Jhe&apos;s Cafe&apos; member account.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login?redirect=/my-orders"
              prefetch={false}
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-16 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#573B2C]">
          <Link href="/" className="hover:text-[#173D2B] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#173D2B]">My Orders</span>
        </nav>

        {/* Page Header + In-App Notifications Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DACB] pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#315640]">
              <Package className="w-4 h-4 text-[#C9AE8B]" />
              <span>Order &amp; Delivery Tracking</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#173D2B] tracking-tight">
              My Orders
            </h1>
            <p className="text-xs sm:text-sm text-[#573B2C]">
              Track barista preparation, delivery status milestones, driver details, and payment confirmation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#E5DACB] bg-white hover:bg-[#F5F0E7] text-[#173D2B] text-xs font-semibold transition-all cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#315640]" />
              <span>Notifications</span>
              {unreadNotifCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                  {unreadNotifCount}
                </span>
              )}
            </button>
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold transition-all shadow-xs"
            >
              <Coffee className="w-3.5 h-3.5 text-[#C9AE8B]" />
              <span>Order Again</span>
            </Link>
            <button
              type="button"
              onClick={() => void loadOrdersAndNotifications()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#E5DACB] bg-white hover:bg-[#F5F0E7] text-[#173D2B] text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* In-App Notifications Drawer Panel */}
        {showNotifications && (
          <section className="rounded-3xl border border-[#E5DACB] bg-white p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-2 border-b border-[#F5F0E7] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#315640]" />
                <h2 className="font-serif text-lg font-bold text-[#173D2B]">
                  Order &amp; Delivery Notifications
                </h2>
              </div>
              {unreadNotifCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs font-semibold text-[#315640] hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-[#573B2C]">
                No notifications yet. Status updates for driver assignment, delivery milestones, and COD confirmations will appear here.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl border text-xs ${
                      n.is_read
                        ? "bg-[#FFFCF7] border-[#E5DACB]/70 text-[#573B2C]"
                        : "bg-[#F5F0E7] border-[#C9AE8B] text-[#173D2B]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{n.title}</p>
                      <span className="text-[10px] font-mono opacity-75">
                        {new Date(n.created_at).toLocaleString("en-PH", {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "active" as const, label: "Active Orders", count: activeOrders.length },
            { id: "history" as const, label: "Order History", count: pastOrders.length },
            { id: "all" as const, label: "All Orders", count: orders.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#173D2B] text-white shadow-xs"
                    : "bg-white border border-[#E5DACB] text-[#573B2C] hover:text-[#173D2B] hover:bg-[#F5F0E7]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? "bg-[#315640] text-[#C9AE8B]" : "bg-[#F5F0E7] text-[#573B2C]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="h-36 rounded-3xl border border-[#E5DACB] bg-white p-6 animate-pulse"
              />
            ))}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-12 text-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center mx-auto text-[#C9AE8B]">
              <Coffee className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                {activeTab === "active"
                  ? "No active orders right now"
                  : "No past orders recorded yet"}
              </h2>
              <p className="text-xs text-[#573B2C] max-w-md mx-auto leading-relaxed">
                {activeTab === "active" && pastOrders.length > 0
                  ? "All of your previous orders have been fulfilled. Switch to Order History to view past receipts."
                  : "Explore our handcrafted espresso drinks, slow-steeped cold brews, and freshly baked pastries to place an order."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all"
              >
                <span>Explore Menu</span>
                <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
              </Link>
              {activeTab === "active" && pastOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <span>View Order History ({pastOrders.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedOrders.map((ord) => {
              const statusClean = String(ord.status || "pending").trim().toLowerCase();
              const payStatusClean = String(ord.payment_status || "pending").trim().toLowerCase();
              const dlv = ord.delivery || null;
              const isDelivery =
                String(ord.dining_option || "").toLowerCase().trim() === "delivery" && Boolean(dlv);
              const isActiveOrd = isDelivery && dlv
                ? !["DELIVERED", "CANCELLED", "RETURNED"].includes(dlv.delivery_status)
                : ACTIVE_STATUSES.has(statusClean);
              const isExpanded =
                expandedOrderId === ord.id ||
                (isActiveOrd && expandedOrderId === null && displayedOrders.length <= 2);
              const items: OrderItemData[] =
                ord.items && ord.items.length > 0 ? ord.items : fallbackItemsByOrder[ord.id] || [];
              const stepIdx = getTrackStepIndex(statusClean);
              const dlvStepIdx = dlv ? getDeliveryStepIndex(dlv.delivery_status) : 0;
              const isDlvException = Boolean(
                dlv && ["FAILED_DELIVERY", "CANCELLED", "RETURNED"].includes(dlv.delivery_status)
              );

              return (
                <article
                  key={ord.id}
                  className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs hover:border-[#C9AE8B] transition-all"
                >
                  {/* Order Top Summary */}
                  <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-[#173D2B]">
                          #{ord.order_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getOrderStatusBadge(
                            statusClean
                          )}`}
                        >
                          Order: {statusClean}
                        </span>
                        {isDelivery && dlv && (
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getDeliveryStatusBadge(
                              dlv.delivery_status
                            )}`}
                          >
                            Delivery: {formatDeliveryStatusLabel(dlv.delivery_status)}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getPaymentStatusBadge(
                            payStatusClean
                          )}`}
                        >
                          Payment: {payStatusClean}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#573B2C]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#315640]" />
                          <span>
                            {ord.created_at
                              ? new Date(ord.created_at).toLocaleString("en-PH", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recent"}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {isDelivery ? (
                            <Truck className="w-3.5 h-3.5 text-[#315640]" />
                          ) : String(ord.dining_option || "").toLowerCase().includes("dine") ? (
                            <Utensils className="w-3.5 h-3.5 text-[#315640]" />
                          ) : (
                            <ShoppingBag className="w-3.5 h-3.5 text-[#315640]" />
                          )}
                          <span>{ord.dining_option || "Takeaway"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {["cash", "cod"].includes(String(ord.payment_method || "").toLowerCase()) ? (
                            <Banknote className="w-3.5 h-3.5 text-[#315640]" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-[#315640]" />
                          )}
                          <span>{formatMethodLabel(ord.payment_method)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-[#F5F0E7]">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-mono uppercase text-[#573B2C] block">
                          Order Total
                        </span>
                        <span className="font-serif text-xl font-bold text-[#173D2B]">
                          ₱{Number(ord.total_amount || 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void toggleExpandOrder(ord)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5DACB] bg-[#FFFCF7] hover:bg-[#F5F0E7] text-xs font-semibold text-[#173D2B] transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Details" : "Order Details"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* DELIVERY STATUS TIMELINE & TRACKING PANEL (Status-Milestone Based — No Fake GPS) */}
                  {isDelivery && dlv ? (
                    <div className="px-5 sm:px-6 py-4 bg-[#F5F0E7]/60 border-t border-[#E5DACB] space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#315640] font-bold inline-flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Delivery Status Milestones · ETA: {dlv.estimated_delivery_time}</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#173D2B] text-[#C9AE8B]">
                          Handoff Code: {dlv.confirmation_code}
                        </span>
                      </div>

                      {isDlvException ? (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
                          <div>
                            <p className="font-bold">
                              Delivery Status: {formatDeliveryStatusLabel(dlv.delivery_status)}
                            </p>
                            {dlv.failure_reason && <p className="mt-0.5">{dlv.failure_reason}</p>}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                          {CORE_DELIVERY_TIMELINE.map((step, idx) => {
                            const reached = idx <= dlvStepIdx;
                            return (
                              <div key={step} className="space-y-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    reached ? "bg-[#173D2B]" : "bg-[#E5DACB]"
                                  }`}
                                />
                                <span
                                  className={`text-[10px] font-semibold block leading-tight ${
                                    reached ? "text-[#173D2B]" : "text-[#573B2C]/60"
                                  }`}
                                >
                                  {formatDeliveryStatusLabel(step)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Assigned Driver & Address Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-white border border-[#E5DACB] space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                            Delivery Address
                          </p>
                          <p className="font-semibold text-[#173D2B]">{dlv.recipient_name}</p>
                          <p className="text-[#573B2C] flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#315640] shrink-0 mt-0.5" />
                            <span>{dlv.full_address}</span>
                          </p>
                          {dlv.delivery_instructions && (
                            <p className="text-[11px] italic text-[#573B2C]">
                              Note: &ldquo;{dlv.delivery_instructions}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white border border-[#E5DACB] space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                            Assigned Driver
                          </p>
                          {dlv.driver_name ? (
                            <>
                              <p className="font-semibold text-[#173D2B]">{dlv.driver_name}</p>
                              {dlv.driver_vehicle && (
                                <p className="text-[11px] text-[#573B2C]">{dlv.driver_vehicle}</p>
                              )}
                              {dlv.driver_phone && (
                                <a
                                  href={`tel:${dlv.driver_phone}`}
                                  className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-[11px] font-semibold"
                                >
                                  <Phone className="w-3 h-3 text-[#C9AE8B]" />
                                  <span>Call Driver ({dlv.driver_phone})</span>
                                </a>
                              )}
                            </>
                          ) : (
                            <p className="text-[#573B2C]">
                              Awaiting café dispatch driver assignment. You will be notified as soon as a rider is assigned.
                            </p>
                          )}
                        </div>
                      </div>

                      {dlv.proof_note && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Proof of Delivery Recorded</p>
                            <p>{dlv.proof_note}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Dine-in / Takeaway Barista Prep Bar */
                    isActiveOrd &&
                    statusClean !== "cancelled" && (
                      <div className="px-5 sm:px-6 py-4 bg-[#F5F0E7]/50 border-t border-[#E5DACB]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#315640] font-bold">
                            Live Preparation Progress
                          </span>
                          <Link
                            href={`/track-order?code=${encodeURIComponent(ord.order_number)}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#173D2B] hover:underline"
                          >
                            <span>Full Live Tracker</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {TRACK_STEPS.map((label, idx) => {
                            const reached = idx <= stepIdx;
                            return (
                              <div key={label} className="space-y-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    reached ? "bg-[#173D2B]" : "bg-[#E5DACB]"
                                  }`}
                                />
                                <span
                                  className={`text-[10px] font-semibold block ${
                                    reached ? "text-[#173D2B]" : "text-[#573B2C]/60"
                                  }`}
                                >
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}

                  {/* Expanded Order Details, Product List & Delivery Messaging/Issue Reporting */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 py-5 bg-[#FFFCF7] border-t border-[#E5DACB] space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#573B2C]">
                          Ordered Products
                        </h3>
                        {ord.delivery_fee ? (
                          <span className="text-[11px] font-mono text-[#315640]">
                            Includes ₱{Number(ord.delivery_fee).toFixed(2)} delivery fee
                          </span>
                        ) : null}
                      </div>

                      {loadingDetailId === ord.id ? (
                        <p className="text-xs text-[#573B2C] font-mono">Loading items...</p>
                      ) : items.length > 0 ? (
                        <div className="divide-y divide-[#E5DACB]/70 rounded-2xl border border-[#E5DACB] bg-white px-4">
                          {items.map((item, idx) => {
                            const specs = [
                              item.size,
                              item.temperature,
                              item.milk_type || item.milk,
                              item.sweetness !== undefined ? `${item.sweetness}% sweet` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ");
                            return (
                              <div
                                key={item.id || `${ord.id}-it-${idx}`}
                                className="py-3.5 flex items-center gap-3.5 text-xs"
                              >
                                <img
                                  src={getProductImage({
                                    name: item.product_name,
                                    id: item.product_id,
                                  })}
                                  alt={item.product_name}
                                  className="w-12 h-12 rounded-xl object-cover border border-[#E5DACB] shrink-0 bg-[#173D2B]"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-serif text-sm font-bold text-[#173D2B] truncate">
                                    {item.product_name}
                                  </p>
                                  {specs && (
                                    <p className="text-[11px] text-[#573B2C] truncate">{specs}</p>
                                  )}
                                  <p className="text-[11px] font-mono text-[#315640]">
                                    Qty {item.quantity} × ₱{Number(item.unit_price || 0).toFixed(2)}
                                  </p>
                                </div>
                                <span className="font-mono text-sm font-bold text-[#173D2B] shrink-0">
                                  ₱
                                  {Number(
                                    item.subtotal ??
                                      (Number(item.unit_price) || 0) * (Number(item.quantity) || 1)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[#573B2C] italic">
                          Itemized line records were not attached to this legacy order.
                        </p>
                      )}

                      {/* Restricted Delivery Communication & Issue Reporting */}
                      {isDelivery && dlv && (
                        <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 space-y-3 text-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="font-bold text-[#173D2B]">
                              Delivery Support &amp; Driver Messages (Private to You, Assigned Driver &amp; Café)
                            </p>
                            <div className="flex gap-1">
                              {(["message", "issue"] as const).map((k) => (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() =>
                                    setMsgKindByDlv((prev) => ({ ...prev, [dlv.id]: k }))
                                  }
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer ${
                                    (msgKindByDlv[dlv.id] || "message") === k
                                      ? k === "issue"
                                        ? "bg-rose-700 text-white"
                                        : "bg-[#173D2B] text-white"
                                      : "bg-[#F5F0E7] text-[#573B2C]"
                                  }`}
                                >
                                  {k === "issue" ? "Report Issue" : "Message"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {dlv.messages && dlv.messages.length > 0 && (
                            <div className="space-y-1.5 bg-[#FFFCF7] border border-[#E5DACB]/70 rounded-xl p-3 max-h-40 overflow-y-auto">
                              {dlv.messages.map((m) => (
                                <div key={m.id} className="text-[11px]">
                                  <span className="font-bold text-[#173D2B] capitalize">
                                    {m.sender_role === "customer" ? "You" : `${m.sender_role} (${m.sender_name})`}:
                                  </span>{" "}
                                  <span className={m.kind === "issue" ? "text-rose-900 font-medium" : "text-[#573B2C]"}>
                                    {m.kind === "issue" ? `[Issue] ${m.text}` : m.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {msgSuccessId === dlv.id && (
                            <p className="text-[11px] text-emerald-800 font-medium">
                              Submitted! Your assigned driver and café dispatch can see this update.
                            </p>
                          )}

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={msgTextByDlv[dlv.id] || ""}
                              onChange={(e) =>
                                setMsgTextByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))
                              }
                              placeholder={
                                (msgKindByDlv[dlv.id] || "message") === "issue"
                                  ? "Describe a delivery issue (e.g. wrong item, delayed rider, address clarification)..."
                                  : "Send a note to your assigned driver or café dispatch..."
                              }
                              className="flex-1 rounded-full border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2 text-xs text-[#173D2B]"
                            />
                            <button
                              type="button"
                              disabled={sendingMsgId === dlv.id || !(msgTextByDlv[dlv.id] || "").trim()}
                              onClick={() => void handleSendCustomerDeliveryMessage(dlv.id)}
                              className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>
                                {(msgKindByDlv[dlv.id] || "message") === "issue" ? "Report" : "Send"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {ord.special_notes && (
                        <div className="p-3 rounded-xl bg-white border border-[#E5DACB] text-xs text-[#573B2C]">
                          <span className="font-semibold text-[#173D2B]">Notes &amp; Fulfillment: </span>
                          <span>{ord.special_notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
