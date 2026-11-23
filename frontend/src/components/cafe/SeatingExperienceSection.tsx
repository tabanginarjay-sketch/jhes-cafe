"use client";

import { Armchair, Users } from "lucide-react";
import { ScrollReveal } from "@/components/common/ScrollReveal";

export interface SeatingZoneCard {
  id: string;
  name: string;
  tag: string;
  capacity: string;
  photo: string;
  description: string;
  features: string[];
}

export const SEATING_ZONES: SeatingZoneCard[] = [
  {
    id: "communal-walnut",
    name: "Communal Walnut Table",
    tag: "Work & Deep Focus",
    capacity: "1–6 Guests",
    photo: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
    description:
      "Handcrafted 14-seater solid live-edge walnut slab table beneath warm brass pendant lamps. Designed for quiet laptop focus, journaling, collaborative meetings, and generous morning daylight.",
    features: ["Dedicated Power Outlets", "High-Speed Wi-Fi", "Soft Pendant Lighting", "Reading Light"],
  },
  {
    id: "botanical-lounge",
    name: "Sunlit Botanical Lounge",
    tag: "Cozy & Relaxed",
    capacity: "2–4 Guests",
    photo: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80",
    description:
      "Plush sage and forest green upholstered armchairs surrounded by thriving indoor monstera, fiddle-leaf figs, and soft filtered sun. Ideal for unhurried conversations and slow afternoon sips.",
    features: ["Deep Upholstered Cushions", "Low Walnut Coffee Tables", "Acoustic Slatted Walls", "Surrounding Botanicals"],
  },
  {
    id: "espresso-bar",
    name: "Espresso & Pour-Over Bar",
    tag: "Barista Experience",
    capacity: "1–3 Guests",
    photo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    description:
      "Front-row high counter seating overlooking our custom fluted walnut bar. Watch baristas pull 9-bar ristrettos and brew single-origin V60 pour-overs while chatting about origin tasting notes.",
    features: ["Front-Row Extraction View", "Tasting Flight Service", "Barista Q&A", "Aromatics Exploration"],
  },
  {
    id: "outdoor-seating",
    name: "Outdoor Highland Balcony",
    tag: "Scenic Mountain Breeze",
    capacity: "2–6 Guests",
    photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    description:
      "Open-air wooden deck nestled against Tagaytay's cool ridge breezes. Enjoy your warm cappuccino with panoramic pine tree horizons and soft golden-hour natural light.",
    features: ["Panoramic Ridge Air", "Pet-Friendly Patio", "Covered Wooden Pergola", "Golden Hour Sunset View"],
  },
];

export function SeatingExperienceSection({
  onSelectZone,
}: {
  onSelectZone?: (zoneId: string) => void;
}) {
  return (
    <section id="seating-zones" className="py-20 lg:py-28 bg-[#FFFCF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

        {/* Section Header with Scroll Reveal */}
        <ScrollReveal direction="up" delay={0}>
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
              <Armchair className="w-3.5 h-3.5 text-[#C9AE8B]" />
              <span>Curated Spaces</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight">
              Find the seat that fits your mood.
            </h2>
            <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
              Every corner of Jhe&apos;s Cafe&apos; has been acoustically and aesthetically tailored for a distinct café rhythm—from solitary focus to warm gatherings.
            </p>
          </div>
        </ScrollReveal>

        {/* 4 Cards Grid with Staggered Scroll Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {SEATING_ZONES.map((zone, idx) => (
            <ScrollReveal key={zone.id} direction="up" delay={idx * 140}>
              <div className="group rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col h-full">

                {/* Card Photo Stage with Smooth Zoom Effect */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-[#573B2C]">
                  <img
                    src={zone.photo}
                    alt={zone.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-80" />

                  {/* Badge Pills */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#173D2B]/90 backdrop-blur-md text-[#C9AE8B] text-[10px] font-bold uppercase tracking-wider shadow">
                      {zone.tag}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#173D2B] text-xs font-semibold shadow">
                      <Users className="w-3.5 h-3.5 text-[#315640]" />
                      <span>{zone.capacity}</span>
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-serif text-2xl font-bold text-[#173D2B] group-hover:text-[#315640] transition-colors duration-300">
                      {zone.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#573B2C] leading-relaxed">
                      {zone.description}
                    </p>
                  </div>

                  {/* Feature Chips */}
                  <div className="space-y-4 pt-4 border-t border-[#E5DACB]">
                    <div className="flex flex-wrap gap-2">
                      {zone.features.map((feat) => (
                        <span
                          key={feat}
                          className="inline-block px-2.5 py-1 rounded-lg bg-[#F5F0E7] text-[#173D2B] text-[11px] font-medium hover:bg-[#E5DACB] transition-colors duration-200"
                        >
                          ✓ {feat}
                        </span>
                      ))}
                    </div>

                    <a
                      href="#reserve-table"
                      onClick={() => onSelectZone && onSelectZone(zone.id)}
                      className="inline-flex items-center justify-center w-full py-3 rounded-full bg-[#F5F0E7] hover:bg-[#173D2B] text-[#173D2B] hover:text-white text-xs font-semibold uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-xs hover:shadow-md"
                    >
                      <span>Reserve in this Area →</span>
                    </a>
                  </div>
                </div>

              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
