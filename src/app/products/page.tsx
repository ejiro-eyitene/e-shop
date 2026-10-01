import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFilters } from "@/components/product/ProductFilters";
import {
  safeCategories,
  safePriceBounds,
  safeQueryProducts,
} from "@/lib/products";
import { naira } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const SORT_VALUES = ["newest", "price-asc", "price-desc", "name"] as const;
type SortValue = (typeof SORT_VALUES)[number];

/** Parses a naira input into kobo. Returns undefined for junk so it is ignored. */
function parseNairaToKobo(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const nairaValue = Number(raw);
  if (!Number.isFinite(nairaValue) || nairaValue < 0) return undefined;
  return Math.round(nairaValue * 100);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    min?: string;
    max?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;

  const q = params.q ?? "";
  const category = params.category ?? "All";
  const sort: SortValue = SORT_VALUES.includes(params.sort as SortValue)
    ? (params.sort as SortValue)
    : "newest";

  const minInKobo = parseNairaToKobo(params.min);
  const maxInKobo = parseNairaToKobo(params.max);

  const [categories, priceBounds, list] = await Promise.all([
    safeCategories(),
    safePriceBounds(),
    safeQueryProducts({ q, category, minInKobo, maxInKobo, sort }),
  ]);

  const filtering = Boolean(q) || category !== "All" || minInKobo !== undefined || maxInKobo !== undefined;

  return (
    <div>
      <nav className="breadcrumbs text-sm mb-2">
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>All products</li>
        </ul>
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h1 className="text-3xl font-bold">
          {filtering ? "Search results" : "All products"}
        </h1>
        <p className="text-sm text-base-content/60">
          {list.length} {list.length === 1 ? "product" : "products"}
        </p>
      </div>

      <ProductFilters
        values={{ q, category, min: params.min ?? "", max: params.max ?? "", sort }}
        categories={categories}
        priceBounds={priceBounds}
      />

      {list.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="text-xl font-bold mb-2">No products matched</h2>
          <p className="text-base-content/60 mb-6">
            {filtering
              ? "Try a different search term or widen the price range."
              : "The catalogue is empty. Run npm run db:seed to load products."}
          </p>
          {filtering && (
            <Link href="/products" className="btn btn-primary">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {list.length > 0 && sort === "price-asc" && (
        <p className="mt-8 text-xs text-base-content/40">
          Cheapest shown: {naira(list[0]!.priceInKobo)}
        </p>
      )}
    </div>
  );
}