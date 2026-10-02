"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { naira } from "@/lib/formatters";
import {
  DEFAULT_DELIVERY_TYPE,
  DELIVERY_TYPES,
  NIGERIAN_STATES,
  PAYMENT_TYPES,
  type DeliveryTypeId,
  type PaymentTypeId,
} from "@/lib/shipping";

export default function CheckoutPage() {
  const { items, subtotalInKobo, clear } = useCart();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryTypeId>(
    DEFAULT_DELIVERY_TYPE,
  );
  const [paymentType, setPaymentType] = useState<PaymentTypeId>("card");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedDelivery =
    DELIVERY_TYPES.find((d) => d.id === deliveryType) ?? DELIVERY_TYPES[0];
  const totalInKobo = subtotalInKobo + selectedDelivery.feeInKobo;

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
          state,
          city,
          shippingAddress: address,
          deliveryNotes,
          deliveryType,
          paymentType,
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
            <h2 className="card-title">Contact information</h2>

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
              <p className="label">Our rider will call this number on delivery.</p>
            </fieldset>

            <div className="divider my-1" />
            <h3 className="card-title text-lg">Delivery information</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">State</legend>
                <select
                  required
                  className="select w-full"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="" disabled>
                    Select a state
                  </option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">City</legend>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lekki"
                />
              </fieldset>
            </div>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Street address</legend>
              <textarea
                required
                className="textarea w-full"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="12 Admiralty Way, near the roundabout"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Delivery notes{" "}
                <span className="text-base-content/40">(optional)</span>
              </legend>
              <textarea
                className="textarea w-full"
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Landmark, gate colour, best time to deliver"
              />
            </fieldset>

            <div className="divider my-1" />
            <h3 className="card-title text-lg">How should we deliver?</h3>

            <div className="space-y-3">
              {DELIVERY_TYPES.map((d) => (
                <label
                  key={d.id}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    deliveryType === d.id
                      ? "border-primary bg-primary/5"
                      : "border-base-300 hover:border-base-content/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryType"
                    className="radio radio-primary radio-sm mt-1"
                    value={d.id}
                    checked={deliveryType === d.id}
                    onChange={() => setDeliveryType(d.id)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex justify-between gap-2">
                      <span className="font-semibold">{d.label}</span>
                      <span className="font-semibold whitespace-nowrap">
                        {naira(d.feeInKobo)}
                      </span>
                    </span>
                    <span className="block text-sm text-base-content/60">
                      {d.description} · {d.eta}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="divider my-1" />
            <h3 className="card-title text-lg">Payment type</h3>

            <div className="space-y-3">
              {PAYMENT_TYPES.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    paymentType === p.id
                      ? "border-primary bg-primary/5"
                      : "border-base-300 hover:border-base-content/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    className="radio radio-primary radio-sm"
                    value={p.id}
                    checked={paymentType === p.id}
                    onChange={() => setPaymentType(p.id)}
                  />
                  <span className="text-xl" aria-hidden>
                    {p.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{p.label}</span>
                    <span className="block text-sm text-base-content/60">
                      {p.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
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
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">Subtotal</span>
              <span>{naira(subtotalInKobo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">
                {selectedDelivery.label}
              </span>
              <span>{naira(selectedDelivery.feeInKobo)}</span>
            </div>
            <p className="text-xs text-base-content/50 -mt-1">
              Arrives in {selectedDelivery.eta}
            </p>
            <div className="divider my-1" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{naira(totalInKobo)}</span>
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
              {PAYMENT_TYPES.find((p) => p.id === paymentType)?.label} · You
              will be redirected to Paystack to complete payment securely.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}