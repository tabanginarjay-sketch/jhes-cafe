"use client";

import { useState } from "react";
import { FindUsSection } from "@/components/home/FindUsSection";
import { BRAND_CONFIG } from "@/lib/brandConfig";
import { Mail, Phone, MapPin, Send, Check, Clock, Info } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitted(true);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="bg-[#FFFCF7]">
      <section className="py-20 bg-[#F5F0E7] border-b border-[#E5DACB] text-center space-y-4 px-4">
        <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#315640]">
          Connect With {BRAND_CONFIG.name} · {BRAND_CONFIG.demoBadge}
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#173D2B]">
          Find Us &amp; Say Hello
        </h1>
        <p className="text-base text-[#573B2C] max-w-lg mx-auto">
          Inquiries for reserve catering, bean distribution, or private coffee bar bookings.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-6 space-y-8">
            <h2 className="font-serif text-3xl font-bold text-[#173D2B]">
              We would love to pour for you.
            </h2>
            <p className="text-sm text-[#573B2C] leading-relaxed">
              Have a question about our roast profiles, wholesale coffee supply, or private coffee tastings? Drop us a note below.
            </p>

            <div className="space-y-4 text-xs text-[#573B2C]">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5F0E7]">
                <MapPin className="w-5 h-5 text-[#173D2B] shrink-0" />
                <div>
                  <p className="font-bold text-[#173D2B]">Flagship Lounge (Demo Location)</p>
                  <p>{BRAND_CONFIG.location.fullAddress}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5F0E7]">
                <Clock className="w-5 h-5 text-[#173D2B] shrink-0" />
                <div>
                  <p className="font-bold text-[#173D2B]">Operating Hours</p>
                  <p>{BRAND_CONFIG.hours.weekdaysLabel} · {BRAND_CONFIG.hours.weekendsLabel}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5F0E7]">
                <Phone className="w-5 h-5 text-[#173D2B] shrink-0" />
                <div>
                  <p className="font-bold text-[#173D2B]">Concierge Phone (Demo)</p>
                  <p>{BRAND_CONFIG.contact.phoneDisplay}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5F0E7]">
                <Mail className="w-5 h-5 text-[#173D2B] shrink-0" />
                <div>
                  <p className="font-bold text-[#173D2B]">Email Inquiries (Demo)</p>
                  <p>{BRAND_CONFIG.contact.email} / {BRAND_CONFIG.contact.conciergeEmail}</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-[#E5DACB] bg-amber-50/50 text-[11px] text-[#573B2C] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#315640] shrink-0 mt-0.5" />
              <span>{BRAND_CONFIG.demoDisclaimer}</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-[#E5DACB] bg-white p-8 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-xl font-bold text-[#173D2B]">Send a Message</h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F5F0E7] text-[#315640]">
                  Demo Inquiry Form
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">Your Full Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (submitted) setSubmitted(false);
                    }}
                    placeholder="Your Name"
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">Email Address</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (submitted) setSubmitted(false);
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (submitted) setSubmitted(false);
                    }}
                    placeholder="How can we help?"
                    className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submitted ? (
                  <>
                    <Check className="w-4 h-4 text-[#C9AE8B]" />
                    <span>Demo Inquiry Recorded — Send Another</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#C9AE8B]" />
                    <span>Send Message</span>
                  </>
                )}
              </button>

              {submitted && (
                <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  Thank you for testing the Jhe&apos;s Cafe&apos; contact form. Because this is a portfolio demonstration, no external email was dispatched.
                </p>
              )}
            </form>
          </div>

        </div>
      </div>

      <FindUsSection />
    </div>
  );
}
