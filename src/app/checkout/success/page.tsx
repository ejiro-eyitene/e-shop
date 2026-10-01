import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { naira } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  const order = reference
    ? (
        await db.select().from(orders).where(eq(orders.paystackReference, reference)).limit(1)
      )[0]
    : undefined;

  if (!order) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Order not found</h1>
        <Link href="/" className="btn btn-primary mt-4">
          Back to shop
        </Link>
      </div>
    );
  }

  const items = await db
    .select({
      name: products.name,
      quantity: orderItems.quantity,
      unitPriceInKobo: orderItems.unitPriceInKobo,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold">Payment successful</h1>
        <p className="text-base-content/60 mt-2">
          Thanks! A confirmation has been sent to{" "}
          <span className="font-medium">{order.email}</span>.
        </p>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex justify-between">
            <h2 className="card-title">Order #{order.id}</h2>
            <span className="badge badge-success badge-lg">
              {order.status}
            </span>
          </div>
          <p className="text-xs text-base-content/50 font-mono">
            {order.paystackReference}
          </p>

          <div className="divider my-1" />

          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.name} className="flex justify-between text-sm">
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span>{naira(i.unitPriceInKobo * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="divider my-1" />

          <div className="flex justify-between font-bold text-lg">
            <span>Total paid</span>
            <span className="text-primary">{naira(order.totalInKobo)}</span>
          </div>

          <Link href="/" className="btn btn-primary mt-4">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}