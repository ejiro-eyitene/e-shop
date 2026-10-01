import Link from "next/link";
import type { Product } from "@/lib/products";
import { naira } from "@/lib/formatters";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <Link
        href={`/products/${product.slug}`}
        className="figure bg-base-200 h-48"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover h-full w-full"
          />
        ) : (
          <span className="text-5xl">📦</span>
        )}
      </Link>

      <div className="card-body">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="card-title hover:text-primary line-clamp-1"
          >
            {product.name}
          </Link>
        </div>

        <span className="badge badge-ghost badge-sm w-fit">
          {product.category}
        </span>

        <p className="text-sm text-base-content/60 line-clamp-2">
          {product.description}
        </p>

        <div className="card-actions justify-between items-center mt-2">
          <span className="text-xl font-bold text-primary">
            {naira(product.priceInKobo)}
          </span>
          <AddToCartButton
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              priceInKobo: product.priceInKobo,
              imageUrl: product.imageUrl,
            }}
            disabled={product.stock < 1}
          />
        </div>

        {product.stock < 1 && (
          <span className="badge badge-error badge-sm mt-2">Out of stock</span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="badge badge-warning badge-sm mt-2">
            Only {product.stock} left
          </span>
        )}
      </div>
    </div>
  );
}