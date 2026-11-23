"use client";

import { useState, useEffect } from "react";
import { Camera, X, Maximize2, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/common/ScrollReveal";

interface GalleryPhoto {
  id: string;
  title: string;
  tag: string;
  desc: string;
  imageUrl: string;
  aspect: string; // Tailwind grid layout span
}

const GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: "bar-1",
    title: "The Manual Espresso Bar",
    tag: "9-Bar Extraction",
    desc: "Custom fluted walnut wood counters, matte black dual-hopper grinders, and manual extraction levers.",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=85",
    aspect: "col-span-12 md:col-span-8 h-80 sm:h-96",
  },
  {
    id: "latte-art",
    title: "Hand-Poured Heart Latte Art",
    tag: "Craft & Detail",
    desc: "Velvety micro-foam steamed to precisely 65°C, poured with delicate rosetta and heart patterns.",
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=85",
    aspect: "col-span-12 md:col-span-4 h-80 sm:h-96",
  },
  {
    id: "communal-1",
    title: "Handcrafted Live-Edge Walnut Slab",
    tag: "Community Space",
    desc: "Handcrafted 14-seater solid live-edge walnut slab table beneath warm brass pendant lamps.",
    imageUrl: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=85",
    aspect: "col-span-12 sm:col-span-6 md:col-span-4 h-72 sm:h-88",
  },
  {
    id: "botanical-1",
    title: "Sunlit Botanical Corner",
    tag: "Natural Light",
    desc: "Floor-to-ceiling glass looking out onto Cavite mist, softened with indoor fiddle-leaf and monstera plants.",
    imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=85",
    aspect: "col-span-12 sm:col-span-6 md:col-span-4 h-72 sm:h-88",
  },
  {
    id: "pourover-1",
    title: "V60 Slow Drip Station",
    tag: "Artisanal Brew",
    desc: "Slow-poured single origins with controlled flow kettles and ceramic drippers to highlight high-elevation sweetness.",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
    aspect: "col-span-12 md:col-span-4 h-72 sm:h-88",
  },
  {
    id: "pastry-1",
    title: "Freshly Baked In-House Viennoiserie",
    tag: "Bakery Pairing",
    desc: "72-layer European butter croissants and Burnt Basque Cheesecakes freshly pulled from our morning ovens.",
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1400&q=85",
    aspect: "col-span-12 md:col-span-12 h-64 sm:h-80",
  },
];

export function InteriorGalleryLightbox() {
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePhoto(null);
    };
    if (activePhoto) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [activePhoto]);

  return (
    <section className="py-20 lg:py-28 bg-[#F5F0E7] border-y border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header with Scroll Reveal */}
        <ScrollReveal direction="up" delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
                <Camera className="w-3.5 h-3.5 text-[#C9AE8B]" />
                <span>Café Atmosphere &amp; Details</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight">
                An editorial look inside Jhe&apos;s Cafe&apos;.
              </h2>
              <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
                Click any photo to open the high-resolution lightbox viewer and explore our architectural details.
              </p>
            </div>

            <span className="text-xs font-mono text-[#573B2C] shrink-0">
              {GALLERY_PHOTOS.length} Photography Exhibits
            </span>
          </div>
        </ScrollReveal>

        {/* Editorial Masonry Grid with Staggered Entrance */}
        <div className="grid grid-cols-12 gap-5 sm:gap-6">
          {GALLERY_PHOTOS.map((photo, idx) => (
            <div
              key={photo.id}
              className={`${photo.aspect} relative`}
            >
              <ScrollReveal direction="up" delay={(idx % 3) * 120} className="w-full h-full">
                <div
                  onClick={() => setActivePhoto(photo)}
                  className="group relative w-full h-full overflow-hidden rounded-3xl border border-[#E5DACB] shadow-sm bg-[#173D2B] cursor-pointer hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108 brightness-[0.88] group-hover:brightness-95"
                    loading="lazy"
                  />
                  
                  {/* Subtle Dark Gradient Sheen */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B]/95 via-[#173D2B]/35 to-transparent transition-opacity duration-500 group-hover:opacity-85 pointer-events-none" />

                  {/* Smooth Hover Expand Badge */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <span className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-[#C9AE8B] flex items-center justify-center shadow-lg border border-white/10">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>

                  {/* Caption Overlay with Smooth Upward Shift on Hover */}
                  <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-[#FFFCF7] space-y-1.5 pointer-events-none transform transition-transform duration-500 group-hover:-translate-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9AE8B]">
                      {photo.tag}
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#FFFCF7] leading-tight">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-[#F5F0E7]/80 max-w-lg leading-relaxed line-clamp-2">
                      {photo.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          ))}
        </div>

      </div>

      {/* Interactive Lightbox Modal with Smooth Scale-In & Fade */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#173D2B] rounded-3xl overflow-hidden border border-[#C9AE8B]/30 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button with Smooth Rotation on Hover */}
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-[#FFFCF7] flex items-center justify-center transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
              aria-label="Close Lightbox"
            >
              <X className="w-5 h-5" />
            </button>

            {/* High-Res Image View */}
            <div className="relative h-[420px] sm:h-[520px] w-full bg-black overflow-hidden">
              <img
                src={activePhoto.imageUrl}
                alt={activePhoto.title}
                className="w-full h-full object-cover object-center transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B] via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Caption & Metadata Footer */}
            <div className="p-6 sm:p-8 bg-[#173D2B] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9AE8B]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9AE8B]">
                    {activePhoto.tag}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#FFFCF7]">
                  {activePhoto.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#F5F0E7]/80 leading-relaxed max-w-xl">
                  {activePhoto.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="px-6 py-2.5 rounded-full border border-[#C9AE8B] text-[#C9AE8B] hover:bg-[#C9AE8B] hover:text-[#173D2B] text-xs font-semibold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
