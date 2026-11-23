import { ProductType } from "./productCustomization";

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  category_name: string;
  product_type: ProductType;
  price: number;
  origin: string;
  roast_level: string;
  tasting_notes: string;
  is_available: boolean;
  tag: string;
  image_url: string;
}

export const CENTRALIZED_CATALOG: CatalogProduct[] = [
  {
    id: "barako-romano",
    name: "Barako Espresso Romano",
    slug: "barako-espresso-romano",
    category_name: "Signature Espresso",
    product_type: "coffee",
    price: 190,
    origin: "Amadeo, Cavite",
    roast_level: "Dark French Roast",
    tasting_notes: "Heavy body, charred oak, caramelized jackfruit zest, and candied lemon twist.",
    is_available: true,
    tag: "Artisanal",
    image_url: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "spanish-latte-dulce",
    name: "Spanish Latte Dulce",
    slug: "spanish-latte-dulce",
    category_name: "Signature Espresso",
    product_type: "coffee",
    price: 220,
    origin: "Cavite Liberica Blend",
    roast_level: "Medium Dark",
    tasting_notes: "Spiced condensed milk, double ristretto, and Ceylon cinnamon bark dusting.",
    is_available: true,
    tag: "Bestseller",
    image_url: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tagaytay-cloud-coldbrew",
    name: "Tagaytay Cloud Cold Brew",
    slug: "tagaytay-cloud-coldbrew",
    category_name: "Cold Brews",
    product_type: "cold_brew",
    price: 240,
    origin: "Benguet Typica",
    roast_level: "Medium Roast",
    tasting_notes: "Dense salted vanilla cream cap, 18-hr steeped slow drip, and dark cacao finish.",
    is_available: true,
    tag: "Highland Favorite",
    image_url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "salted-honey-latte",
    name: "Salted Wild Honey Latte",
    slug: "salted-honey-latte",
    category_name: "Warm Classics",
    product_type: "coffee",
    price: 230,
    origin: "Mt. Apo Arabica",
    roast_level: "Medium Roast",
    tasting_notes: "Wild Tagaytay mountain honey, flaky sea salt froth, and steamed velvety milk.",
    is_available: true,
    tag: "Chef's Pick",
    image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "highland-uji-matcha-latte",
    name: "Highland Uji Matcha Latte",
    slug: "highland-uji-matcha-latte",
    category_name: "Warm Classics",
    product_type: "non_coffee",
    price: 220,
    origin: "Ceremonial Uji",
    roast_level: "Stone Ground",
    tasting_notes: "Ceremonial stone-ground matcha, silky steamed fresh milk, and subtle floral umami.",
    is_available: true,
    tag: "Non-Coffee Favorite",
    image_url: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "burnt-basque-cheesecake",
    name: "Burnt Basque Cheesecake",
    slug: "burnt-basque-cheesecake",
    category_name: "Artisanal Pastries",
    product_type: "cake",
    price: 280,
    origin: "In-house Bakery",
    roast_level: "Freshly Baked",
    tasting_notes: "Caramelized charred crown, molten cream cheese center, and Maldon sea salt flakes.",
    is_available: true,
    tag: "Must Try",
    image_url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "rosemary-croissant",
    name: "Rosemary Butter Croissant",
    slug: "rosemary-butter-croissant",
    category_name: "Artisanal Pastries",
    product_type: "pastry",
    price: 160,
    origin: "Normandy French Butter",
    roast_level: "European Style",
    tasting_notes: "72-layer laminated French butter pastry with garden rosemary infusion.",
    is_available: true,
    tag: "Freshly Baked",
    image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "glazed-heritage-doughnut",
    name: "Vanilla Bean Glazed Doughnut",
    slug: "glazed-heritage-doughnut",
    category_name: "Artisanal Pastries",
    product_type: "doughnut",
    price: 140,
    origin: "In-house Bakery",
    roast_level: "Daily 6:00 AM Bake",
    tasting_notes: "Pillow-soft brioche doughnut dipped in pure Madagascar vanilla bean glaze.",
    is_available: true,
    tag: "Morning Special",
    image_url: "https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=800&q=80",
  },
];

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80";

/**
 * Returns the exact, consistent image for any product across the entire application.
 * Guaranteed never to return null or undefined.
 */
export function getProductImage(product?: {
  image_url?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  slug?: string;
  id?: string;
  name?: string;
}): string {
  if (!product) return DEFAULT_FALLBACK_IMAGE;

  // 1. If explicit image is given and valid
  const directImage = product.image_url || product.image || product.imageUrl;
  if (directImage && directImage.startsWith("http")) {
    return directImage;
  }

  // 2. Lookup in centralized catalog by slug or id
  const targetKey = (product.slug || product.id || "").toLowerCase();
  const match = CENTRALIZED_CATALOG.find(
    (p) =>
      p.slug.toLowerCase() === targetKey ||
      p.id.toLowerCase() === targetKey ||
      (product.name && p.name.toLowerCase() === product.name.toLowerCase())
  );

  if (match) {
    return match.image_url;
  }

  // 3. Fallback based on name keywords
  const nameLower = (product.name || "").toLowerCase();
  if (nameLower.includes("doughnut") || nameLower.includes("donut")) {
    return "https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=800&q=80";
  }
  if (nameLower.includes("cheesecake") || nameLower.includes("cake")) {
    return "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80";
  }
  if (nameLower.includes("croissant")) {
    return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80";
  }
  if (nameLower.includes("matcha")) {
    return "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80";
  }
  if (nameLower.includes("cold brew") || nameLower.includes("coldbrew")) {
    return "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80";
  }

  return DEFAULT_FALLBACK_IMAGE;
}

/**
 * Finds a product in the centralized catalog by slug, id, or name.
 */
export function getCanonicalProduct(identifier: string): CatalogProduct | undefined {
  if (!identifier) return undefined;
  const key = identifier.toLowerCase();
  return CENTRALIZED_CATALOG.find(
    (p) => p.slug.toLowerCase() === key || p.id.toLowerCase() === key || p.name.toLowerCase() === key
  );
}
