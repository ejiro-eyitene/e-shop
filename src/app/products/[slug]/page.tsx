import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { naira } from "@/lib/formatters";
import { AddToCartButton } from "@/components/product/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = (
    await db.select().from(products).where(eq(products.slug, slug)).limit(1)
  )[0];

  if (!product) notFound();

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="card bg-base-100 shadow-sm">
        <figure className="bg-base-200 h-96">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="object-cover h-full w-full"
            />
          ) : (
            <span className="text-7xl">📦</span>
          )}
        </figure>
      </div>

      <div className="flex flex-col justify-center gap-4">
        <h1 className="text-4xl font-bold">{product.name}</h1>
        <p className="text-3xl font-bold text-primary">
          {naira(product.priceInKobo)}
        </p>
        <p className="text-base-content/70 leading-relaxed">
          {product.description}
        </p>

        <div className="flex items-center gap-3">
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
          <span className="badge badge-ghost">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>
      </div>
    </div>
  );
}