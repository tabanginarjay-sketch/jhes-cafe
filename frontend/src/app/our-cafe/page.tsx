"use client";

import { useState } from "react";
import { CafeHeroSection } from "@/components/cafe/CafeHeroSection";
import { SeatingExperienceSection } from "@/components/cafe/SeatingExperienceSection";
import { InteriorGalleryLightbox } from "@/components/cafe/InteriorGalleryLightbox";
import { TableBookingSection } from "@/components/cafe/TableBookingSection";
import { CafeDetailsMapSection } from "@/components/cafe/CafeDetailsMapSection";

export default function OurCafePage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string>("communal-walnut");

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZoneId(zoneId);
  };

  return (
    <div className="bg-[#FFFCF7] overflow-x-hidden min-h-screen flex flex-col">
      {/* 1. HERO SECTION: Full-width café interior photograph, elegant typography, subtle overlay */}
      <CafeHeroSection />

      {/* 2. SEATING EXPERIENCE: 4 visually attractive cards (Walnut Table, Botanical Lounge, Espresso Bar, Outdoor) */}
      <SeatingExperienceSection onSelectZone={handleZoneSelect} />

      {/* 3. INTERIOR GALLERY: Editorial masonry-style gallery with smooth hover & interactive Lightbox */}
      <InteriorGalleryLightbox />

      {/* 4. TABLE RESERVATIONS: Functional booking form with Auth Guard, slot validation & Airtable persistence */}
      <TableBookingSection preselectedZoneId={selectedZoneId} />

      {/* 5. CAFÉ DETAILS: Hours, location, contact, and Google Maps directions CTA */}
      <CafeDetailsMapSection />
    </div>
  );
}
