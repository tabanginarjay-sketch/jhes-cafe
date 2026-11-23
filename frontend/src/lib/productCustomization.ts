export type ProductType = "coffee" | "cold_brew" | "non_coffee" | "cake" | "doughnut" | "pastry";

export interface CustomOption {
  id: string;
  name: string;
  delta: number;
  label: string;
  sub?: string;
}

export interface SizeOption extends CustomOption {
  volume: string;
}

export interface TempOption {
  id: "Hot" | "Iced";
  name: string;
  description: string;
}

export const DRINK_SIZES: SizeOption[] = [
  { id: "tall", name: "Tall 12oz", volume: "355 ml", delta: -20, label: "-₱20" },
  { id: "grande", name: "Grande 16oz", volume: "473 ml", delta: 0, label: "Standard" },
  { id: "venti", name: "Venti 20oz", volume: "591 ml", delta: 30, label: "+₱30" },
];

export const COLD_BREW_SIZES: SizeOption[] = [
  { id: "grande", name: "Grande 16oz", volume: "473 ml", delta: 0, label: "Standard" },
  { id: "venti", name: "Venti 20oz", volume: "591 ml", delta: 30, label: "+₱30" },
];

export const DRINK_TEMPERATURES: TempOption[] = [
  { id: "Hot", name: "Hot Steamed", description: "Velvety microfoam at 65°C" },
  { id: "Iced", name: "Highland Iced", description: "Poured over crystal mountain ice" },
];

export const DRINK_MILKS: CustomOption[] = [
  { id: "whole", name: "Whole Milk", sub: "Fresh Whole Dairy Milk", delta: 0, label: "Included" },
  { id: "skim", name: "Skim Milk", sub: "Light & Crisp Non-Fat Milk", delta: 0, label: "Included" },
  { id: "oat", name: "Barista Oat Milk", sub: "Organic Oat, Naturally Sweet", delta: 40, label: "+₱40" },
  { id: "soy", name: "Soy Milk", sub: "Silky Smooth Plant Protein", delta: 40, label: "+₱40" },
  { id: "almond", name: "Roasted Almond Milk", sub: "Nutty Roasted Profile", delta: 40, label: "+₱40" },
];

export const SWEETNESS_PRESETS = [
  { level: 0, label: "0% Unsweetened" },
  { level: 25, label: "25% Subtle" },
  { level: 50, label: "50% Balanced" },
  { level: 75, label: "75% Sweet" },
  { level: 100, label: "100% Extra Sweet" },
];

export const EXTRA_SHOTS: CustomOption[] = [
  { id: "shot-0", name: "Standard 2 Shots", delta: 0, label: "Included" },
  { id: "shot-1", name: "+1 Extra Shot", delta: 45, label: "+₱45" },
  { id: "shot-2", name: "+2 Extra Shots", delta: 85, label: "+₱85" },
];

export const DRINK_TOPPINGS: CustomOption[] = [
  { id: "cold-foam", name: "Sea Salt Cold Foam", delta: 45, label: "+₱45" },
  { id: "vanilla-drizzle", name: "Madagascar Vanilla Drizzle", delta: 35, label: "+₱35" },
  { id: "caramel-crunch", name: "Brown Sugar Caramel Crunch", delta: 35, label: "+₱35" },
  { id: "ceylon-cinnamon", name: "Ceylon Cinnamon Dusting", delta: 0, label: "Complimentary" },
];

// CAKE (Cheesecake) Specific Configuration
export const CAKE_SERVING_OPTIONS = [
  { id: "chilled", name: "Chilled Flagship Style", description: "Served at cold cellar temp with velvety molten center" },
  { id: "room-temp", name: "Room Temperature", description: "Soft, rich, and decadent texture" },
];

export const CAKE_FINISHES: CustomOption[] = [
  { id: "maldon-salt", name: "Maldon Sea Salt Flakes", delta: 0, label: "Included" },
  { id: "berry-compote", name: "Tagaytay Strawberry Compote", delta: 35, label: "+₱35" },
  { id: "cacao-drizzle", name: "Belgian Dark Cacao Drizzle", delta: 30, label: "+₱30" },
];

