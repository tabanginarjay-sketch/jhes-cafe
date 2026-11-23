"use client";

import { MapPin, Clock, Phone, Mail, Navigation, Car, ShieldCheck, Heart, ExternalLink } from "lucide-react";

export function CafeDetailsMapSection() {
  const googleMapsUrl =
    "https://www.google.com/maps/search/?api=1&query=Km+58+Tagaytay-Nasugbu+Highway+Cavite+Philippines";

  return (
    <section className="py-20 lg:py-28 bg-[#FFFCF7] border-t border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
            <MapPin className="w-3.5 h-3.5 text-[#C9AE8B]" />
            <span>Visit The Flagship</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight">
            How to find Jhe&apos;s Cafe&apos;.
          </h2>
          <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
            Perched along the cool mountain ridge of Tagaytay, our roastery and coffee lounge is an easy drive from Manila, Cavite, and Laguna.
          </p>
        </div>

        {/* Details Grid & Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* Left Column: Hours, Location, Contact Info */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            
            {/* Opening Hours Card */}
            <div className="p-6 sm:p-8 rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] space-y-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                    Roastery &amp; Café Hours
                  </h3>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#315640] font-semibold">
                    Open 7 Days a Week
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-[#573B2C] pt-2 border-t border-[#E5DACB]">
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium">Monday – Friday:</span>
                  <span className="font-bold text-[#173D2B]">6:30 AM – 10:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium">Saturday – Sunday:</span>
                  <span className="font-bold text-[#173D2B]">6:00 AM – 11:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-1 text-[11px] text-[#315640]">
                  <span>Morning Slow Drip Bar:</span>
                  <span className="font-semibold">Opens at sunrise</span>
                </div>
              </div>
            </div>

            {/* Address & Contact Card */}
            <div className="p-6 sm:p-8 rounded-3xl border border-[#E5DACB] bg-white space-y-4 shadow-2xs">
              <div className="space-y-3.5 text-xs text-[#573B2C]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#173D2B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#173D2B]">Physical Address</strong>
                    <span>Km 58 Tagaytay-Nasugbu Highway, Cavite, Philippines</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#173D2B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#173D2B]">Concierge &amp; Reservations</strong>
                    <span>+63 917 892 4110 / (046) 413 8820</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#173D2B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#173D2B]">Direct Email</strong>
                    <span>hello@jhescafe.com / concierge@jhescafe.com</span>
                  </div>
                </div>
              </div>

              {/* Direction CTA Button */}
              <div className="pt-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                >
                  <Navigation className="w-4 h-4 text-[#C9AE8B]" />
                  <span>Get Directions on Google Maps</span>
                </a>
              </div>
            </div>

            {/* Guest Amenities Note */}
            <div className="flex items-center justify-between text-xs text-[#573B2C] px-2">
              <span className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#315640]" />
                <span>Free On-Site Valet &amp; Parking</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#315640]" />
                <span>Pet-Friendly Balcony</span>
              </span>
            </div>

          </div>

          {/* Right Column: Interactive Google Maps Embed with Floating Callouts */}
          <div className="lg:col-span-7 rounded-3xl border border-[#315640] overflow-hidden bg-[#0F2A1D] shadow-2xl relative min-h-[420px] flex flex-col justify-between p-3 sm:p-4">
            
            {/* Interactive Google Maps Frame */}
            <div className="relative w-full h-[320px] sm:h-[380px] lg:h-[420px] rounded-2xl overflow-hidden border border-[#315640]/70 bg-[#173D2B]">
              <iframe
                title="Jhe's Cafe Flagship Google Map"
                src="https://maps.google.com/maps?q=Km%2058%20Tagaytay-Nasugbu%20Highway,%20Cavite,%20Philippines&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0 filter contrast-[1.05] brightness-[0.98]"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              {/* Map Pin Callout Badge */}
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#173D2B]/95 backdrop-blur-md border border-[#315640] shadow-lg text-xs font-semibold text-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Jhe&apos;s Cafe&apos; Flagship Roastery • Open Now</span>
                </div>
              </div>

              {/* Floating Quick Action Overlay on bottom */}
              <div className="absolute bottom-3 left-3 right-3 z-10 hidden sm:flex items-center justify-between p-3 rounded-xl bg-[#0F2A1D]/90 backdrop-blur-md border border-[#315640] text-xs text-white">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#C9AE8B] shrink-0" />
                  <span className="text-[#F5F0E7]/90 text-[11px]">75-min scenic drive from Metro Manila via CALAX</span>
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C9AE8B] text-[#173D2B] font-bold text-[10px] uppercase tracking-wider hover:bg-[#DECDB8] transition-colors shrink-0"
                >
                  <span>Open Full Map</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Bottom Card Strip for Mobile / Quick Access */}
            <div className="sm:hidden pt-3 flex items-center justify-between text-xs text-[#F5F0E7]">
              <span className="truncate text-[11px] text-[#F5F0E7]/80">Km 58 Tagaytay-Nasugbu Highway</span>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-full bg-[#C9AE8B] text-[#173D2B] font-bold text-[10px] uppercase tracking-wider shrink-0"
              >
                Directions
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
