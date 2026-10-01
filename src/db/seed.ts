/**
 * Seeds the catalogue with demo products.
 * Run with: npm run db:seed
 *
 * Prices are stored in KOBO (₦1 = 100 kobo) to match Paystack's minor unit,
 * which avoids floating-point rounding on money.
 */
import { sql } from "drizzle-orm";
import { db } from "./index";
import { products } from "./schema";
import { techProducts } from "./seed/tech";
import { applianceProducts } from "./seed/appliances";
import { gadgetProducts } from "./seed/gadgets";
import { lifestyleProducts } from "./seed/lifestyle";
import { homeProducts } from "./seed/home";
import type { DemoProduct } from "./seed/types";

const demo: DemoProduct[] = [
  ...techProducts,
  ...applianceProducts,
  ...gadgetProducts,
  ...lifestyleProducts,
  ...homeProducts,
];

async function main() {
  console.log(`Seeding ${demo.length} products…`);

  // Guard against duplicate slugs, which would otherwise throw on the
  // unique index mid-seed and leave the catalogue half-populated.
  const seen = new Set<string>();
  for (const product of demo) {
    if (seen.has(product.slug)) {
      throw new Error(`Duplicate slug in seed data: ${product.slug}`);
    }
    seen.add(product.slug);
  }

  for (const product of demo) {
    await db
      .insert(products)
      .values(product)
      .onConflictDoUpdate({
        // Re-running the seed refreshes the row instead of failing.
        target: products.slug,
        set: {
          name: product.name,
          description: product.description,
          priceInKobo: product.priceInKobo,
          stock: product.stock,
          category: product.category,
          imageUrl: product.imageUrl,
        },
      });
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const categories = await db
    .select({ category: products.category })
    .from(products)
    .groupBy(products.category)
    .orderBy(products.category);

  console.log(`Done. ${count} products across ${categories.length} categories:`);
  for (const c of categories) console.log(`  - ${c.category}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });