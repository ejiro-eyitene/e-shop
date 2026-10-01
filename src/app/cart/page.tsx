"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { naira } from "@/lib/formatters";

export default function CartPage() {
  const { items, itemCount, subtotalInKobo, setQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-base-content/60 mb-6">
          Browse the catalogue and add something you like.
        </p>
        <Link href="/" className="btn btn-primary">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className="card bg-base-100 shadow-sm"
            >
              <div className="card-body flex-row items-center gap-4 p-4">
                <div className="w-20 h-20 rounded-lg bg-base-200 flex items-center justify-center overflow-hidden shrink-0">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="object-cover h-full w-full"
                    />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-semibold hover:text-primary line-clamp-1"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-base-content/60">
                    {naira(item.priceInKobo)} each
                  </p>
                </div>

                <div className="join">
                  <button
                    type="button"
                    className="btn btn-sm join-item"
                    onClick={() =>
                      setQuantity(item.productId, item.quantity - 1)
                    }
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="btn btn-sm join-item pointer-events-none w-12">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm join-item"
                    onClick={() =>
                      setQuantity(item.productId, item.quantity + 1)
                    }
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <p className="font-bold w-24 text-right">
                  {naira(item.priceInKobo * item.quantity)}
                </p>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card bg-base-100 shadow-sm h-fit lg:sticky lg:top-20">
          <div className="card-body">
            <h2 className="card-title">Order Summary</h2>
            <div className="flex justify-between text-sm text-base-content/70">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>
            <div className="flex justify-between text-sm text-base-content/70">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="divider my-1" />
            <div className="flex justify-between font-bold text-lg">
              <span>Subtotal</span>
              <span className="text-primary">{naira(subtotalInKobo)}</span>
            </div>
            <Link href="/checkout" className="btn btn-primary mt-4">
              Proceed to checkout
            </Link>
            <Link href="/" className="btn btn-ghost btn-sm">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}