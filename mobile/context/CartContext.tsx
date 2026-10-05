import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ApiError,
  addToCart,
  fetchCart,
  mergeGuestCart,
  updateCartItem,
  type CartLine,
} from "../lib/api";
import {
  addGuestItem,
  clearGuestCart,
  readGuestCart,
  setGuestQuantity,
  type GuestCartItem,
} from "../lib/guestCart";
import { useAuth } from "./AuthContext";

/**
 * One cart surface for both shopper states.
 *
 * Signed-in shoppers read and write the server cart through /api/cart. Guests
 * read and write AsyncStorage. Screens call the same add/setQuantity/remove
 * methods either way, so no screen needs to branch on whether a token exists.
 */
type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotalInKobo: number;
  loading: boolean;
  error: string | null;
  addItem: (
    product: { id: number; slug: string; name: string; priceInKobo: number; imageUrl: string | null; stock: number },
    quantity?: number,
  ) => Promise<void>;
  setQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  /**
   * Empties the cart on whichever backend is active — the server cart for a
   * signed-in shopper, AsyncStorage for a guest. Used after checkout is accepted.
   */
  clear: () => Promise<void>;
  /** Wipes the local guest cart, e.g. from the account screen. */
  clearLocalCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks which token has already had its guest cart merged. Without this the
  // merge would re-run on every render of the token-bearing app, re-posting
  // the same guest items and inflating quantities.
  const mergedFor = useRef<string | null>(null);

  // Mirror of `items` so `clear` can read the current lines without being
  // re-created on every cart change.
  const itemsRef = useRef<CartLine[]>(items);
  itemsRef.current = items;

  /**
   * Load the active cart, and fold in the guest cart the first time a token
   * appears.
   *
   * The merge lives here rather than in AuthProvider because this provider is
   * nested inside it: AuthProvider cannot use useCart() without rendering
   * before any cart exists (and without creating a require cycle).
   */
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        if (!token) {
          const guest = await readGuestCart();
          if (active) setItems(guestToLines(guest));
          mergedFor.current = null;
          return;
        }

        // First sign-in with guest items waiting: merge, then show the result.
        if (mergedFor.current !== token) {
          const guest = await readGuestCart();
          if (guest.length > 0) {
            const merged = await mergeGuestCart(
              token,
              guest.map((g) => ({
                productId: g.productId,
                quantity: g.quantity,
              })),
            );
            await clearGuestCart();
            if (!active) return;
            setItems(merged.items);
            mergedFor.current = token;
            setError(null);
            setLoading(false);
            return;
          }
          // Nothing to merge: mark it done so we only check once per token.
          mergedFor.current = token;
        }

        const cart = await fetchCart(token);
        if (active) setItems(cart.items);
        if (active) setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Could not load your cart.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  const addItem = useCallback<CartContextValue["addItem"]>(
    async (product, quantity = 1) => {
      setError(null);
      try {
        if (token) {
          const cart = await addToCart(token, product.id, quantity);
          setItems(cart.items);
        } else {
          // Guest items are keyed by productId, so the shape is translated
          // here rather than making callers remember the difference.
          const guest = await addGuestItem(
            {
              productId: product.id,
              slug: product.slug,
              name: product.name,
              priceInKobo: product.priceInKobo,
              imageUrl: product.imageUrl,
              stock: product.stock,
            },
            quantity,
          );
          setItems(guestToLines(guest));
        }
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not update your cart.",
        );
        throw err;
      }
    },
    [token],
  );

  const setQuantity = useCallback(
    async (productId: number, quantity: number) => {
      setError(null);
      try {
        if (token) {
          const cart = await updateCartItem(token, productId, quantity);
          setItems(cart.items);
        } else {
          const guest = await setGuestQuantity(productId, quantity);
          setItems(guestToLines(guest));
        }
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not update your cart.",
        );
      }
    },
    [token],
  );

  const removeItem = useCallback(
    async (productId: number) => {
      // Quantity below 1 is the "remove" signal on both paths.
      await setQuantity(productId, 0);
    },
    [setQuantity],
  );

  const clearLocalCart = useCallback(async () => {
    await clearGuestCart();
    setItems([]);
  }, []);

  const clear = useCallback(async () => {
    if (!token) {
      await clearLocalCart();
      return;
    }
    // Remove each line rather than a bulk endpoint: quantity 0 is the existing
    // delete signal, so this reuses code paths already covered by the cart API.
    const lines = itemsRef.current;
    try {
      await Promise.all(lines.map((l) => updateCartItem(token, l.productId, 0)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not clear your cart.",
      );
    } finally {
      setItems([]);
    }
  }, [token, clearLocalCart]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalInKobo: items.reduce(
        (sum, i) => sum + i.quantity * i.priceInKobo,
        0,
      ),
      loading,
      error,
      addItem,
      setQuantity,
      removeItem,
      clear,
      clearLocalCart,
    }),
    [
      items,
      loading,
      error,
      addItem,
      setQuantity,
      removeItem,
      clear,
      clearLocalCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Shapes guest storage entries as cart lines so screens stay uniform. */
function guestToLines(guest: GuestCartItem[]): CartLine[] {
  return guest.map((g, index) => ({
    // Guest items have no server row id yet; -1 marks them as not persisted.
    id: -1 - index,
    productId: g.productId,
    quantity: g.quantity,
    slug: g.slug,
    name: g.name,
    priceInKobo: g.priceInKobo,
    imageUrl: g.imageUrl,
    stock: g.stock,
    lineTotalInKobo: g.quantity * g.priceInKobo,
  }));
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside a <CartProvider>.");
  }
  return ctx;
}
