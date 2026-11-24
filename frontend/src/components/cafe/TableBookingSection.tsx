"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  MapPin,
  Armchair,
  Coffee,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createReservation, fetchReservations, type ReservationPayload } from "@/lib/api";
import { ScrollReveal } from "@/components/common/ScrollReveal";

export const ZONES = [
  {
    id: "communal-walnut",
    name: "Communal Walnut Table",
    desc: "14-seater live-edge wood table. Perfect for laptop focus, reading & natural daylight.",
    capacity: "1–6 guests",
    tag: "Work & Focus",
  },
  {
    id: "botanical-lounge",
    name: "Sunlit Botanical Lounge",
    desc: "Plush sage upholstered armchairs surrounded by tropical monstera & ficus plants.",
    capacity: "2–4 guests",
    tag: "Cozy & Relaxed",
  },
  {
    id: "espresso-bar",
    name: "Espresso & Pour-Over Bar",
    desc: "Front-row high counter seating for interactive single-origin tasting flights.",
    capacity: "1–3 guests",
    tag: "Barista Experience",
  },
  {
    id: "outdoor-seating",
    name: "Outdoor Highland Balcony",
    desc: "Open-air wooden deck with panoramic mountain breeze & soft afternoon sunlight.",
    capacity: "2–6 guests",
    tag: "Mountain View",
  },
];

export const TIME_SLOTS = [
  "8:30 AM – Morning Roast",
  "10:30 AM – Mid-Morning Sun",
  "1:00 PM – Post-Lunch Slow Drip",
  "3:30 PM – Afternoon Golden Hour",
  "5:30 PM – Twilight Sunset Brew",
  "7:30 PM – Evening Warm Ambient",
];

