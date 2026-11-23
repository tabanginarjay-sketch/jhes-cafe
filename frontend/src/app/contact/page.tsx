"use client";

import { useState } from "react";
import { FindUsSection } from "@/components/home/FindUsSection";
import { Mail, Phone, MapPin, Send, Check } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-[#FFFCF7]">
      <section className="py-20 bg-[#F5F0E7] border-b border-[#E5DACB] text-center space-y-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#315640]">
          Connect With Us
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
                  <p className="font-bold text-[#173D2B]">Flagship Roastery</p>
                  <p>Km 58 Tagaytay-Nasugbu Highway, Cavite</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5F0E7]">
                <Phone className="w-5 h-5 text-[#173D2B] shrink-0" />
                <div>
                  <p className="font-bold text-[#173D2B]">Concierge Phone</p>
                  <p>+63 917 892 4110 / (046) 413 8820</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5F0E7]">
                <Mail className="w-5 h-5 text-[#173D2B] shrink-0" />
                <div>
                  <p className="font-bold text-[#173D2B]">Email Inquiries</p>
                  <p>hello@brewandco.ph / concierge@brewandco.ph</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="rounded-3xl border border-[#E5DACB] bg-white p-8 space-y-4 shadow-sm"
            >
              <h3 className="font-serif text-xl font-bold text-[#173D2B]">Send a Message</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">Your Full Name</label>
                  <input required type="text" placeholder="Juan Ramos" className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B]" />
                </div>
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">Email Address</label>
                  <input required type="email" placeholder="juan@example.com" className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B]" />
                </div>
                <div>
                  <label className="font-semibold text-[#173D2B] block mb-1">Message</label>
                  <textarea required rows={4} placeholder="How can we help?" className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B]" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submitted ? (
                  <>
                    <Check className="w-4 h-4 text-[#C9AE8B]" />
                    <span>Message Sent! We will reply shortly.</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#C9AE8B]" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>

      <FindUsSection />
    </div>
  );
}
