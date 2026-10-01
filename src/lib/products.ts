import { and, asc, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { dbUnavailable } from "@/lib/dbFallback";

export type Product = typeof products.$inferSelect;

export type ProductFilters = {
  q?: string;
  category?: string;
  /** Bounds are in kobo so they compare directly against price_in_kobo. */
  minInKobo?: number;
  maxInKobo?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "name";
};

const SORTS = {
  newest: desc(products.createdAt),
  "price-asc": asc(products.priceInKobo),
  "price-desc": desc(products.priceInKobo),
  name: asc(products.name),
} as const;

/**
 * Builds the WHERE clause for the catalogue filters.
 *
 * `ilike` is used so search is case-insensitive, and the wildcards are added
 * here rather than by the caller so user input can never inject them.
 */
function buildWhere(filters: ProductFilters): SQL | undefined {
  const clauses: (SQL | undefined)[] = [];

  const q = filters.q?.trim();
  if (q) {
    // Escape LIKE metacharacters so a literal % or _ doesn't widen the match.
    const safe = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${safe}%`;
    clauses.push(
      or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        ilike(products.category, pattern),
      ),
    );
  }

  if (filters.category && filters.category !== "All") {
    clauses.push(eq(products.category, filters.category));
  }

  if (typeof filters.minInKobo === "number") {
    clauses.push(gte(products.priceInKobo, filters.minInKobo));
  }

  if (typeof filters.maxInKobo === "number") {
    clauses.push(lte(products.priceInKobo, filters.maxInKobo));
  }

  const active = clauses.filter(Boolean) as SQL[];
  return active.length ? and(...active) : undefined;
}

export async function queryProducts(filters: ProductFilters = {}) {
  const where = buildWhere(filters);
  const orderBy = SORTS[filters.sort ?? "newest"];

  return db
    .select()
    .from(products)
    .where(where)
    .orderBy(orderBy);
}

/** Distinct categories for the filter dropdown, in display order. */
export async function getCategories(): Promise<string[]> {
  const rows = await db
    .select({ category: products.category })
    .from(products)
    .groupBy(products.category)
    .orderBy(asc(products.category));

  return rows.map((r) => r.category);
}

/** Cheapest and most expensive item, used to bound the price slider. */
export async function getPriceBounds() {
  // Order by the column and read it back, rather than selecting `asc(col)`
  // directly -- drizzle cannot infer a type from an ordering expression.
  const minRows = await db
    .select({ value: products.priceInKobo })
    .from(products)
    .orderBy(asc(products.priceInKobo))
    .limit(1);

  const maxRows = await db
    .select({ value: products.priceInKobo })
    .from(products)
    .orderBy(desc(products.priceInKobo))
    .limit(1);

  const min = minRows[0]?.value ?? 0;
  const max = maxRows[0]?.value ?? 0;

  return { min, max: Math.max(max, min + 100_000) };
}

/**
 * Neon's pooled URL is unavailable during static generation and in some
 * preview environments, so a DB outage degrades to an empty catalogue
 * instead of a 500.
 */
export async function safeQueryProducts(filters: ProductFilters = {}) {
  try {
    return await queryProducts(filters);
  } catch (error) {
    if (dbUnavailable(error)) {
      console.error("Product fetch failed:", error);
      return [];
    }
    throw error;
  }
}

export async function safeCategories(): Promise<string[]> {
  try {
    return await getCategories();
  } catch (error) {
    if (dbUnavailable(error)) return [];
    throw error;
  }
}

export async function safePriceBounds() {
  try {
    return await getPriceBounds();
  } catch (error) {
    if (dbUnavailable(error)) return { min: 0, max: 1_000_000 };
    throw error;
  }
}