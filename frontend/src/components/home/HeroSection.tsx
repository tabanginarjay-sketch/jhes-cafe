import Link from "next/link";
import { ArrowRight, Sparkles, MapPin } from "lucide-react";
import { RotatingCoffeeCup } from "./RotatingCoffeeCup";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#F5F0E7] border-b border-[#E5DACB]">
      {/* Background Ambience Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          className="w-full h-full bg-cover bg-center brightness-[0.88] contrast-[1.04] animate-cinematic-zoom"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=2000&q=85')",
          }}
        />
        {/* Warm Walnut & Forest Green Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#173D2B]/95 via-[#173D2B]/85 to-transparent lg:to-[#173D2B]/40" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#573B2C]/20 to-[#173D2B]/80" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Subtle Botanical Badge */}
            <div className="animate-fade-up animation-delay-100">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#315640]/80 backdrop-blur-md border border-[#C9AE8B]/30 text-[#FFFCF7] text-xs font-medium tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#C9AE8B]" />
                <span>Highland Roastery &amp; Modern Coffee Lounge</span>
              </div>
            </div>

            {/* Headline & Subtitle */}
            <div className="space-y-4">
              <div className="animate-fade-up animation-delay-300">
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#FFFCF7] leading-[1.05]">
                  Your everyday <br />
                  <span className="italic font-normal text-[#C9AE8B]">coffee escape.</span>
                </h1>
              </div>
              <div className="animate-fade-up animation-delay-500">
                <p className="text-lg sm:text-xl text-[#F5F0E7]/90 font-light leading-relaxed max-w-xl">
                  Great coffee. Cozy spaces. Moments worth slowing down for.
                </p>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="animate-fade-up animation-delay-700 flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full bg-[#C9AE8B] hover:bg-[#DECDB8] text-[#173D2B] font-semibold text-sm tracking-wider uppercase transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-95"
              >
                <span>Explore Our Menu</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/our-cafe"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-[#FFFCF7] font-semibold text-sm tracking-wider uppercase transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                <MapPin className="w-4 h-4 text-[#C9AE8B]" />
                <span>Experience The Space</span>
              </Link>
            </div>

            {/* Value Proof Badges */}
            <div className="pt-8 border-t border-[#FFFCF7]/15 grid grid-cols-3 gap-6 text-[#FFFCF7]">
              <div>
                <p className="font-serif text-2xl sm:text-3xl font-bold text-[#C9AE8B]">100%</p>
                <p className="text-[11px] sm:text-xs text-[#F5F0E7]/75 font-medium mt-0.5">
                  Single Origin &amp; Heritage Blends
                </p>
              </div>
              <div>
                <p className="font-serif text-2xl sm:text-3xl font-bold text-[#C9AE8B]">18-hr</p>
                <p className="text-[11px] sm:text-xs text-[#F5F0E7]/75 font-medium mt-0.5">
                  Slow Steeping Cold Drip
                </p>
              </div>
              <div>
                <p className="font-serif text-2xl sm:text-3xl font-bold text-[#C9AE8B]">Daily</p>
                <p className="text-[11px] sm:text-xs text-[#F5F0E7]/75 font-medium mt-0.5">
                  Fresh Honeycomb Viennoiserie
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Rotating Coffee Cup (Exact position circled by user) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <RotatingCoffeeCup />
          </div>

        </div>
      </div>
    </section>
  );
}
