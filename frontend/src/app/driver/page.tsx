"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  KeyRound,
  Mail,
  LogOut,
  RefreshCw,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  Send,
  ShieldCheck,
  ArrowLeft,
  Banknote,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import {
  formatDeliveryStatusLabel,
  type DeliveryRecord,
  type DriverAvailabilityStatus,
  type DriverProfile,
} from "@/lib/deliveryTypes";

interface DriverAssignedDelivery extends Omit<DeliveryRecord, "confirmation_code"> {
  has_confirmation_code?: boolean;
  items?: Array<{
    id?: string;
    product_name: string;
    quantity: number;
    size?: string;
    temperature?: string;
  }>;
}

export default function DriverPortalPage() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const [deliveries, setDeliveries] = useState<DriverAssignedDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Per-delivery completion & problem forms
  const [proofCodeByDlv, setProofCodeByDlv] = useState<Record<string, string>>({});
  const [proofNoteByDlv, setProofNoteByDlv] = useState<Record<string, string>>({});
  const [codCollectedByDlv, setCodCollectedByDlv] = useState<Record<string, string>>({});
  const [problemByDlv, setProblemByDlv] = useState<Record<string, string>>({});
  const [msgByDlv, setMsgByDlv] = useState<Record<string, string>>({});

  const loadAssignedDeliveries = useCallback(async () => {
    setLoadingDeliveries(true);
    try {
      const res = await fetch(`${API_BASE_URL}/driver/deliveries`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        setDriver(null);
        setDeliveries([]);
        return;
      }
      if (res.ok) {
        const j = await res.json();
        setDeliveries(Array.isArray(j?.deliveries) ? j.deliveries : []);
      }
    } catch {
      setFeedback({ type: "error", text: "Unable to load your assigned deliveries." });
    } finally {
      setLoadingDeliveries(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/driver`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const j = await res.json();
        if (j.authenticated && j.driver) {
          setDriver(j.driver);
          await loadAssignedDeliveries();
          return;
        }
      }
      setDriver(null);
    } catch {
      setDriver(null);
    } finally {
      setChecking(false);
    }
  }, [loadAssignedDeliveries]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmittingAuth(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          credential: credential.trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.authenticated) {
        setAuthError(j.detail || "Invalid driver credentials.");
        return;
      }
      setDriver(j.driver);
      setCredential("");
      await loadAssignedDeliveries();
    } catch {
      setAuthError("Unable to reach driver authentication service.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await fetch(`${API_BASE_URL}/auth/driver`, { method: "DELETE", credentials: "include" }).catch(() => {});
    setDriver(null);
    setDeliveries([]);
  };

  const handleAvailabilityChange = async (nextAvail: DriverAvailabilityStatus) => {
    if (!driver) return;
    const res = await fetch(`${API_BASE_URL}/drivers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ availability_status: nextAvail }),
    });
    if (res.ok) {
      setDriver({ ...driver, availability_status: nextAvail });
    }
  };

  const submitDriverAction = async (
    dlvId: string,
    payload: Record<string, unknown>,
    successMsg: string
  ) => {
    setBusyId(dlvId);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/driver/deliveries/${dlvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || "Action rejected.");
      setFeedback({ type: "success", text: successMsg });
      await loadAssignedDeliveries();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Update failed." });
    } finally {
      setBusyId(null);
    }
  };

  const handleSendMessage = async (dlv: DriverAssignedDelivery) => {
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
        throw new Error(j.detail || "Could not send message.");
      }
      setMsgByDlv((prev) => ({ ...prev, [dlv.id]: "" }));
      await loadAssignedDeliveries();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Message failed." });
    } finally {
      setBusyId(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#573B2C]">Verifying driver session...</span>
        </div>
      </div>
    );
  }

  // ROLE-PROTECTED DRIVER LOGIN GATE
  if (!driver) {
    return (
      <div className="min-h-screen bg-[#F5F0E7] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-[#E5DACB] shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center mx-auto shadow-md">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#315640] block">
                Role-Protected Driver Portal
              </span>
              <h1 className="font-serif text-2xl font-bold text-[#173D2B]">
                Jhe&apos;s Cafe&apos; Delivery Riders
              </h1>
            </div>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Sign in with your active driver email and Driver ID credential registered in Staff to view your assigned deliveries.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#173D2B] block mb-1.5">
                Driver Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@jhescafe.com"
                  className="w-full rounded-xl border border-[#E5DACB] px-4 py-3 text-xs text-[#173D2B] bg-[#FFFCF7] pr-10"
                />
                <Mail className="w-4 h-4 text-[#573B2C]/50 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#173D2B] block mb-1.5">
                Driver ID Credential
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="e.g. DRIVER-01"
                  className="w-full rounded-xl border border-[#E5DACB] px-4 py-3 text-xs text-[#173D2B] font-mono bg-[#FFFCF7] pr-10"
                />
                <KeyRound className="w-4 h-4 text-[#573B2C]/50 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {authError && (
              <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 font-medium">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={submittingAuth}
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50"
            >
              {submittingAuth ? "Signing in..." : "Sign In to Driver Portal"}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E5DACB] text-center space-y-2">
            <p className="text-[11px] text-[#573B2C]/75">
              Drivers can access only their own assigned deliveries and never admin payment controls.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#573B2C] hover:text-[#173D2B]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F0E7]">
      {/* Driver Top Bar */}
      <header className="bg-[#173D2B] text-white px-4 sm:px-8 py-4 sticky top-0 z-30 border-b border-[#0F2A1D]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#315640] text-[#C9AE8B] flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-serif text-base font-bold leading-tight">{driver.full_name}</p>
              <p className="text-[10px] font-mono text-[#C9AE8B]">
                {driver.staff_id} · Driver Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAssignedDeliveries()}
              className="p-2 rounded-full bg-[#315640] hover:bg-[#3f6c51] text-[#FFFCF7] cursor-pointer"
              aria-label="Refresh deliveries"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDeliveries ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-[#0F2A1D] hover:bg-rose-900 text-xs font-semibold text-[#C9AE8B] hover:text-white cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Availability Switcher */}
        <div className="rounded-2xl border border-[#E5DACB] bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-bold text-[#173D2B]">My Availability Status</p>
            <p className="text-[11px] text-[#573B2C]">
              Visible to café dispatch when assigning incoming delivery orders.
            </p>
          </div>
          <div className="flex gap-1.5">
            {(["available", "on_delivery", "offline"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => void handleAvailabilityChange(st)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase cursor-pointer transition-all ${
                  driver.availability_status === st
                    ? "bg-[#173D2B] text-white shadow-2xs"
                    : "bg-[#F5F0E7] text-[#573B2C] hover:text-[#173D2B]"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Assigned Deliveries Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#173D2B]">
              My Assigned Deliveries ({deliveries.length})
            </h2>
            <span className="text-[11px] font-mono text-[#573B2C] inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#315640]" />
              <span>Scoped strictly to {driver.staff_id}</span>
            </span>
          </div>

          {loadingDeliveries ? (
            <div className="h-44 rounded-3xl border border-[#E5DACB] bg-white animate-pulse" />
          ) : deliveries.length === 0 ? (
            <div className="rounded-3xl border border-[#E5DACB] bg-white p-12 text-center space-y-2">
              <Truck className="w-10 h-10 text-[#C9AE8B] mx-auto" />
              <p className="font-serif text-lg font-bold text-[#173D2B]">No assigned deliveries right now</p>
              <p className="text-xs text-[#573B2C]">
                Stay set to <strong>Available</strong> — newly assigned deliveries will appear here immediately.
              </p>
            </div>
          ) : (
            deliveries.map((dlv) => {
              const isCod = dlv.payment_method === "cod";
              const isTerminal = ["DELIVERED", "CANCELLED", "RETURNED", "FAILED_DELIVERY"].includes(
                dlv.delivery_status
              );

              return (
                <article
                  key={dlv.id}
                  className="rounded-3xl border border-[#E5DACB] bg-white p-5 sm:p-6 shadow-xs space-y-4"
                >
                  {/* Order Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F5F0E7] pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-base font-bold text-[#173D2B]">
                          #{dlv.order_number}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#173D2B] text-[#C9AE8B]">
                          {formatDeliveryStatusLabel(dlv.delivery_status)}
                        </span>
                        {isCod ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                            <Banknote className="w-3 h-3" />
                            <span>Collect COD: ₱{dlv.cod_amount_due.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200">
                            Online ({dlv.payment_method.toUpperCase()})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-[#573B2C] inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#315640]" />
                        <span>ETA: {dlv.estimated_delivery_time}</span>
                        {dlv.driver_acknowledged_at && (
                          <span className="text-emerald-800 ml-2">· Acknowledged</span>
                        )}
                      </p>
                    </div>

                    <a
                      href={`tel:${dlv.contact_number}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F5F0E7] hover:bg-[#173D2B] hover:text-white text-[#173D2B] text-xs font-semibold transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call {dlv.recipient_name.split(" ")[0]}</span>
                    </a>
                  </div>

                  {/* Recipient & Address */}
                  <div className="rounded-2xl bg-[#FFFCF7] border border-[#E5DACB] p-4 space-y-2 text-xs">
                    <p className="font-bold text-[#173D2B]">
                      {dlv.recipient_name} · <span className="font-mono">{dlv.contact_number}</span>
                    </p>
                    <p className="text-[#573B2C] flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-[#315640] shrink-0 mt-0.5" />
                      <span>{dlv.full_address}</span>
                    </p>
                    {dlv.delivery_instructions && (
                      <p className="text-[#173D2B] bg-amber-50/70 border border-amber-200 px-3 py-2 rounded-xl">
                        <strong>Customer Instructions:</strong> {dlv.delivery_instructions}
                      </p>
                    )}
                    {dlv.items && dlv.items.length > 0 && (
                      <div className="pt-2 border-t border-[#E5DACB]/70 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C] inline-flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>Items to Verify at Pickup</span>
                        </p>
                        {dlv.items.map((it, idx) => (
                          <p key={it.id || idx} className="text-[11px] text-[#173D2B]">
                            {it.quantity}× <strong>{it.product_name}</strong>
                            {it.size ? ` (${it.size}${it.temperature ? `, ${it.temperature}` : ""})` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Validated Step-by-Step Driver Actions */}
                  {!isTerminal && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {!dlv.driver_acknowledged_at && (
                          <button
                            type="button"
                            disabled={busyId === dlv.id}
                            onClick={() =>
                              void submitDriverAction(
                                dlv.id,
                                { action: "acknowledge" },
                                `Acknowledged assignment for #${dlv.order_number}.`
                              )
                            }
                            className="px-4 py-2.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold cursor-pointer"
                          >
                            Acknowledge Assignment
                          </button>
                        )}

                        {(dlv.delivery_status === "DRIVER_ASSIGNED" ||
                          dlv.delivery_status === "READY_FOR_PICKUP") && (
                          <button
                            type="button"
                            disabled={busyId === dlv.id}
                            onClick={() =>
                              void submitDriverAction(
                                dlv.id,
                                { action: "update_status", delivery_status: "PICKED_UP" },
                                `Order #${dlv.order_number} marked PICKED_UP.`
                              )
                            }
                            className="px-5 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            Mark Picked Up
                          </button>
                        )}

                        {dlv.delivery_status === "PICKED_UP" && (
                          <button
                            type="button"
                            disabled={busyId === dlv.id}
                            onClick={() =>
                              void submitDriverAction(
                                dlv.id,
                                { action: "update_status", delivery_status: "OUT_FOR_DELIVERY" },
                                `Order #${dlv.order_number} is now OUT_FOR_DELIVERY.`
                              )
                            }
                            className="px-5 py-2.5 rounded-full bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold cursor-pointer shadow-xs"
                          >
                            Mark Out for Delivery
                          </button>
                        )}
                      </div>

                      {/* Complete Delivery + Proof of Delivery Form (Only when OUT_FOR_DELIVERY) */}
                      {dlv.delivery_status === "OUT_FOR_DELIVERY" && (
                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3 text-xs">
                          <p className="font-bold text-emerald-950">
                            Complete Delivery &amp; Submit Proof of Handoff
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                                Customer 6-Char Confirmation Code
                              </label>
                              <input
                                type="text"
                                maxLength={10}
                                value={proofCodeByDlv[dlv.id] || ""}
                                onChange={(e) =>
                                  setProofCodeByDlv((prev) => ({
                                    ...prev,
                                    [dlv.id]: e.target.value.toUpperCase(),
                                  }))
                                }
                                placeholder="e.g. A1B2C3"
                                className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 font-mono uppercase text-[#173D2B]"
                              />
                            </div>
                            {isCod && (
                              <div>
                                <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                                  COD Cash Collected (PHP)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={codCollectedByDlv[dlv.id] ?? String(dlv.cod_amount_due)}
                                  onChange={(e) =>
                                    setCodCollectedByDlv((prev) => ({
                                      ...prev,
                                      [dlv.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 font-mono font-bold text-[#173D2B]"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                              Proof of Delivery Note (Required if no code)
                            </label>
                            <input
                              type="text"
                              value={proofNoteByDlv[dlv.id] || ""}
                              onChange={(e) =>
                                setProofNoteByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))
                              }
                              placeholder="e.g. Handed directly to recipient at main gate"
                              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-[#173D2B]"
                            />
                          </div>
                          {isCod && (
                            <p className="text-[11px] text-emerald-900">
                              Note: Recording cash collected logs your remittance amount; café cashier confirms COD payment settlement separately.
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={
                              busyId === dlv.id ||
                              (!(proofCodeByDlv[dlv.id] || "").trim() &&
                                !(proofNoteByDlv[dlv.id] || "").trim())
                            }
                            onClick={() =>
                              void submitDriverAction(
                                dlv.id,
                                {
                                  action: "update_status",
                                  delivery_status: "DELIVERED",
                                  confirmation_code: (proofCodeByDlv[dlv.id] || "").trim() || undefined,
                                  proof_note: (proofNoteByDlv[dlv.id] || "").trim() || undefined,
                                  ...(isCod
                                    ? {
                                        cash_collected_amount: Number(
                                          codCollectedByDlv[dlv.id] ?? dlv.cod_amount_due
                                        ),
                                      }
                                    : {}),
                                },
                                `Order #${dlv.order_number} marked DELIVERED with proof recorded.`
                              )
                            }
                            className="px-5 py-2.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                          >
                            Mark Order DELIVERED
                          </button>
                        </div>
                      )}

                      {/* Report Delivery Problem (PICKED_UP or OUT_FOR_DELIVERY) */}
                      {(dlv.delivery_status === "PICKED_UP" ||
                        dlv.delivery_status === "OUT_FOR_DELIVERY") && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <input
                            type="text"
                            value={problemByDlv[dlv.id] || ""}
                            onChange={(e) =>
                              setProblemByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))
                            }
                            placeholder="Report delivery problem (e.g. recipient unreachable, gate closed)..."
                            className="flex-1 min-w-[200px] rounded-full border border-rose-200 px-3.5 py-2 text-xs text-[#173D2B]"
                          />
                          <button
                            type="button"
                            disabled={busyId === dlv.id || (problemByDlv[dlv.id] || "").trim().length < 3}
                            onClick={() =>
                              void submitDriverAction(
                                dlv.id,
                                {
                                  action: "update_status",
                                  delivery_status: "FAILED_DELIVERY",
                                  reason: problemByDlv[dlv.id],
                                },
                                `Reported delivery problem for #${dlv.order_number}.`
                              )
                            }
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-700 hover:text-white text-rose-900 border border-rose-200 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Report Problem</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Completed Proof Summary */}
                  {dlv.delivery_status === "DELIVERED" && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                      <strong>Delivered:</strong> {dlv.proof_note}
                      {isCod && dlv.cash_collected_amount !== null && (
                        <> · Cash collected: ₱{dlv.cash_collected_amount.toFixed(2)} (pending cashier settlement)</>
                      )}
                    </div>
                  )}

                  {/* Restricted Message Thread */}
                  <div className="pt-3 border-t border-[#F5F0E7] space-y-2">
                    {dlv.messages && dlv.messages.length > 0 && (
                      <div className="space-y-1 bg-[#F5F0E7]/60 p-3 rounded-xl text-[11px]">
                        {dlv.messages.slice(-4).map((m) => (
                          <p key={m.id} className="text-[#173D2B]">
                            <strong className="capitalize">{m.sender_role} ({m.sender_name}):</strong> {m.text}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={msgByDlv[dlv.id] || ""}
                        onChange={(e) => setMsgByDlv((prev) => ({ ...prev, [dlv.id]: e.target.value }))}
                        placeholder="Message recipient or dispatch..."
                        className="flex-1 rounded-full border border-[#E5DACB] bg-[#FFFCF7] px-3.5 py-2 text-xs text-[#173D2B]"
                      />
                      <button
                        type="button"
                        disabled={busyId === dlv.id || !(msgByDlv[dlv.id] || "").trim()}
                        onClick={() => void handleSendMessage(dlv)}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
