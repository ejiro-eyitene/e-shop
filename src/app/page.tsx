import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { safeCategories, safeQueryProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

const FEATURED_COUNT = 8;

export default async function HomePage() {
  const [list, categories] = await Promise.all([
    safeQueryProducts({ sort: "newest" }),
    safeCategories(),
  ]);

  const featured = list.slice(0, FEATURED_COUNT);
  const topCategories = categories.slice(0, 8);

  return (
    <div>
      <div className="hero bg-base-100 rounded-box mb-8">
        <div className="hero-content text-center py-12">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">Everything you need, delivered</h1>
            <p className="py-4 text-base-content/70">
              Phones, gadgets, home appliances and more — with secure Paystack
              checkout and instant email receipts.
            </p>
            <Link href="/products" className="btn btn-primary">
              Browse products
            </Link>
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="alert alert-info">
          <span>
            No products yet. Set <code>DATABASE_URL</code> in{" "}
            <code>.env.local</code>, then run <code>npm run db:push</code> and{" "}
            <code>npm run db:seed</code>.
          </span>
        </div>
      ) : (
        <>
          {topCategories.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-3">Shop by category</h2>
              <div className="flex flex-wrap gap-2">
                {topCategories.map((c) => (
                  <Link
                    key={c}
                    href={`/products?category=${encodeURIComponent(c)}`}
                    className="badge badge-lg badge-outline hover:badge-primary"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-2xl font-bold">Featured products</h2>
            <Link href="/products" className="link link-primary text-sm">
              View all {list.length} →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}