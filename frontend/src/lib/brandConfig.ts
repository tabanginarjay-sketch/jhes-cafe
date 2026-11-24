/**
 * Centralized official brand & portfolio demonstration metadata for Jhe's Cafe'.
 * All public and admin views import from this single source of truth so hours,
 * addresses, contact emails, and demo notices never drift or conflict.
 */

export const BRAND_CONFIG = {
  name: "Jhe's Cafe'",
  legalName: "Jhe's Cafe' Specialty Coffee Roasters",
  tagline: "Your everyday coffee escape.",
  orderPrefix: "JHE-",
  isPortfolioDemo: true,
  demoBadge: "Portfolio Demo Concept",
  demoDisclaimer:
    "Portfolio demonstration project — branch address, phone numbers, promotions, and story copy are fictional showcase details.",
  location: {
    shortAddress: "Km 58 Tagaytay-Nasugbu Highway, Cavite",
    fullAddress: "Km 58 Tagaytay-Nasugbu Highway, Cavite, Philippines",
    googleMapsSearchUrl:
      "https://www.google.com/maps/search/?api=1&query=Km+58+Tagaytay-Nasugbu+Highway+Cavite+Philippines",
    googleMapsEmbedUrl:
      "https://maps.google.com/maps?q=Km%2058%20Tagaytay-Nasugbu%20Highway,%20Cavite,%20Philippines&t=&z=15&ie=UTF8&iwloc=&output=embed",
  },
  hours: {
    weekdaysLabel: "Mon – Fri: 6:30 AM – 10:00 PM",
    weekendsLabel: "Sat – Sun: 6:00 AM – 11:00 PM",
    compactLabel: "Mon–Fri 6:30 AM – 10:00 PM · Sat–Sun 6:00 AM – 11:00 PM",
  },
  contact: {
    email: "hello@jhescafe.ph",
    conciergeEmail: "concierge@jhescafe.ph",
    phoneDisplay: "+63 917 892 4110 / (046) 413 8820",
  },
  promo: {
    code: "FIRSTSIP15",
    discountRate: 0.15,
    description: "15% off demo promo code",
  },
} as const;
