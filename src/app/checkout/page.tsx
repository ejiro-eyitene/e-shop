"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { naira } from "@/lib/formatters";

export default function CheckoutPage() {
  const { items, subtotalInKobo, clear } = useCart();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          customerName: name,
          phone,
          shippingAddress: address,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not start the payment.");
      }

      // Only clear once the server has accepted the order; otherwise the
      // shopper would lose their cart on a transient failure.
      clear();
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Nothing to check out</h1>
        <p className="text-base-content/60 mb-6">
          Add a product to your cart first.
        </p>
        <Link href="/" className="btn btn-primary">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <form
        onSubmit={handleSubmit}
        className="grid lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 card bg-base-100 shadow-sm">
          <div className="card-body space-y-4">
            <h2 className="card-title">Delivery details</h2>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Full name</legend>
              <input
                type="text"
                required
                className="input w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email</legend>
              <input
                type="email"
                required
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <p className="label">Your receipt will be sent here.</p>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Phone</legend>
              <input
                type="tel"
                required
                className="input w-full"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 000 0000"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Shipping address</legend>
              <textarea
                required
                className="textarea w-full"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, state"
              />
            </fieldset>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm h-fit lg:sticky lg:top-20">
          <div className="card-body">
            <h2 className="card-title">Summary</h2>
            <ul className="space-y-1 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between">
                  <span className="truncate pr-2">
                    {i.name} × {i.quantity}
                  </span>
                  <span className="shrink-0">
                    {naira(i.priceInKobo * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="divider my-1" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{naira(subtotalInKobo)}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary mt-4"
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Redirecting to Paystack…
                </>
              ) : (
                "Pay with Paystack"
              )}
            </button>

            <p className="text-xs text-base-content/50 text-center">
              You will be redirected to Paystack to complete payment securely.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}