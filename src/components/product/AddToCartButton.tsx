"use client";

import { useState } from "react";
import { useCart, type CartItem } from "@/components/cart/CartProvider";

export function AddToCartButton({
  product,
  disabled = false,
}: {
  product: Omit<CartItem, "quantity">;
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className={`btn btn-sm ${justAdded ? "btn-success" : "btn-primary"}`}
    >
      {disabled ? "Sold out" : justAdded ? "Added ✓" : "Add to cart"}
    </button>
  );
}