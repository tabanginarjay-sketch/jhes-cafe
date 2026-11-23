import { OurSpaceGallery } from "@/components/home/OurSpaceGallery";
import { TableBookingSection } from "@/components/cafe/TableBookingSection";

export default function OurCafePage() {
  return (
    <div className="bg-[#FFFCF7]">
      <section className="py-20 bg-[#F5F0E7] border-b border-[#E5DACB] text-center space-y-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#315640]">
          Interior &amp; Atmosphere
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#173D2B]">
          Step into our warm sanctuary.
        </h1>
        <p className="text-base text-[#573B2C] max-w-xl mx-auto leading-relaxed">
          Crafted with natural walnut wood, natural daylight, soft pendant lamps, and comfortable sage lounge chairs.
        </p>
      </section>

      <OurSpaceGallery />

      {/* Table & Space Reservation with Auth Guard */}
      <TableBookingSection />
    </div>
  );
}
