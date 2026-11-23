import Link from "next/link";
import { ArrowRight, Flame, HeartHandshake, ShieldCheck } from "lucide-react";

export function OurStoryTeaser() {
  return (
    <section className="py-20 lg:py-28 bg-[#FFFCF7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Editorial Photography Pair */}
          <div className="lg:col-span-6 relative">
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-xl aspect-4/5 max-w-md mx-auto lg:mx-0 border border-[#E5DACB]">
              <img
                src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1000&q=80"
                alt="Slow roasting whole coffee beans"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            
            {/* Overlapping Detail Frame */}
            <div className="hidden sm:block absolute -bottom-8 -right-4 lg:right-6 z-20 w-56 rounded-2xl overflow-hidden shadow-2xl border-4 border-[#FFFCF7]">
              <img
                src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80"
                alt="Latte art extraction"
                className="w-full h-44 object-cover"
                loading="lazy"
              />
              <div className="bg-[#173D2B] p-3 text-center text-[#FFFCF7]">
                <p className="font-serif text-xs font-semibold">Small-Batch Micro Roasts</p>
                <p className="text-[10px] text-[#C9AE8B] font-mono mt-0.5">Under 15kg per drum</p>
              </div>
            </div>
          </div>

          {/* Right: Brand Story Narrative */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
              <Flame className="w-3.5 h-3.5 text-[#C9AE8B]" />
              <span>Our Coffee Philosophy</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight leading-[1.12]">
              Rooted in the highlands. Roasted with quiet reverence.
            </h2>

            <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
              Jhe&apos;s Cafe&apos; was born from a simple belief: coffee should never be a hurried commodity. It is a slow ritual that begins in the rich volcanic soil of Amadeo Cavite and the cool mist of the Benguet cordilleras.
            </p>

            <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
              We partner directly with generational highland growers, paying above fair-trade premiums so heritage coffee farming thrives. In our roastery, we roast each varietal in small batches to gently coax out floral aromatics, dark cacao notes, and honeyed finishes.
            </p>

            {/* Three Pillars */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3">
                <HeartHandshake className="w-5 h-5 text-[#315640] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    Direct Trade
                  </h4>
                  <p className="text-[11px] text-[#573B2C]">
                    100% farm-traceable harvest
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#315640] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#173D2B]">
                    Ethical Sourcing
                  </h4>
                  <p className="text-[11px] text-[#573B2C]">
                    Above market price premiums
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/our-story"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] border-b-2 border-[#173D2B] pb-1 transition-colors"
              >
                <span>Read Our Full Story</span>
                <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
