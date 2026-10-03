import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  /** Pulls the server cart into state; used after sign-in and merge. */
  refreshFromServer: (token: string) => Promise<void>;
  /**
   * Folds a guest cart into the newly signed-in user's server cart and adopts
   * the result as the active cart, clearing the local guest copy.
   */
  replaceWithServerCart: (token: string) => Promise<void>;
  clearLocalCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the right cart whenever the shopper's auth state changes.
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        if (token) {
          const cart = await fetchCart(token);
          if (active) setItems(cart.items);
        } else {
          const guest = await readGuestCart();
          if (active) setItems(guestToLines(guest));
        }
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

  const refreshFromServer = useCallback(async (authToken: string) => {
    const cart = await fetchCart(authToken);
    setItems(cart.items);
  }, []);

  const replaceWithServerCart = useCallback(
    async (authToken: string) => {
      // Merge whatever is sitting in local storage into the account, then adopt
      // the merged result as the live cart.
      const guest = await readGuestCart();
      const result = await mergeGuestCart(
        authToken,
        guest.map((g) => ({ productId: g.productId, quantity: g.quantity })),
      );
      setItems(result.items);
      await clearGuestCart();
    },
    [],
  );

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
      refreshFromServer,
      replaceWithServerCart,
      clearLocalCart,
    }),
    [
      items,
      loading,
      error,
      addItem,
      setQuantity,
      removeItem,
      refreshFromServer,
      replaceWithServerCart,
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