export function TableBookingSection({
  preselectedZoneId,
}: {
  preselectedZoneId?: string;
}) {
  const { user } = useAuth();

  const [today, setToday] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState(
    ZONES.find((z) => z.id === preselectedZoneId) || ZONES[0]
  );
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [guests, setGuests] = useState("2");
  const [specialRequest, setSpecialRequest] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<any>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);

  useEffect(() => {
    const now = new Date();
    const t = now.toISOString().split("T")[0];
    const tom = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    setToday(t);
    setDate(tom);
  }, []);

  useEffect(() => {
    if (preselectedZoneId) {
      const match = ZONES.find((z) => z.id === preselectedZoneId);
      if (match) setSelectedZone(match);
    }
  }, [preselectedZoneId]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Auth Guard Check
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    const currentToday = today || new Date().toISOString().split("T")[0];
    if (date && date < currentToday) {
      setErrorMessage("Please select a date from today onwards.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ReservationPayload = {
        date,
        time_slot: timeSlot,
        zone: selectedZone.name,
        guests: Number(guests) || 2,
        customer_name: user.full_name || "Guest Customer",
        customer_email: user.email || "guest@jhescafe.com",
        customer_phone: user.phone ? String(user.phone) : undefined,
        special_requests: specialRequest.trim() || undefined,
      };

      const result = await createReservation(payload);
      setConfirmedReservation(result);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not complete your booking. Please try another time slot or contact our concierge."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="reserve-table" className="py-20 lg:py-28 bg-[#F5F0E7] border-t border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header with Scroll Reveal */}
        <ScrollReveal direction="up" delay={0}>
          <div className="max-w-2xl text-left space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#315640]">
              Table &amp; Lounge Reservation
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight">
              Reserve your quiet corner.
            </h2>
            <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
              Reserve your preferred seating zone in advance at Jhe&apos;s Cafe&apos;. We hold your table for up to 20 minutes past your confirmed time.
            </p>
          </div>
        </ScrollReveal>

        {/* Confirmed Screen */}
        {confirmedReservation ? (
          <div className="max-w-2xl mx-auto rounded-3xl border border-[#315640]/30 bg-white p-8 sm:p-12 text-center space-y-6 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#315640]">
                Table Reserved Successfully
              </span>
              <h3 className="font-serif text-3xl font-bold text-[#173D2B]">
                {confirmedReservation.reservation_code || confirmedReservation.code || "RES-JHE-CONFIRMED"}
              </h3>
              <p className="text-sm text-[#573B2C]">
                Your table is confirmed for <strong>{confirmedReservation.customer_name || user?.full_name}</strong>. We look forward to welcoming you to Jhe&apos;s Cafe&apos;.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F5F0E7] border border-[#E5DACB] text-left text-xs space-y-3 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-[#573B2C]">Seating Area:</span>
                <span className="font-bold text-[#173D2B]">{confirmedReservation.zone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#573B2C]">Date &amp; Time Slot:</span>
                <span className="font-medium text-[#173D2B]">
                  {confirmedReservation.date} · {confirmedReservation.time_slot || confirmedReservation.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#573B2C]">Party Size:</span>
                <span className="font-bold text-[#173D2B]">
                  {confirmedReservation.guests} {confirmedReservation.guests === 1 ? "Guest" : "Guests"}
                </span>
              </div>
              {confirmedReservation.special_requests && (
                <div className="flex justify-between border-t border-[#E5DACB] pt-2">
                  <span className="text-[#573B2C]">Special Request:</span>
                  <span className="font-medium text-[#173D2B] max-w-[200px] truncate text-right">
                    {confirmedReservation.special_requests}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmedReservation(null)}
                className="w-full sm:w-auto px-6 py-3 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Make Another Reservation
              </button>

              <Link
                href="/account"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                View My Profile
              </Link>
            </div>
          </div>
        ) : (
          /* Reservation Form */
          <form onSubmit={handleBook} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Zone Selection (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#173D2B]">
                1. Choose Seating Area
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {ZONES.map((zone) => {
                  const isSelected = selectedZone.id === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZone(zone)}
                      className={`p-5 rounded-2xl border text-left cursor-pointer space-y-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.98] ${
                        isSelected
                          ? "border-[#173D2B] bg-[#173D2B] text-white shadow-lg scale-[1.01]"
                          : "border-[#E5DACB] bg-white text-[#173D2B] hover:border-[#315640] hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-[#C9AE8B] text-[#173D2B]"
                              : "bg-[#F5F0E7] text-[#315640]"
                          }`}
                        >
                          {zone.tag}
                        </span>
                        <span className={`text-[10px] ${isSelected ? "text-[#F5F0E7]/80" : "text-[#573B2C]"}`}>
                          {zone.capacity}
                        </span>
                      </div>

                      <h4 className="font-serif text-base font-bold">{zone.name}</h4>
                      <p className={`text-[11px] leading-relaxed ${isSelected ? "text-[#F5F0E7]/90" : "text-[#573B2C]"}`}>
                        {zone.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date, Time, Guests & Submit (5 Cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-[#173D2B]">
                2. Schedule &amp; Party Size
              </h3>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* Date Selection */}
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">
                    Reservation Date
                  </label>
                  <input
                    type="date"
                    required
                    min={today || undefined}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                  />
                </div>

                {/* Preferred Time Slot */}
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">
                    Available Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Number of Guests */}
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">
                    Number of Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8].map((num) => (
                      <option key={num} value={String(num)}>
                        {num} {num === 1 ? "Guest" : "Guests"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    placeholder="E.g. anniversary, power outlet requirement, quiet reading corner..."
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7] focus:outline-hidden focus:border-[#173D2B]"
                  />
                </div>
              </div>

              {/* User Login Status Notice */}
              {user ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Booking as <strong>{user.full_name}</strong></span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-800 font-bold uppercase">
                    {user.role}
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Account Required to Book</strong>
                    <span className="text-[11px] leading-relaxed">
                      Bago makapag-book ng table, kailangan munang mag-sign in o mag-create ng account sa Jhe&apos;s Cafe&apos;.
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button with Smooth Micro-Interaction */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Reserving Table...</span>
                  </div>
                ) : (
                  <>
                    <span>{user ? "Confirm Table Reservation" : "Sign In / Register to Book"}</span>
                    <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                  </>
                )}
              </button>

            </div>

          </form>
        )}

      </div>

      {/* Auth Gate Modal when non-logged-in user tries to book */}
      {showAuthGate && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#E5DACB] bg-white p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center mx-auto border border-amber-200">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#315640]">
                Account Required
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#173D2B]">
                Sign In to Reserve Your Table
              </h3>
              <p className="text-xs text-[#573B2C] leading-relaxed">
                Table bookings are reserved for registered <strong>Jhe&apos;s Cafe&apos;</strong> members. Sign in with your existing account or create a new account in seconds.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/login?redirect=/our-cafe"
                className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider text-center transition-all shadow-md"
              >
                Sign In to Book
              </Link>
              <Link
                href="/register?redirect=/our-cafe"
                className="w-full py-3.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider text-center transition-all"
              >
                Create New Account
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setShowAuthGate(false)}
              className="text-xs text-[#573B2C]/70 hover:text-[#173D2B] underline cursor-pointer"
            >
              Cancel and return
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
