"use client";

import { useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { BestSellers } from "@/components/home/BestSellers";
import { OurSpaceGallery } from "@/components/home/OurSpaceGallery";
import { HomeCustomizer } from "@/components/home/HomeCustomizer";
import { OurStoryTeaser } from "@/components/home/OurStoryTeaser";
import { FindUsSection } from "@/components/home/FindUsSection";
import { HealthStatusCard } from "@/components/HealthStatusCard";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";

export default function Home() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <main className="flex-1 flex flex-col bg-[#FFFCF7]">
      {/* 1. Cinematic Hero Section */}
      <HeroSection />

      {/* 2. Best Sellers & Seasonal Reserve Menu */}
      <BestSellers />

      {/* 3. Our Space & Café Interior Editorial Gallery */}
      <OurSpaceGallery />

      {/* 4. Interactive Craft Customizer */}
      <HomeCustomizer />

      {/* 5. Our Story & Coffee Roasting Heritage */}
      <OurStoryTeaser />

      {/* 6. Flagship Roastery Location & Hours */}
      <FindUsSection />

      {/* 7. Foundation Diagnostics & Live Backend Health (Collapsible) */}
      <section className="bg-[#F5F0E7] border-t border-[#E5DACB] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#173D2B]">
                Jhe&apos;s Cafe&apos; Architecture &amp; Database Status
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#573B2C] hover:text-[#173D2B] transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#315640]" />
              <span>{showDiagnostics ? "Hide Diagnostics" : "Inspect Backend & Airtable"}</span>
              {showDiagnostics ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showDiagnostics && (
            <div className="mt-6 pt-6 border-t border-[#E5DACB] animate-slide-down">
              <HealthStatusCard />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
