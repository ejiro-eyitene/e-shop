"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  CartApiError,
  addToCart,
  fetchCart,
  mergeGuestCart,
  setCartQuantity,
} from "@/lib/cart";
import type { CartLine } from "@/lib/cart";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  priceInKobo: number;
  imageUrl: string | null;
  quantity: number;
};

type CartState = { items: CartItem[] };

type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity?: number }
  | { type: "remove"; productId: number }
  | { type: "setQuantity"; productId: number; quantity: number }
  | { type: "clear" };

const STORAGE_KEY = "shop.cart.v1";

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items };

    case "add": {
      const existing = state.items.find(
        (i) => i.productId === action.item.productId,
      );
      const quantity = action.quantity ?? 1;

      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === action.item.productId
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, { ...action.item, quantity }] };
    }

    case "remove":
      return {
        items: state.items.filter((i) => i.productId !== action.productId),
      };

    case "setQuantity":
      // A zero/negative quantity removes the line instead of going negative.
      if (action.quantity < 1) {
        return {
          items: state.items.filter((i) => i.productId !== action.productId),
        };
      }
      return {
        items: state.items.map((i) =>
          i.productId === action.productId
            ? { ...i, quantity: action.quantity }
            : i,
        ),
      };

    case "clear":
      return { items: [] };
  }
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
  itemCount: number;
  subtotalInKobo: number;
  /** True while the initial server fetch or guest merge is in flight. */
  syncing: boolean;
  /** Set when a sync attempt failed, e.g. offline or a 401. */
  syncError: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartState;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    // Corrupt or blocked storage must never break the page.
    return [];
  }
}

/** Server lines carry extra fields; keep only what the UI renders. */
function toItems(lines: CartLine[]): CartItem[] {
  return lines.map((l) => ({
    productId: l.productId,
    slug: l.slug,
    name: l.name,
    priceInKobo: l.priceInKobo,
    imageUrl: l.imageUrl,
    quantity: l.quantity,
  }));
}

export function CartProvider({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  /** Read from the server session; drives guest vs synced behaviour. */
  isAuthenticated: boolean;
}) {
  // Server renders an empty cart so markup matches the first client render.
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const [syncing, setSyncing] = useState(isAuthenticated);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // The guest cart is merged into the account exactly once per sign-in. A ref
  // rather than state, because re-running the merge would re-post the same
  // items and inflate quantities.
  const mergedFor = useRef<string | null>(null);

  // Lets mutation callbacks read the current mode without being re-created on
  // every session change.
  const authed = useRef(isAuthenticated);
  authed.current = isAuthenticated;

  // Guests are served straight from localStorage.
  useEffect(() => {
    if (isAuthenticated) return;
    const stored = readStoredItems();
    dispatch({ type: "hydrate", items: stored });
    hydrated.current = true;
  }, [isAuthenticated]);

  // Persist only after hydration, otherwise the empty SSR state would
  // immediately overwrite whatever the user had saved. Authenticated shoppers
  // are persisted by the server instead.
  useEffect(() => {
    if (!hydrated.current || isAuthenticated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota or private-mode errors are non-fatal for this feature.
    }
  }, [state, isAuthenticated]);

  // Load the server cart on sign-in, merging any guest cart first so a shopper
  // who built a cart anonymously does not silently lose it at login.
  useEffect(() => {
    if (!isAuthenticated) {
      setSyncing(false);
      return;
    }

    let cancelled = false;

    async function sync() {
      setSyncing(true);
      setSyncError(null);
      try {
        const guest = readStoredItems();
        const cart =
          guest.length > 0 && mergedFor.current === null
            ? await mergeGuestCart(
                guest.map((g) => ({
                  productId: g.productId,
                  quantity: g.quantity,
                })),
              )
            : await fetchCart();

        if (cancelled) return;

        mergedFor.current = "merged";
        // The guest copy is now folded in, so drop it; otherwise signing out and
        // back in on this device would merge the same lines a second time.
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* non-fatal */
        }

        dispatch({ type: "hydrate", items: toItems(cart.items) });
        hydrated.current = true;
      } catch (err) {
        if (cancelled) return;
        setSyncError(
          err instanceof CartApiError
            ? err.message
            : "Could not sync your cart.",
        );
        // Fall back to the guest cart so the shopper can still check out,
        // rather than showing an empty cart with no explanation.
        const guest = readStoredItems();
        if (guest.length > 0) dispatch({ type: "hydrate", items: guest });
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  /** Applies a server response, or records why the write did not land. */
  const applyServerCart = (fn: () => Promise<{ items: CartLine[] }>) => {
    fn().then(
      (cart) => dispatch({ type: "hydrate", items: toItems(cart.items) }),
      (err: unknown) =>
        setSyncError(
          err instanceof CartApiError
            ? err.message
            : "Could not update your cart.",
        ),
    );
  };

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity?: number) => {
      const amount = quantity ?? 1;
      // Optimistic local bump so the badge reacts instantly; the server response
      // then replaces it with authoritative prices and clamped quantities.
      dispatch({ type: "add", item, quantity });
      if (authed.current) applyServerCart(() => addToCart(item.productId, amount));
    },
    [],
  );

  const removeItem = useCallback((productId: number) => {
    dispatch({ type: "remove", productId });
    if (authed.current) applyServerCart(() => setCartQuantity(productId));
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    dispatch({ type: "setQuantity", productId, quantity });
    // A non-positive quantity removes the line, matching the local reducer.
    if (authed.current) {
      applyServerCart(() =>
        setCartQuantity(productId, quantity > 0 ? quantity : undefined),
      );
    }
  }, []);

  // Checkout empties the server cart server-side once Paystack accepts the order,
  // so this only clears what the page is holding.
  const clear = useCallback(() => {
    dispatch({ type: "clear" });
    if (!authed.current) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* non-fatal */
      }
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const { items } = state;
    return {
      items,
      addItem,
      removeItem,
      setQuantity,
      clear,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalInKobo: items.reduce(
        (sum, i) => sum + i.quantity * i.priceInKobo,
        0,
      ),
      syncing,
      syncError,
    };
  }, [state, addItem, removeItem, setQuantity, clear, syncing, syncError]);

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside a <CartProvider>.");
  }
  return ctx;
}