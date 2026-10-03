import { NextResponse } from "next/server";
import { safeCategories, safeQueryProducts } from "@/lib/products";

/**
 * Public catalogue API consumed by the native mobile app.
 *
 * Filters are re-parsed here rather than forwarded blindly: queryProducts
 * already escapes LIKE metacharacters, but validating the enum values first
 * means an unknown `sort` cannot fall through to an unintended ordering.
 *
 * `limit` is capped so a single request cannot pull the whole catalogue.
 */
const SORTS = ["newest", "price-asc", "price-desc", "name"] as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const sortParam = url.searchParams.get("sort") ?? undefined;
  const sort = SORTS.includes(sortParam as (typeof SORTS)[number])
    ? (sortParam as (typeof SORTS)[number])
    : undefined;

  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200)
    : 200;

  const minParam = url.searchParams.get("minInKobo");
  const maxParam = url.searchParams.get("maxInKobo");
  const min = minParam !== null ? Number(minParam) : undefined;
  const max = maxParam !== null ? Number(maxParam) : undefined;

  try {
    const [all, categories] = await Promise.all([
      safeQueryProducts({
        q,
        category,
        sort,
        minInKobo: Number.isFinite(min) ? min : undefined,
        maxInKobo: Number.isFinite(max) ? max : undefined,
      }),
      safeCategories(),
    ]);

    return NextResponse.json(
      {
        products: all.slice(0, limit).map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          priceInKobo: p.priceInKobo,
          imageUrl: p.imageUrl,
          stock: p.stock,
          category: p.category,
        })),
        // Always returned so the client can offer a filter list even when the
        // current query matched nothing.
        categories,
        total: all.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Product API failed:", error);
    return NextResponse.json(
      { error: "Could not load products." },
      { status: 500 },
    );
  }
}
