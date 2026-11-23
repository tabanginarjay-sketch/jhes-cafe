import Link from "next/link";
import { ArrowRight, Compass, Sun, Armchair, Coffee, Leaf } from "lucide-react";

export function OurSpaceGallery() {
  const spaces = [
    {
      title: "The Espresso Bar",
      tag: "Craft & Extraction",
      desc: "Custom fluted walnut wood counters, matte black dual grinders, and 9-bar pressure extraction.",
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
      aspect: "col-span-12 lg:col-span-7",
    },
    {
      title: "Sunlit Botanical Lounge",
      tag: "Natural Light",
      desc: "Floor-to-ceiling windows overlooking tropical greenery with upholstered sage armchairs.",
      image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80",
      aspect: "col-span-12 lg:col-span-5",
    },
    {
      title: "Communal Walnut Table",
      tag: "Community & Focus",
      desc: "Handcrafted 14-seater live-edge walnut slab beneath warm brass pendant lamps.",
      image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
      aspect: "col-span-12 lg:col-span-4",
    },
    {
      title: "Slow Pour-Over Station",
      tag: "Artisanal Method",
      desc: "Hand-poured single origins brewed over ceramic V60 drippers with temperature-regulated kettles.",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
      aspect: "col-span-12 lg:col-span-8",
    },
  ];

  const features = [
    {
      icon: Armchair,
      title: "Upholstered Comfort",
      desc: "Deep-seated lounge chairs in sage and forest hues crafted for unhurried conversations.",
    },
    {
      icon: Sun,
      title: "Natural Daylight",
      desc: "Architectural skylights and glass facades filling every corner with soft morning sun.",
    },
    {
      icon: Leaf,
      title: "Botanical Calm",
      desc: "Indoor monstera, fiddle-leaf figs, and live moss walls purifying the space.",
    },
    {
      icon: Coffee,
      title: "Acoustic Warmth",
      desc: "Slatted walnut acoustic paneling so you hear the gentle hiss of steamed milk and soft jazz.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#F5F0E7] border-y border-[#E5DACB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Intro */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
            <Compass className="w-3.5 h-3.5 text-[#C9AE8B]" />
            <span>Café Interior &amp; Architecture</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#173D2B] tracking-tight leading-[1.1]">
            A sanctuary crafted in walnut, daylight, and quiet moments.
          </h2>
          <p className="text-sm sm:text-base text-[#573B2C] leading-relaxed">
            Every corner of BREW &amp; CO. is thoughtfully curated—from the warm wood counters to the soft pendant light overhead—designed as your third place between home and work.
          </p>
        </div>

        {/* Editorial Photo Grid */}
        <div className="grid grid-cols-12 gap-6">
          {spaces.map((space) => (
            <div
              key={space.title}
              className={`group relative overflow-hidden rounded-3xl border border-[#E5DACB] shadow-sm bg-[#573B2C] ${space.aspect} min-h-[320px] lg:min-h-[400px]`}
            >
              <img
                src={space.image}
                alt={space.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 brightness-[0.88]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#173D2B]/95 via-[#173D2B]/40 to-transparent" />

              <div className="absolute inset-0 p-8 flex flex-col justify-end text-[#FFFCF7] space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9AE8B]">
                  {space.tag}
                </span>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-[#FFFCF7]">
                  {space.title}
                </h3>
                <p className="text-xs text-[#F5F0E7]/85 max-w-md leading-relaxed">
                  {space.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Architectural Features Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-[#E5DACB] bg-[#FFFCF7] p-6 space-y-3 shadow-2xs"
              >
                <div className="w-10 h-10 rounded-full bg-[#173D2B] flex items-center justify-center text-[#C9AE8B]">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-serif text-base font-semibold text-[#173D2B]">
                  {f.title}
                </h4>
                <p className="text-xs text-[#573B2C] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Space CTA */}
        <div className="text-center pt-4">
          <Link
            href="/our-cafe"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-[#FFFCF7] font-semibold text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg active:scale-98"
          >
            <span>Explore The Full Café Gallery</span>
            <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
          </Link>
        </div>

      </div>
    </section>
  );
}