// DOUGHNUT Specific Configuration
export const DOUGHNUT_GLAZES: CustomOption[] = [
  { id: "vanilla-glaze", name: "Vanilla Bean Glaze", delta: 0, label: "Standard" },
  { id: "cinnamon-sugar", name: "Ceylon Cinnamon Sugar Dust", delta: 0, label: "Complimentary" },
  { id: "dark-cacao-dip", name: "Dark Cacao Ganache Dip", delta: 25, label: "+₱25" },
  { id: "toasted-almonds", name: "Toasted Highland Almonds", delta: 25, label: "+₱25" },
];

// PASTRY (Croissant) Specific Configuration
export const PASTRY_WARMING_OPTIONS = [
  { id: "warm", name: "Warm & Lightly Toasted", description: "Freshly warmed in stone deck oven" },
  { id: "fresh", name: "Room Temperature / Fresh", description: "Original 72-layer honeycomb flaky crunch" },
];

export const PASTRY_ADDONS: CustomOption[] = [
  { id: "french-butter", name: "Whipped French Butter", delta: 25, label: "+₱25" },
  { id: "wild-honey", name: "Wild Tagaytay Honey Dip", delta: 30, label: "+₱30" },
  { id: "cacao-dip", name: "Dark Cacao Chocolate Dip", delta: 35, label: "+₱35" },
];

export interface ProductCustomizationRules {
  productType: ProductType;
  allowsSize: boolean;
  supportedSizes: SizeOption[];
  allowsTemperature: boolean;
  supportedTemperatures: TempOption[];
  defaultTemperature?: "Hot" | "Iced";
  allowsMilk: boolean;
  supportedMilks: CustomOption[];
  allowsSweetness: boolean;
  allowsExtraShots: boolean;
  allowsDrinkToppings: boolean;
  supportedDrinkToppings: CustomOption[];
  allowsCakeOptions: boolean;
  allowsDoughnutOptions: boolean;
  allowsPastryOptions: boolean;
  categoryLabel: string;
}

/**
 * Resolves the product type strictly and deterministically based on product fields.
 */
export function getProductType(product: {
  name?: string;
  category_name?: string;
  category?: string;
  product_type?: string;
}): ProductType {
  if (product.product_type) {
    const pt = product.product_type.toLowerCase();
    if (["coffee", "cold_brew", "non_coffee", "cake", "doughnut", "pastry"].includes(pt)) {
      return pt as ProductType;
    }
  }

  const name = (product.name || "").toLowerCase();
  const category = (product.category_name || product.category || "").toLowerCase();

  // Doughnut check (Rule: Doughnuts must NEVER show sugar level or hot/iced)
  if (name.includes("doughnut") || name.includes("donut") || category.includes("doughnut")) {
    return "doughnut";
  }

  // Cake check (Rule: Cheesecake must NEVER show cup sizes or milk preferences)
  if (name.includes("cheesecake") || name.includes("cake") || category.includes("cake")) {
    return "cake";
  }

  // Cold Brew check (Cold brews must NEVER allow Hot steamed)
  if (name.includes("cold brew") || name.includes("coldbrew") || category.includes("cold brew")) {
    return "cold_brew";
  }

  // Non-coffee check (Matcha, Chocolate, Tea do not take espresso shots)
  if (name.includes("matcha") || name.includes("chocolate") || name.includes("tea") || category.includes("tea")) {
    return "non_coffee";
  }

  // Pastry check
  if (
    name.includes("croissant") ||
    name.includes("bread") ||
    name.includes("pastry") ||
    category.includes("pastr") ||
    category.includes("bake")
  ) {
    return "pastry";
  }

  // Default to espresso coffee
  return "coffee";
}

/**
 * Returns the exact configuration of customization rules for a given product.
 */
