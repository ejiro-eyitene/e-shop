import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local cart for shoppers who have not signed in.
 *
 * Deliberately AsyncStorage rather than SecureStore: this holds no
 * credentials, only product ids and quantities, and it must survive a crash or
 * a reinstall being unimportant. Keeping it out of the keychain avoids
 * treating throwaway basket data as sensitive.
 *
 * The shape deliberately matches what /api/cart/merge expects, so a guest cart
 * can be posted to the backend on sign-in without reshaping it.
 */

const GUEST_CART_KEY = "eshop.guestCart.v1";

export type GuestCartItem = {
  productId: number;
  /** Retained so a guest cart can render product details offline-ish. */
  slug: string;
  name: string;
  priceInKobo: number;
  imageUrl: string | null;
  quantity: number;
  stock: number;
};

export async function readGuestCart(): Promise<GuestCartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestCartItem[]) : [];
  } catch {
    // Corrupt or unreadable storage must never break the cart screen.
    return [];
  }
}

async function writeGuestCart(items: GuestCartItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // Quota or private-mode failures are non-fatal for a guest basket.
  }
}

/** Adds a product, bumping the quantity when it is already in the cart. */
export async function addGuestItem(
  item: Omit<GuestCartItem, "quantity">,
  quantity = 1,
): Promise<GuestCartItem[]> {
  const items = await readGuestCart();
  const existing = items.find((i) => i.productId === item.productId);

  const next = existing
    ? items.map((i) =>
        i.productId === item.productId
          ? { ...i, quantity: Math.min(i.quantity + quantity, i.stock) }
          : i,
      )
    : [...items, { ...item, quantity: Math.min(quantity, item.stock) }];

  await writeGuestCart(next);
  return next;
}

/** Sets an absolute quantity; anything below 1 removes the line. */
export async function setGuestQuantity(
  productId: number,
  quantity: number,
): Promise<GuestCartItem[]> {
  const items = await readGuestCart();
  const next =
    quantity < 1
      ? items.filter((i) => i.productId !== productId)
      : items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(quantity, i.stock) }
            : i,
        );

  await writeGuestCart(next);
  return next;
}

export async function clearGuestCart(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // Nothing useful to do if the key cannot be removed.
  }
}