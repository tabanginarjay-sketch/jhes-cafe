import Link from "next/link";
import { MapPin, Clock, Phone, Navigation } from "lucide-react";

export function FindUsSection() {
  return (
    <section className="py-20 lg:py-24 bg-[#FFFCF7] border-t border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#E5DACB] bg-[#173D2B] text-[#FFFCF7] p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
          
          {/* Background Ambient Warmth */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#315640]/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C9AE8B]/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9AE8B]">
                Visit Our Flagship Lounge
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FFFCF7]">
                Slow down with us on Tagaytay Ridge.
              </h2>
              <p className="text-sm sm:text-base text-[#F5F0E7]/80 leading-relaxed max-w-xl">
                Panoramic mountain breezes, warm walnut seating, and handcrafted espresso served daily. Walk-ins are always warmly welcomed.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <MapPin className="w-5 h-5 text-[#C9AE8B] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[#FFFCF7]">Location</p>
                    <p className="text-[#F5F0E7]/70 leading-relaxed">
                      Km 58 Tagaytay-Nasugbu Highway, Cavite
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <Clock className="w-5 h-5 text-[#C9AE8B] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[#FFFCF7]">Operating Hours</p>
                    <p className="text-[#F5F0E7]/70">
                      Daily: 6:30 AM – 10:30 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-4">
              <div className="w-full rounded-2xl bg-[#0F2A1D] border border-[#315640] p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#315640] text-[#C9AE8B] flex items-center justify-center mx-auto">
                  <Navigation className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-lg font-bold text-[#FFFCF7]">
                    Ready to Visit?
                  </h4>
                  <p className="text-xs text-[#F5F0E7]/75">
                    Find directions, parking availability, and ridge seating guide.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-[#C9AE8B] hover:bg-[#DECDB8] text-[#173D2B] text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  View Map &amp; Directions
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
