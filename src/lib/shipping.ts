/**
 * Delivery options shared by the checkout UI and the /api/orders handler.
 *
 * The fee here is display-only. `deliveryFeeInKobo` below is what the server
 * charges: the API re-derives it from DELIVERY_TYPES and ignores any fee the
 * browser sends, so a tampered request cannot change the total.
 */

/** Delivery charge in kobo (₦1 = 100 kobo), matching the Paystack minor unit. */
export type DeliveryTypeId = "standard" | "express";

export type DeliveryType = {
  id: DeliveryTypeId;
  label: string;
  description: string;
  /** Fee in kobo. */
  feeInKobo: number;
  /** Business-day estimate shown to the shopper. */
  eta: string;
};

export const DELIVERY_TYPES: DeliveryType[] = [
  {
    id: "standard",
    label: "Standard delivery",
    description: "Delivered to your door",
    feeInKobo: 150000,
    eta: "3–5 business days",
  },
  {
    id: "express",
    label: "Express delivery",
    description: "Priority handling, dispatched first",
    feeInKobo: 350000,
    eta: "1–2 business days",
  },
];

export const DEFAULT_DELIVERY_TYPE: DeliveryTypeId = "standard";

export function getDeliveryType(id: string): DeliveryType | undefined {
  return DELIVERY_TYPES.find((d) => d.id === id);
}

/**
 * Resolves the fee for a delivery id, falling back to the standard fee for
 * anything unrecognised so an unknown value can never produce a free order.
 */
export function deliveryFeeInKobo(id: string): number {
  return getDeliveryType(id)?.feeInKobo ?? 150000;
}

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

/**
 * Paystack hosts card, bank-transfer and USSD behind one redirect, so every
 * method here resolves to the same checkout URL and needs no extra server call.
 */
export type PaymentTypeId = "card" | "bank" | "ussd";

export type PaymentType = {
  id: PaymentTypeId;
  label: string;
  description: string;
  icon: string;
};

export const PAYMENT_TYPES: PaymentType[] = [
  {
    id: "card",
    label: "Debit / Credit card",
    description: "Verve, Mastercard, Visa",
    icon: "💳",
  },
  {
    id: "bank",
    label: "Bank transfer",
    description: "Pay directly from your bank app",
    icon: "🏦",
  },
  {
    id: "ussd",
    label: "USSD",
    description: "Dial *737# on your phone",
    icon: "📱",
  },
];

export function getPaymentType(id: string): PaymentType | undefined {
  return PAYMENT_TYPES.find((p) => p.id === id);
}