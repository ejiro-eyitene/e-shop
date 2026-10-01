import type { DemoProduct } from "./types";

/** Phones, tablets, wearables, laptops and computer accessories. */
export const techProducts: DemoProduct[] = [
  {
    slug: "samsung-galaxy-a55-128gb",
    name: "Samsung Galaxy A55 5G (128GB, 8GB RAM)",
    description:
      '6.6" Super AMOLED 120Hz display, 50MP triple camera and a 5000mAh battery with 25W fast charging.',
    priceInKobo: 6_250_000,
    stock: 18,
    category: "Phones & Tablets",
    imageUrl:
      "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
  },
  {
    slug: "iphone-13-128gb",
    name: "Apple iPhone 13 (128GB)",
    description:
      '6.1" Super Retina XDR display, dual 12MP camera system and up to 19 hours of video playback.',
    priceInKobo: 42_500_000,
    stock: 6,
    category: "Phones & Tablets",
    imageUrl:
      "https://images.unsplash.com/photo-1603893349310-60d1b30695c1?w=800&q=80",
  },
  {
    slug: "tecno-spark-30-pro",
    name: "Tecno Spark 30 Pro (256GB)",
    description:
      '6.78" AMOLED 120Hz display, 108MP camera and 5000mAh battery. Excellent value for money.',
    priceInKobo: 3_100_000,
    stock: 25,
    category: "Phones & Tablets",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
  },
  {
    slug: "infinix-hot-60i",
    name: "Infinix Hot 60i (128GB)",
    description:
      "Budget-friendly smartphone with a 90Hz display, 50MP camera and all-day battery life.",
    priceInKobo: 1_450_000,
    stock: 40,
    category: "Phones & Tablets",
    imageUrl:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
  },
  {
    slug: "ipad-air-m2-11",
    name: 'Apple iPad Air 11" (M2, 128GB)',
    description:
      "Powerful M2 chip, 11-inch Liquid Retina display and Apple Pencil support. Great for work and study.",
    priceInKobo: 48_000_000,
    stock: 4,
    category: "Phones & Tablets",
    imageUrl:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
  },
  {
    slug: "samsung-galaxy-watch6",
    name: "Samsung Galaxy Watch6 Classic (46mm)",
    description:
      "AMOLED display, body composition analysis, built-in GPS and 40-hour battery life.",
    priceInKobo: 3_450_000,
    stock: 12,
    category: "Watches & Wearables",
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
  },
  {
    slug: "macbook-air-m3-13",
    name: 'Apple MacBook Air 13" (M3, 8GB/256GB)',
    description:
      "Apple M3 chip, 18-hour battery life and a fanless design in a 1.24kg aluminium body.",
    priceInKobo: 78_500_000,
    stock: 5,
    category: "Laptops & Computers",
    imageUrl:
      "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=800&q=80",
  },
  {
    slug: "hp-pavilion-15-laptop",
    name: "HP Pavilion 15 Laptop (16GB/512GB)",
    description:
      '15.6" Full HD display, AMD Ryzen 7 processor, 16GB RAM and a 512GB SSD for everyday performance.',
    priceInKobo: 21_900_000,
    stock: 9,
    category: "Laptops & Computers",
    imageUrl:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
  },
  {
    slug: "logitech-mx-keys-keyboard",
    name: "Logitech MX Keys Keyboard",
    description:
      "Low-profile wireless keyboard with smart backlighting and multi-device Bluetooth pairing.",
    priceInKobo: 4_250_000,
    stock: 22,
    category: "Computer Accessories",
    imageUrl:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80",
  },
  {
    slug: "logitech-mx-master-3s",
    name: "Logitech MX Master 3S Mouse",
    description:
      "Quiet clicks, 8000 DPI tracking and a MagSpeed wheel. The definitive productivity mouse.",
    priceInKobo: 3_150_000,
    stock: 30,
    category: "Computer Accessories",
    imageUrl:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
  },
  {
    slug: "seagate-external-ssd-1tb",
    name: "Seagate Expansion SSD 1TB",
    description:
      "Portable solid-state drive with 1050MB/s read speeds. USB-C, shock resistant and compact.",
    priceInKobo: 5_400_000,
    stock: 17,
    category: "Computer Accessories",
    imageUrl:
      "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=800&q=80",
  },
];