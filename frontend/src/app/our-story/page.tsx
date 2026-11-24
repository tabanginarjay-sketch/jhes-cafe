import { OurStoryTeaser } from "@/components/home/OurStoryTeaser";
import { Coffee, ShieldCheck, HeartHandshake, Compass } from "lucide-react";

export default function OurStoryPage() {
  return (
    <div className="bg-[#FFFCF7]">
      {/* Editorial Header */}
      <section className="py-20 lg:py-28 bg-[#F5F0E7] border-b border-[#E5DACB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#315640]">
            The Jhe&apos;s Cafe&apos; Story · Brand Concept Showcase
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#173D2B] tracking-tight">
            Coffee born from mist, volcanic soil, and human care.
          </h1>
          <p className="text-base sm:text-lg text-[#573B2C] max-w-2xl mx-auto leading-relaxed">
            We exist to celebrate the craft of slow mountain coffee and the generational farmers who nurture every harvest.
          </p>
        </div>
      </section>

      {/* Main Narrative */}
      <OurStoryTeaser hideStoryLink />

      {/* Roasting Standards */}
      <section className="py-20 bg-[#FFFCF7] border-t border-[#E5DACB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-8 space-y-4">
            <Coffee className="w-8 h-8 text-[#173D2B]" />
            <h3 className="font-serif text-xl font-bold text-[#173D2B]">Micro-Batch Drum Roasting</h3>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Every bean batch is roasted under 15kg in our cast-iron drum roasters to precisely develop complex aromatics without bitter scorching.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-8 space-y-4">
            <HeartHandshake className="w-8 h-8 text-[#173D2B]" />
            <h3 className="font-serif text-xl font-bold text-[#173D2B]">Generational Direct Trade</h3>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              We eliminate middlemen and work hand-in-hand with farm cooperatives in Benguet and Amadeo, funding regenerative soil programs.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7]/60 p-8 space-y-4">
            <Compass className="w-8 h-8 text-[#173D2B]" />
            <h3 className="font-serif text-xl font-bold text-[#173D2B]">The Third Place Philosophy</h3>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Our coffee shops are designed as quiet, sunlit havens where people pause, reflect, converse, and reconnect.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
