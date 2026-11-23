import { MapPin, Clock, Navigation, ExternalLink, Sparkles, Compass } from "lucide-react";
import { ScrollReveal } from "@/components/common/ScrollReveal";

export function FindUsSection() {
  const googleMapsUrl =
    "https://www.google.com/maps/search/?api=1&query=Km+58+Tagaytay-Nasugbu+Highway+Cavite+Philippines";
  const embedMapUrl =
    "https://maps.google.com/maps?q=Km%2058%20Tagaytay-Nasugbu%20Highway,%20Cavite,%20Philippines&t=&z=15&ie=UTF8&iwloc=&output=embed";

  return (
    <section className="py-20 lg:py-24 bg-[#FFFCF7] border-t border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#E5DACB] bg-[#173D2B] text-[#FFFCF7] p-6 sm:p-10 lg:p-14 relative overflow-hidden shadow-2xl">
          
          {/* Background Ambient Warmth Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#315640]/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C9AE8B]/15 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Heading, Descriptions & Info Badges */}
            <div className="lg:col-span-6">
              <ScrollReveal direction="up" delay={0} className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9AE8B]">
                  <Sparkles className="w-3 h-3" />
                  <span>Visit Our Flagship Lounge</span>
                </div>

                <div className="space-y-3">
                  <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FFFCF7] leading-tight">
                    Slow down with us on Tagaytay Ridge.
                  </h2>
                  <p className="text-sm sm:text-base text-[#F5F0E7]/80 leading-relaxed max-w-xl">
                    Panoramic mountain breezes, warm walnut seating, and handcrafted espresso served daily. Walk-ins are always warmly welcomed.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                    <MapPin className="w-5 h-5 text-[#C9AE8B] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-[#FFFCF7]">Location</p>
                      <p className="text-[#F5F0E7]/70 leading-relaxed">
                        Km 58 Tagaytay-Nasugbu Highway, Cavite
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                    <Clock className="w-5 h-5 text-[#C9AE8B] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-[#FFFCF7]">Operating Hours</p>
                      <p className="text-[#F5F0E7]/70">
                        Daily: 6:30 AM – 10:30 PM
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tagaytay Highlights Perks */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#F5F0E7]/75">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F2A1D]/80 border border-[#315640]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9AE8B]" />
                    Free Valet &amp; Ridge Parking
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F2A1D]/80 border border-[#315640]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9AE8B]" />
                    Scenic Highland Deck
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F2A1D]/80 border border-[#315640]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9AE8B]" />
                    Pet-Friendly Lounge
                  </span>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Column: Google Maps Interactive Showcase */}
            <div className="lg:col-span-6">
              <ScrollReveal direction="up" delay={150}>
                <div className="rounded-3xl border border-[#315640] bg-[#0F2A1D]/90 p-3 sm:p-4 shadow-2xl relative overflow-hidden flex flex-col gap-3 group">
                  
                  {/* Interactive Map Iframe Container */}
                  <div className="relative w-full h-[320px] sm:h-[360px] rounded-2xl overflow-hidden border border-[#315640]/60 bg-[#173D2B] shadow-inner">
                    <iframe
                      title="Jhe's Cafe Flagship Location - Tagaytay-Nasugbu Highway"
                      src={embedMapUrl}
                      className="w-full h-full border-0 filter contrast-[1.05] brightness-[0.98]"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />

                    {/* Floating Header Badge */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#173D2B]/95 backdrop-blur-md border border-[#315640] text-[11px] font-semibold text-[#FFFCF7] shadow-lg pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Jhe&apos;s Cafe&apos; • Tagaytay Ridge</span>
                    </div>

                    {/* Floating Compass Pill */}
                    <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] text-white/90 border border-white/10 pointer-events-none">
                      <Compass className="w-3 h-3 text-[#C9AE8B]" />
                      <span>Live Google Map</span>
                    </div>
                  </div>

                  {/* Bottom Interactive Action Strip */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 px-1">
                    <div className="flex items-center gap-2 text-xs text-[#F5F0E7]/80 w-full sm:w-auto">
                      <Navigation className="w-4 h-4 text-[#C9AE8B] shrink-0" />
                      <span className="truncate">Km 58 Tagaytay-Nasugbu Highway, Cavite</span>
                    </div>

                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#C9AE8B] hover:bg-[#DECDB8] text-[#173D2B] text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md hover:scale-[1.02] active:scale-95 shrink-0 w-full sm:w-auto cursor-pointer"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                </div>
              </ScrollReveal>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
