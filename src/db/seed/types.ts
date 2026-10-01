export type DemoProduct = {
  slug: string;
  name: string;
  description: string;
  /** Minor units (kobo). ₦1 = 100 kobo, matching Paystack. */
  priceInKobo: number;
  stock: number;
  category: string;
  imageUrl: string;
};