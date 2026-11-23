"use client";

import { ArrowRight, MapPin, Sparkles, Calendar } from "lucide-react";

export function CafeHeroSection() {
  return (
    <section className="relative min-h-[580px] sm:min-h-[660px] lg:min-h-[720px] flex items-center justify-center overflow-hidden bg-[#173D2B]">
      {/* Full-width High-Resolution Café Interior Photograph with Slow Cinematic Zoom */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=2000&q=85"
          alt="Jhe's Cafe' Warm Walnut Interior and Botanical Lounge"
          className="w-full h-full object-cover object-center filter brightness-[0.78] contrast-[1.05] animate-cinematic-zoom"
          loading="eager"
        />
        {/* Subtle Multi-Layer Image Overlay: Forest Green + Warm Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B] via-[#173D2B]/55 to-black/35" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#173D2B]/20 to-[#173D2B]/80" />
      </div>

      {/* Hero Content Stage with Staggered Entrance Animations */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center space-y-6">
        
        {/* 1. Decorative Sanctuary Badge */}
        <div className="animate-fade-up animation-delay-100">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#173D2B]/85 backdrop-blur-md border border-[#C9AE8B]/40 text-[#FFFCF7] text-xs font-medium tracking-wider shadow-lg hover:border-[#C9AE8B] transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-[#C9AE8B]" />
            <span>HIGHLAND SANCTUARY · JHE&apos;S CAFE&apos; TAGAYTAY</span>
          </div>
        </div>

        {/* 2. Main Headline with Staggered Fade Up */}
        <div className="animate-fade-up animation-delay-300">
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-[#FFFCF7] tracking-tight leading-[1.08] drop-shadow-md">
            Step into your little escape.
          </h1>
        </div>

        {/* 3. Subtitle Fade In */}
        <div className="animate-fade-up animation-delay-500">
          <p className="text-base sm:text-xl text-[#F5F0E7]/90 max-w-2xl mx-auto font-sans leading-relaxed font-normal">
            A cozy space for coffee, conversations, and meaningful moments.
          </p>
        </div>

        {/* 4. Atmospheric Location Tag */}
        <div className="animate-fade-up animation-delay-650">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#C9AE8B] font-mono">
            <MapPin className="w-4 h-4 text-[#C9AE8B] shrink-0" />
            <span>Km 58 Tagaytay-Nasugbu Highway, Cavite</span>
          </div>
        </div>

        {/* 5. Smooth Action Buttons with Subtle Hover/Press Micro-Interactions */}
        <div className="animate-fade-up animation-delay-800 pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#reserve-table"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#C9AE8B] hover:bg-[#DECDB8] text-[#173D2B] font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Reserve a Table</span>
          </a>

          <a
            href="#seating-zones"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-[#FFFCF7] font-semibold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>Explore Seating Zones</span>
            <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
          </a>
        </div>

      </div>

      {/* Subtle Bottom Transition Arc */}
      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#FFFCF7] to-transparent pointer-events-none" />
    </section>
  );
}
