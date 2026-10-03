/** Formats integer kobo as Naira, matching the web storefront: 250000 -> ₦2,500.00 */
export function naira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
}

/** Cart badge count, ignoring anything already removed. */
export function countItems(items: { quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}