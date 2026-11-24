"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck,
  MapPin,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Plus,
  Trash2,
  Send,
  Banknote,
  ShieldCheck,
  XCircle,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import {
  formatDeliveryStatusLabel,
  type DeliveryRecord,
  type DeliveryStatus,
  type DeliveryZone,
  type DriverAvailabilityStatus,
  type DriverProfile,
} from "@/lib/deliveryTypes";

interface EnrichedAdminDelivery extends DeliveryRecord {
  order_status?: string;
  order_total?: number;
  payment_status?: string;
  payment_id?: string | null;
  payment_ref?: string | null;
}

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING_ASSIGNMENT", label: "Pending Assignment" },
  { value: "DRIVER_ASSIGNED", label: "Driver Assigned" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "PICKED_UP", label: "Picked Up" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED_DELIVERY", label: "Failed Delivery" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

function getDeliveryBadgeClass(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "OUT_FOR_DELIVERY":
      return "bg-teal-100 text-teal-900 border-teal-300";
    case "PICKED_UP":
    case "READY_FOR_PICKUP":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "DRIVER_ASSIGNED":
      return "bg-indigo-100 text-indigo-900 border-indigo-300";
    case "FAILED_DELIVERY":
    case "CANCELLED":
    case "RETURNED":
      return "bg-rose-100 text-rose-900 border-rose-300";
    default:
      return "bg-amber-100 text-amber-900 border-amber-300";
  }
}

