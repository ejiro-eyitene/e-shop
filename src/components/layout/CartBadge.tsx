"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export function CartBadge() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="btn btn-ghost btn-sm"
      aria-label={`Cart with ${itemCount} items`}
    >
      <span className="indicator">
        <span className="text-lg" aria-hidden>
          🛒
        </span>
        {itemCount > 0 && (
          <span className="badge badge-primary badge-xs indicator-item">
            {itemCount}
          </span>
        )}
      </span>
    </Link>
  );
}