export function getProductCustomizationRules(product: {
  name?: string;
  category_name?: string;
  category?: string;
  product_type?: string;
}): ProductCustomizationRules {
  const productType = getProductType(product);

  switch (productType) {
    case "coffee":
      return {
        productType,
        allowsSize: true,
        supportedSizes: DRINK_SIZES,
        allowsTemperature: true,
        supportedTemperatures: DRINK_TEMPERATURES,
        defaultTemperature: "Hot",
        allowsMilk: true,
        supportedMilks: DRINK_MILKS,
        allowsSweetness: true,
        allowsExtraShots: true,
        allowsDrinkToppings: true,
        supportedDrinkToppings: DRINK_TOPPINGS,
        allowsCakeOptions: false,
        allowsDoughnutOptions: false,
        allowsPastryOptions: false,
        categoryLabel: "Signature Espresso",
      };

    case "cold_brew":
      return {
        productType,
        allowsSize: true,
        supportedSizes: COLD_BREW_SIZES,
        allowsTemperature: false, // Locked to Iced only!
        supportedTemperatures: [{ id: "Iced", name: "Highland Iced", description: "18-hr slow-steeped over crystal ice" }],
        defaultTemperature: "Iced",
        allowsMilk: true,
        supportedMilks: DRINK_MILKS,
        allowsSweetness: true,
        allowsExtraShots: false, // No extra hot shots in cold brew
        allowsDrinkToppings: true,
        supportedDrinkToppings: DRINK_TOPPINGS,
        allowsCakeOptions: false,
        allowsDoughnutOptions: false,
        allowsPastryOptions: false,
        categoryLabel: "Cold Brew Craft",
      };

    case "non_coffee":
      return {
        productType,
        allowsSize: true,
        supportedSizes: DRINK_SIZES,
        allowsTemperature: true,
        supportedTemperatures: DRINK_TEMPERATURES,
        defaultTemperature: "Hot",
        allowsMilk: true,
        supportedMilks: DRINK_MILKS,
        allowsSweetness: true,
        allowsExtraShots: false, // Non-coffee drinks NEVER show extra espresso shots
        allowsDrinkToppings: true,
        supportedDrinkToppings: DRINK_TOPPINGS,
        allowsCakeOptions: false,
        allowsDoughnutOptions: false,
        allowsPastryOptions: false,
        categoryLabel: "Artisanal Warm Classics",
      };

    case "cake":
      return {
        productType,
        allowsSize: false,
        supportedSizes: [],
        allowsTemperature: false,
        supportedTemperatures: [],
        allowsMilk: false,
        supportedMilks: [],
        allowsSweetness: false,
        allowsExtraShots: false,
        allowsDrinkToppings: false,
        supportedDrinkToppings: [],
        allowsCakeOptions: true,
        allowsDoughnutOptions: false,
        allowsPastryOptions: false,
        categoryLabel: "Highland Reserve Patisserie",
      };

    case "doughnut":
      return {
        productType,
        allowsSize: false,
        supportedSizes: [],
        allowsTemperature: false,
        supportedTemperatures: [],
        allowsMilk: false,
        supportedMilks: [],
        allowsSweetness: false, // Doughnuts NEVER show sweetness slider
        allowsExtraShots: false,
        allowsDrinkToppings: false,
        supportedDrinkToppings: [],
        allowsCakeOptions: false,
        allowsDoughnutOptions: true,
        allowsPastryOptions: false,
        categoryLabel: "Handcrafted Bakery",
      };

    case "pastry":
    default:
      return {
        productType: "pastry",
        allowsSize: false,
        supportedSizes: [],
        allowsTemperature: false,
        supportedTemperatures: [],
        allowsMilk: false,
        supportedMilks: [],
        allowsSweetness: false,
        allowsExtraShots: false,
        allowsDrinkToppings: false,
        supportedDrinkToppings: [],
        allowsCakeOptions: false,
        allowsDoughnutOptions: false,
        allowsPastryOptions: true,
        categoryLabel: "Oven-Fresh Viennoiserie",
      };
  }
}
