import Link from "next/link";

/**
 * Catalogue filters.
 *
 * This is a plain GET form rather than a client component so that searching
 * works with JavaScript disabled, results are shareable/bookmarkable URLs, and
 * filtering happens on the server instead of shipping the whole catalogue to
 * the browser.
 */
export type FilterValues = {
  q: string;
  category: string;
  min: string;
  max: string;
  sort: string;
};

export function ProductFilters({
  values,
  categories,
  priceBounds,
}: {
  values: FilterValues;
  categories: string[];
  priceBounds: { min: number; max: number };
}) {
  const hasActiveFilters =
    values.q !== "" ||
    values.category !== "All" ||
    values.min !== "" ||
    values.max !== "";

  return (
    <form
      method="get"
      action="/products"
      className="card bg-base-100 shadow-sm mb-6"
    >
      <div className="card-body gap-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {/* Search */}
          <fieldset className="fieldset flex-1">
            <legend className="fieldset-legend">Search products</legend>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={values.q}
                placeholder="Search phones, laptops, appliances…"
                className="grow"
                aria-label="Search products"
              />
            </label>
          </fieldset>

          {/* Category */}
          <fieldset className="fieldset lg:w-52">
            <legend className="fieldset-legend">Category</legend>
            <select
              name="category"
              defaultValue={values.category}
              className="select select-bordered w-full"
              aria-label="Filter by category"
            >
              <option value="All">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Sort */}
          <fieldset className="fieldset lg:w-48">
            <legend className="fieldset-legend">Sort by</legend>
            <select
              name="sort"
              defaultValue={values.sort}
              className="select select-bordered w-full"
              aria-label="Sort products"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </fieldset>
        </div>

        {/* Price range */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Price range</legend>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="input input-bordered flex items-center gap-2 w-full">
                <span className="text-sm text-base-content/60">₦</span>
                <input
                  type="number"
                  name="min"
                  min={0}
                  step={1000}
                  defaultValue={values.min}
                  placeholder="Min"
                  className="grow"
                  aria-label="Minimum price in naira"
                />
              </label>
            </div>

            <span className="hidden sm:block pb-3 text-base-content/40">—</span>

            <div className="flex-1">
              <label className="input input-bordered flex items-center gap-2 w-full">
                <span className="text-sm text-base-content/60">₦</span>
                <input
                  type="number"
                  name="max"
                  min={0}
                  step={1000}
                  defaultValue={values.max}
                  placeholder="Max"
                  className="grow"
                  aria-label="Maximum price in naira"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Apply
              </button>
              {hasActiveFilters && (
                <Link href="/products" className="btn btn-ghost">
                  Clear
                </Link>
              )}
            </div>
          </div>

          <p className="label">
            Catalogue range: ₦
            {(priceBounds.min / 100).toLocaleString("en-NG")} – ₦
            {(priceBounds.max / 100).toLocaleString("en-NG")}
          </p>
        </fieldset>
      </div>
    </form>
  );
}