export default function AdminDeliveriesPage() {
  const [activeTab, setActiveTab] = useState<"dispatch" | "zones" | "drivers">("dispatch");
  const [deliveries, setDeliveries] = useState<EnrichedAdminDelivery[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dispatch filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Per-delivery inline inputs
  const [assignDriverByDlv, setAssignDriverByDlv] = useState<Record<string, string>>({});
  const [etaByDlv, setEtaByDlv] = useState<Record<string, string>>({});
  const [failReasonByDlv, setFailReasonByDlv] = useState<Record<string, string>>({});
  const [msgByDlv, setMsgByDlv] = useState<Record<string, string>>({});

  // New Zone Form
  const [zoneCity, setZoneCity] = useState("");
  const [zoneBarangay, setZoneBarangay] = useState("");
  const [zoneFee, setZoneFee] = useState("");
  const [zoneMinOrder, setZoneMinOrder] = useState("0");
  const [zoneEta, setZoneEta] = useState("30–45 mins");
  const [creatingZone, setCreatingZone] = useState(false);

  // New Driver Form
  const [drvName, setDrvName] = useState("");
  const [drvEmail, setDrvEmail] = useState("");
  const [drvPhone, setDrvPhone] = useState("");
  const [drvVehicle, setDrvVehicle] = useState("Motorcycle");
  const [drvPlate, setDrvPlate] = useState("");
  const [drvStaffId, setDrvStaffId] = useState("");
  const [creatingDriver, setCreatingDriver] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (dateFrom) qs.set("date_from", dateFrom);
      if (dateTo) qs.set("date_to", dateTo);

      const [dlvRes, zoneRes, drvRes] = await Promise.all([
        fetch(`${API_BASE_URL}/deliveries?${qs.toString()}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/delivery/zones?include_inactive=true`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/drivers`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (dlvRes.ok) {
        const j = await dlvRes.json();
        setDeliveries(Array.isArray(j?.deliveries) ? j.deliveries : []);
      }
      if (zoneRes.ok) {
        const j = await zoneRes.json();
        setZones(Array.isArray(j?.zones) ? j.zones : []);
      }
      if (drvRes.ok) {
        const j = await drvRes.json();
        setDrivers(Array.isArray(j?.drivers) ? j.drivers : []);
      }
    } catch {
      setFeedback({ type: "error", text: "Unable to load delivery management data." });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const stats = useMemo(() => {
    const pending = deliveries.filter((d) => d.delivery_status === "PENDING_ASSIGNMENT").length;
    const inTransit = deliveries.filter((d) =>
      ["DRIVER_ASSIGNED", "READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(
        d.delivery_status
      )
    ).length;
    const delivered = deliveries.filter((d) => d.delivery_status === "DELIVERED").length;
    const issues = deliveries.filter((d) =>
      ["FAILED_DELIVERY", "RETURNED", "CANCELLED"].includes(d.delivery_status)
    ).length;
    const activeZones = zones.filter((z) => z.is_active).length;
    const availableDrivers = drivers.filter(
      (d) => d.is_active && d.availability_status === "available"
    ).length;
    return { pending, inTransit, delivered, issues, activeZones, availableDrivers };
  }, [deliveries, zones, drivers]);

  const handleAssignDriver = async (dlv: EnrichedAdminDelivery) => {
    const driverId = assignDriverByDlv[dlv.id] || dlv.driver_id || "";
    if (!driverId) {
      setFeedback({ type: "error", text: "Select an active driver before assigning." });
      return;
    }
    setBusyId(dlv.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/deliveries/${dlv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "assign_driver",
          driver_id: driverId,
          estimated_delivery_time: etaByDlv[dlv.id] || dlv.estimated_delivery_time,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || "Driver assignment failed.");
      setFeedback({
        type: "success",
        text: `Order #${dlv.order_number} assigned to ${json.driver_name}. Customer notified.`,
      });
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Assignment error." });
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateDeliveryStatus = async (
    dlv: EnrichedAdminDelivery,
    nextStatus: DeliveryStatus,
    reason?: string
  ) => {
    setBusyId(dlv.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/deliveries/${dlv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update_status",
          delivery_status: nextStatus,
          reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || "Status update rejected.");
      setFeedback({
        type: "success",
        text: `Order #${dlv.order_number} delivery status updated to ${formatDeliveryStatusLabel(nextStatus)}.`,
      });
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Status update error." });
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateEta = async (dlv: EnrichedAdminDelivery) => {
    const nextEta = (etaByDlv[dlv.id] || "").trim();
    if (nextEta.length < 3) return;
    setBusyId(dlv.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/deliveries/${dlv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "update_eta", estimated_delivery_time: nextEta }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || "ETA update failed.");
      setFeedback({ type: "success", text: `Updated ETA for #${dlv.order_number} to ${nextEta}.` });
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "ETA error." });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCodPayment = async (dlv: EnrichedAdminDelivery) => {
    if (!dlv.payment_id) {
      setFeedback({ type: "error", text: "No linked COD payment record found for this order." });
      return;
    }
    setBusyId(dlv.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/${dlv.payment_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "confirm_cod",
          receipt_reference: `COD-${dlv.order_number}`,
          note: `COD remittance confirmed after delivery completion by ${dlv.driver_name || "assigned rider"}.`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || "COD confirmation rejected.");
      setFeedback({
        type: "success",
        text: `COD payment for #${dlv.order_number} verified and marked PAID.`,
      });
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "COD confirmation error." });
    } finally {
      setBusyId(null);
    }
  };

  const handleSendAdminMessage = async (dlv: EnrichedAdminDelivery) => {
    const text = (msgByDlv[dlv.id] || "").trim();
    if (text.length < 2) return;
    setBusyId(dlv.id);
    try {
      const res = await fetch(`${API_BASE_URL}/deliveries/${dlv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind: "message", text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to send message.");
      }
      setMsgByDlv((prev) => ({ ...prev, [dlv.id]: "" }));
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Message error." });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingZone(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city: zoneCity.trim(),
          barangay: zoneBarangay.trim(),
          delivery_fee: Number(zoneFee),
          min_order_amount: Number(zoneMinOrder || 0),
          estimated_minutes: zoneEta.trim() || "30–45 mins",
          is_active: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || "Failed to create delivery zone.");
      setZoneCity("");
      setZoneBarangay("");
      setZoneFee("");
      setZoneMinOrder("0");
      setFeedback({ type: "success", text: `Configured zone ${json.area_label} (₱${json.delivery_fee}).` });
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Zone creation failed." });
    } finally {
      setCreatingZone(false);
    }
  };

  const handleToggleZone = async (zone: DeliveryZone) => {
    setBusyId(zone.id);
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/zones/${zone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !zone.is_active }),
      });
      if (!res.ok) throw new Error("Could not update zone status.");
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Error toggling zone." });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteZone = async (zone: DeliveryZone) => {
    setBusyId(zone.id);
    try {
      const res = await fetch(`${API_BASE_URL}/delivery/zones/${zone.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove zone.");
      setFeedback({ type: "success", text: `Removed zone ${zone.area_label}.` });
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Delete failed." });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDriver(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: drvName.trim(),
          email: drvEmail.trim().toLowerCase(),
          phone: drvPhone.trim(),
          vehicle_type: drvVehicle.trim(),
          plate_number: drvPlate.trim(),
          ...(drvStaffId.trim() ? { staff_id: drvStaffId.trim().toUpperCase() } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || "Failed to register driver.");
      setDrvName("");
      setDrvEmail("");
      setDrvPhone("");
      setDrvPlate("");
      setDrvStaffId("");
      setFeedback({
        type: "success",
        text: `Driver ${json.full_name} registered! Driver Portal login: ${json.email} / ${json.staff_id}`,
      });
      await loadAll();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Driver creation failed." });
    } finally {
      setCreatingDriver(false);
    }
  };

  const handleDriverAvailability = async (
    driver: DriverProfile,
    nextAvail: DriverAvailabilityStatus
  ) => {
    setBusyId(driver.id);
    try {
      await fetch(`${API_BASE_URL}/drivers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: driver.id, availability_status: nextAvail }),
      });
      await loadAll();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#315640]">
            Logistics &amp; Dispatch Center
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#173D2B]">Delivery Management</h1>
          <p className="text-xs text-[#573B2C] mt-1">
            Configure serviceable delivery zones, assign drivers, track dispatch milestones, and verify COD remittances separately.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/driver"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#173D2B] hover:text-white text-xs font-semibold transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Driver Portal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Pending Assign", value: stats.pending, tone: "text-amber-900 bg-amber-50 border-amber-200" },
          { label: "In Transit", value: stats.inTransit, tone: "text-sky-900 bg-sky-50 border-sky-200" },
          { label: "Delivered", value: stats.delivered, tone: "text-emerald-900 bg-emerald-50 border-emerald-200" },
          { label: "Failed / Cancelled", value: stats.issues, tone: "text-rose-900 bg-rose-50 border-rose-200" },
          { label: "Active Zones", value: stats.activeZones, tone: "text-[#173D2B] bg-white border-[#E5DACB]" },
          { label: "Avail. Drivers", value: stats.availableDrivers, tone: "text-[#173D2B] bg-white border-[#E5DACB]" },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-4 shadow-2xs ${card.tone}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{card.label}</p>
            <p className="font-serif text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span className="inline-flex items-center gap-2 font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Module Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "dispatch" as const, label: `Delivery Dispatch (${deliveries.length})`, icon: Truck },
          { id: "zones" as const, label: `Delivery Zones (${zones.length})`, icon: MapPin },
          { id: "drivers" as const, label: `Drivers Roster (${drivers.length})`, icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? "bg-[#173D2B] text-white shadow-xs"
                  : "bg-white border border-[#E5DACB] text-[#573B2C] hover:text-[#173D2B]"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-[#C9AE8B]" : "text-[#315640]"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ====================================================================
          TAB 1: DELIVERY DISPATCH & HISTORY
         ==================================================================== */}
      {activeTab === "dispatch" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex flex-wrap items-end gap-3 text-xs">
            <div className="flex-1 min-w-[180px]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block mb-1">
                Delivery Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3 py-2 text-xs text-[#173D2B]"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3 py-2 text-xs text-[#173D2B]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3 py-2 text-xs text-[#173D2B]"
              />
            </div>
          </div>

          {loading ? (
            <div className="h-44 rounded-3xl border border-[#E5DACB] bg-white animate-pulse" />
          ) : deliveries.length === 0 ? (
            <div className="rounded-3xl border border-[#E5DACB] bg-white p-12 text-center space-y-2">
              <Truck className="w-9 h-9 text-[#C9AE8B] mx-auto" />
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">No delivery orders match</h2>
              <p className="text-xs text-[#573B2C]">
                Delivery orders placed on Checkout appear here with live dispatch status and driver assignment controls.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveries.map((dlv) => {
                const isTerminal = ["DELIVERED", "CANCELLED", "RETURNED"].includes(dlv.delivery_status);
                const isCod = dlv.payment_method === "cod";
                const isPaid = dlv.payment_status === "completed" || dlv.payment_status === "paid";

                return (
                  <div
                    key={dlv.id}
                    className="rounded-3xl border border-[#E5DACB] bg-white p-5 sm:p-6 shadow-2xs space-y-4"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#F5F0E7] pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-[#173D2B]">
                            #{dlv.order_number}
                          </span>
                          <span className="text-[10px] font-mono text-[#573B2C] bg-[#F5F0E7] px-2 py-0.5 rounded-full">
                            {dlv.delivery_ref}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getDeliveryBadgeClass(
                              dlv.delivery_status
                            )}`}
                          >
                            Delivery: {formatDeliveryStatusLabel(dlv.delivery_status)}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-stone-100 text-stone-800 border-stone-300">
                            Order: {dlv.order_status || "pending"}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                : "bg-amber-50 text-amber-900 border-amber-200"
                            }`}
                          >
                            Payment ({dlv.payment_method.toUpperCase()}): {dlv.payment_status}
                          </span>
                        </div>

                        <div className="text-xs text-[#573B2C] space-y-1">
                          <p>
                            <strong className="text-[#173D2B]">{dlv.recipient_name}</strong> ·{" "}
                            <a
                              href={`tel:${dlv.contact_number}`}
                              className="font-mono text-[#315640] hover:underline inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {dlv.contact_number}
                            </a>{" "}
                            · <span className="font-mono">{dlv.customer_email}</span>
                          </p>
                          <p className="inline-flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#315640] shrink-0 mt-0.5" />
                            <span>{dlv.full_address}</span>
                          </p>
                          {dlv.delivery_instructions && (
                            <p className="italic text-[#173D2B]">
                              Instructions: &ldquo;{dlv.delivery_instructions}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left lg:text-right space-y-1 shrink-0">
                        <p className="font-serif text-2xl font-bold text-[#173D2B]">
                          ₱{Number(dlv.order_total || dlv.cod_amount_due || 0).toFixed(2)}
                        </p>
                        <p className="text-[11px] font-mono text-[#573B2C]">
                          Delivery Fee: ₱{dlv.delivery_fee.toFixed(2)} · ETA: {dlv.estimated_delivery_time}
                        </p>
                        <p className="text-[10px] font-mono text-[#315640]">
                          Handoff Code: <strong>{dlv.confirmation_code}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Driver Assignment & ETA Bar */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs items-end bg-[#FFFCF7] p-4 rounded-2xl border border-[#E5DACB]">
                      <div className="lg:col-span-5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block mb-1">
                          Assigned Driver {dlv.driver_name ? `(Current: ${dlv.driver_name})` : "(Unassigned)"}
                        </label>
                        <select
                          disabled={isTerminal || busyId === dlv.id}
                          value={assignDriverByDlv[dlv.id] ?? dlv.driver_id ?? ""}
                          onChange={(e) =>
                            setAssignDriverByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))
                          }
                          className="w-full rounded-xl border border-[#E5DACB] bg-white px-3 py-2 text-xs text-[#173D2B]"
                        >
                          <option value="">— Select active driver —</option>
                          {drivers
                            .filter((d) => d.is_active)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.full_name} ({d.staff_id}) · {d.availability_status} · {d.active_deliveries_count || 0} active
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="lg:col-span-4">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] block mb-1">
                          Estimated Delivery Time
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={etaByDlv[dlv.id] ?? dlv.estimated_delivery_time}
                            onChange={(e) =>
                              setEtaByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))
                            }
                            className="flex-1 rounded-xl border border-[#E5DACB] bg-white px-3 py-2 text-xs text-[#173D2B]"
                          />
                          <button
                            type="button"
                            disabled={busyId === dlv.id}
                            onClick={() => void handleUpdateEta(dlv)}
                            className="px-3 py-2 rounded-xl border border-[#E5DACB] bg-white hover:bg-[#F5F0E7] text-[11px] font-semibold text-[#173D2B] cursor-pointer"
                          >
                            Save ETA
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-3 flex gap-2">
                        <button
                          type="button"
                          disabled={isTerminal || busyId === dlv.id}
                          onClick={() => void handleAssignDriver(dlv)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#173D2B] hover:bg-[#315640] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                        >
                          {dlv.driver_id ? "Reassign Driver" : "Assign Driver"}
                        </button>
                      </div>
                    </div>

                    {/* Dispatch Progress Actions & Separate COD Confirmation */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {(dlv.delivery_status === "PENDING_ASSIGNMENT" ||
                          dlv.delivery_status === "DRIVER_ASSIGNED") && (
                          <button
                            type="button"
                            disabled={busyId === dlv.id}
                            onClick={() => void handleUpdateDeliveryStatus(dlv, "READY_FOR_PICKUP")}
                            className="px-3.5 py-2 rounded-full bg-sky-100 hover:bg-sky-800 hover:text-white text-sky-950 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Mark Ready for Pickup
                          </button>
                        )}
                        {!isTerminal && (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Failure reason..."
                              value={failReasonByDlv[dlv.id] || ""}
                              onChange={(e) =>
                                setFailReasonByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))
                              }
                              className="rounded-full border border-rose-200 px-3 py-1.5 text-xs text-[#173D2B] w-44"
                            />
                            <button
                              type="button"
                              disabled={busyId === dlv.id || !(failReasonByDlv[dlv.id] || "").trim()}
                              onClick={() =>
                                void handleUpdateDeliveryStatus(
                                  dlv,
                                  "FAILED_DELIVERY",
                                  failReasonByDlv[dlv.id]
                                )
                              }
                              className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-700 hover:text-white text-rose-900 border border-rose-200 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                            >
                              Record Failed Attempt
                            </button>
                          </div>
                        )}
                        {dlv.delivery_status === "FAILED_DELIVERY" && (
                          <button
                            type="button"
                            disabled={busyId === dlv.id}
                            onClick={() => void handleUpdateDeliveryStatus(dlv, "RETURNED", "Returned to store after failed delivery.")}
                            className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-900 text-xs font-semibold cursor-pointer"
                          >
                            Mark Returned
                          </button>
                        )}
                        {!isTerminal && (
                          <button
                            type="button"
                            disabled={busyId === dlv.id}
                            onClick={() => void handleUpdateDeliveryStatus(dlv, "CANCELLED", "Cancelled by dispatch admin.")}
                            className="px-3 py-2 rounded-full text-xs font-semibold text-rose-800 hover:bg-rose-50 cursor-pointer inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Delivery</span>
                          </button>
                        )}
                      </div>

                      {/* Separate Authorized COD Payment Confirmation */}
                      {isCod && !isPaid && (
                        <button
                          type="button"
                          disabled={busyId === dlv.id || dlv.delivery_status !== "DELIVERED"}
                          onClick={() => void handleConfirmCodPayment(dlv)}
                          title={
                            dlv.delivery_status !== "DELIVERED"
                              ? "Delivery must be completed before confirming COD payment."
                              : "Confirm driver remitted COD cash and mark PAID"
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>
                            {dlv.delivery_status === "DELIVERED"
                              ? `Confirm COD Remitted (₱${Number(dlv.cash_collected_amount ?? dlv.cod_amount_due).toFixed(2)})`
                              : "COD Confirmation Locked Until Delivered"}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Proof of Delivery / Failure / Messages Summary */}
                    {(dlv.proof_note || dlv.failure_reason || dlv.messages.length > 0) && (
                      <div className="pt-3 border-t border-[#F5F0E7] space-y-2 text-xs">
                        {dlv.proof_note && (
                          <p className="text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                            <strong>Proof of Delivery:</strong> {dlv.proof_note}
                            {dlv.cash_collected_amount !== null && (
                              <> · Driver recorded COD cash collected: ₱{dlv.cash_collected_amount.toFixed(2)}</>
                            )}
                          </p>
                        )}
                        {dlv.failure_reason && (
                          <p className="text-rose-900 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                            <strong>Failed Attempt ({dlv.failed_attempts}):</strong> {dlv.failure_reason}
                          </p>
                        )}
                        {dlv.messages.length > 0 && (
                          <div className="space-y-1 bg-[#F5F0E7]/60 p-3 rounded-xl">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                              Dispatch Communication &amp; Issue Log
                            </p>
                            {dlv.messages.slice(-4).map((m) => (
                              <p key={m.id} className="text-[11px] text-[#173D2B]">
                                <strong className="capitalize">{m.sender_role} ({m.sender_name}):</strong>{" "}
                                {m.kind === "issue" ? `[ISSUE] ${m.text}` : m.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Admin Reply */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={msgByDlv[dlv.id] || ""}
                        onChange={(e) => setMsgByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))}
                        placeholder="Send status note to customer & assigned driver..."
                        className="flex-1 rounded-full border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2 text-xs text-[#173D2B]"
                      />
                      <button
                        type="button"
                        disabled={busyId === dlv.id || !(msgByDlv[dlv.id] || "").trim()}
                        onClick={() => void handleSendAdminMessage(dlv)}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 2: DELIVERY ZONES CONFIGURATION
         ==================================================================== */}
      {activeTab === "zones" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateZone}
            className="lg:col-span-5 rounded-3xl border border-[#E5DACB] bg-white p-6 space-y-4 shadow-2xs text-xs"
          >
            <div>
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">Add Serviceable Zone</h2>
              <p className="text-[#573B2C] mt-0.5">
                Checkout validates delivery addresses strictly against active zones configured here.
              </p>
            </div>

            <div>
              <label className="font-semibold text-[#173D2B] block mb-1">City / Municipality *</label>
              <input
                type="text"
                required
                value={zoneCity}
                onChange={(e) => setZoneCity(e.target.value)}
                placeholder="e.g. Tagaytay City"
                className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 text-[#173D2B]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#173D2B] block mb-1">Barangay / Area *</label>
              <input
                type="text"
                required
                value={zoneBarangay}
                onChange={(e) => setZoneBarangay(e.target.value)}
                placeholder="e.g. Maharlika East"
                className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 text-[#173D2B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Delivery Fee (PHP) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={zoneFee}
                  onChange={(e) => setZoneFee(e.target.value)}
                  placeholder="60"
                  className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 font-mono text-[#173D2B]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Min. Order (PHP)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={zoneMinOrder}
                  onChange={(e) => setZoneMinOrder(e.target.value)}
                  placeholder="200"
                  className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 font-mono text-[#173D2B]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#173D2B] block mb-1">Estimated Delivery Time *</label>
              <input
                type="text"
                required
                value={zoneEta}
                onChange={(e) => setZoneEta(e.target.value)}
                placeholder="e.g. 25–40 mins"
                className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 text-[#173D2B]"
              />
            </div>

            <button
              type="submit"
              disabled={creatingZone}
              className="w-full py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-[#C9AE8B]" />
              <span>{creatingZone ? "Saving Zone..." : "Add Delivery Zone"}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {zones.length === 0 ? (
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-10 text-center text-xs text-[#573B2C]">
                No delivery zones configured yet. Add your first serviceable barangay on the left.
              </div>
            ) : (
              zones.map((z) => (
                <div
                  key={z.id}
                  className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-base font-bold text-[#173D2B]">
                        {z.area_label}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          z.is_active
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {z.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-[#573B2C] font-mono">
                      Fee: ₱{z.delivery_fee.toFixed(2)} · Min Order: ₱{z.min_order_amount.toFixed(2)} · ETA: {z.estimated_minutes}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === z.id}
                      onClick={() => void handleToggleZone(z)}
                      className="px-3.5 py-2 rounded-full border border-[#E5DACB] hover:bg-[#F5F0E7] text-[#173D2B] font-semibold cursor-pointer"
                    >
                      {z.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === z.id}
                      onClick={() => void handleDeleteZone(z)}
                      className="p-2 rounded-full text-rose-700 hover:bg-rose-50 cursor-pointer"
                      aria-label={`Delete ${z.area_label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: DRIVERS ROSTER & AVAILABILITY
         ==================================================================== */}
      {activeTab === "drivers" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateDriver}
            className="lg:col-span-5 rounded-3xl border border-[#E5DACB] bg-white p-6 space-y-4 shadow-2xs text-xs"
          >
            <div>
              <h2 className="font-serif text-xl font-bold text-[#173D2B]">Register Delivery Driver</h2>
              <p className="text-[#573B2C] mt-0.5">
                Creates a role-scoped <code className="font-mono">driver</code> record in Airtable Staff. Drivers sign in at <code className="font-mono">/driver</code> using their email and Driver ID.
              </p>
            </div>

            <div>
              <label className="font-semibold text-[#173D2B] block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={drvName}
                onChange={(e) => setDrvName(e.target.value)}
                placeholder="e.g. Marco Villanueva"
                className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 text-[#173D2B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Driver Email *</label>
                <input
                  type="email"
                  required
                  value={drvEmail}
                  onChange={(e) => setDrvEmail(e.target.value)}
                  placeholder="marco@jhescafe.com"
                  className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 text-[#173D2B]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={drvPhone}
                  onChange={(e) => setDrvPhone(e.target.value)}
                  placeholder="0917 555 0101"
                  className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2.5 font-mono text-[#173D2B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Vehicle</label>
                <input
                  type="text"
                  value={drvVehicle}
                  onChange={(e) => setDrvVehicle(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3 py-2.5 text-[#173D2B]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Plate No.</label>
                <input
                  type="text"
                  value={drvPlate}
                  onChange={(e) => setDrvPlate(e.target.value)}
                  placeholder="ABC-123"
                  className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3 py-2.5 font-mono text-[#173D2B]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Driver ID (Opt.)</label>
                <input
                  type="text"
                  value={drvStaffId}
                  onChange={(e) => setDrvStaffId(e.target.value)}
                  placeholder="DRIVER-01"
                  className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-3 py-2.5 font-mono uppercase text-[#173D2B]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingDriver}
              className="w-full py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-[#C9AE8B]" />
              <span>{creatingDriver ? "Registering..." : "Register Driver"}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {drivers.length === 0 ? (
              <div className="rounded-3xl border border-[#E5DACB] bg-white p-10 text-center text-xs text-[#573B2C]">
                No delivery drivers registered yet. Register a driver on the left to enable driver assignments and Driver Portal sign-in.
              </div>
            ) : (
              drivers.map((drv) => (
                <div
                  key={drv.id}
                  className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-base font-bold text-[#173D2B]">
                        {drv.full_name}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F0E7] text-[#173D2B]">
                        {drv.staff_id}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          drv.availability_status === "available"
                            ? "bg-emerald-100 text-emerald-900"
                            : drv.availability_status === "on_delivery"
                              ? "bg-sky-100 text-sky-900"
                              : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {drv.availability_status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[#573B2C] font-mono">
                      {drv.email} · {drv.phone || "No phone"} · {drv.vehicle_type} {drv.plate_number}
                    </p>
                    <p className="text-[11px] text-[#315640]">
                      Active assigned deliveries: <strong>{drv.active_deliveries_count || 0}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(["available", "on_delivery", "offline"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={busyId === drv.id}
                        onClick={() => void handleDriverAvailability(drv, st)}
                        className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-all ${
                          drv.availability_status === st
                            ? "bg-[#173D2B] text-white"
                            : "bg-[#F5F0E7] text-[#573B2C] hover:text-[#173D2B]"
                        }`}
                      >
                        {st.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="rounded-2xl border border-[#E5DACB] bg-[#FFFCF7] p-4 flex items-center gap-2.5 text-[11px] text-[#573B2C]">
        <ShieldCheck className="w-4 h-4 text-[#315640] shrink-0" />
        <span>
          Delivery status transitions, driver assignment isolation, and separate COD payment settlement are strictly enforced server-side.
        </span>
      </div>
    </div>
  );
}
