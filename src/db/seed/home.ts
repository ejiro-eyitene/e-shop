import type { DemoProduct } from "./types";

/** Bedding, furniture and cookware. */
export const homeProducts: DemoProduct[] = [
  {
    slug: "memory-foam-pillow",
    name: "Memory Foam Bed Pillow",
    description:
      "Slow-rebound memory foam with a breathable cotton cover. Supports side, back and stomach sleepers.",
    priceInKobo: 1_250_000,
    stock: 38,
    category: "Home & Living",
    imageUrl:
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80",
  },
  {
    slug: "queen-size-mattress",
    name: "Queen Size Hybrid Mattress",
    description:
      "Memory foam and pocket spring layers with a quilted euro top. 2 year warranty.",
    priceInKobo: 11_500_000,
    stock: 7,
    category: "Home & Living",
    imageUrl:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
  },
  {
    slug: "chef-cookware-set",
    name: "Non-Stick Chef Cookware Set (8 pieces)",
    description:
      "Granite-coated pots and pans with heat-resistant handles and tempered glass lids.",
    priceInKobo: 4_800_000,
    stock: 11,
    category: "Home & Living",
    imageUrl:
      "https://images.unsplash.com/photo-1584990347449-a2d4c2c9ee4e?w=800&q=80",
  },
  {
    slug: "woven-storage-basket",
    name: "Woven Storage Basket (Set of 3)",
    description:
      "Hand-woven seagrass baskets with lined interiors for tidying shelves and bedrooms.",
    priceInKobo: 1_650_000,
    stock: 22,
    category: "Home & Living",
    imageUrl:
      "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80",
  },
];