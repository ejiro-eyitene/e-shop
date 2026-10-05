/**
 * Delivery and payment options, mirroring the backend's src/lib/shipping.ts.
 *
 * These ids and fees MUST stay in step with the server: it validates both and
 * re-derives the fee itself, so a mismatch here shows the wrong total until the
 * shopper reaches Paystack. Duplicated because the mobile app cannot import
 * from the Next.js tree.
 */

export type DeliveryTypeId = "standard" | "express";
export type PaymentTypeId = "card" | "bank" | "ussd";

export type DeliveryOption = {
  id: DeliveryTypeId;
  label: string;
  feeInKobo: number;
  eta: string;
};

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: "standard",
    label: "Standard delivery",
    feeInKobo: 150_000,
    eta: "3–5 business days",
  },
  {
    id: "express",
    label: "Express delivery",
    feeInKobo: 350_000,
    eta: "1–2 business days",
  },
];

export function deliveryFee(id: DeliveryTypeId): number {
  return DELIVERY_OPTIONS.find((d) => d.id === id)?.feeInKobo ?? 150_000;
}

export type PaymentOption = {
  id: PaymentTypeId;
  label: string;
  hint: string;
  icon: string;
};

/**
 * Paystack hosts all three channels behind one redirect, so this choice only
 * records the shopper's preference -- it does not change the flow.
 */
export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "card",
    label: "Debit / Credit card",
    hint: "Verve, Mastercard, Visa",
    icon: "💳",
  },
  {
    id: "bank",
    label: "Bank transfer",
    hint: "Pay from your bank app",
    icon: "🏦",
  },
  { id: "ussd", label: "USSD", hint: "Dial *737# on your phone", icon: "📱" },
];

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT — Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];