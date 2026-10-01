/** Formats an integer kobo amount as a Naira string: 250000 -> "₦2,500.00" */
export function naira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
}