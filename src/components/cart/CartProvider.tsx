"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Server renders an empty cart so markup matches the first client render.
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = readStoredItems();
    if (stored.length > 0) {
      dispatch({ type: "hydrate", items: stored });
    }
    hydrated.current = true;
  }, []);

  // Persist only after hydration, otherwise the empty SSR state would
  // immediately overwrite whatever the user had saved.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota or private-mode errors are non-fatal for this feature.
    }
  }, [state]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity?: number) =>
      dispatch({ type: "add", item, quantity }),
    [],
  );
  const removeItem = useCallback(
    (productId: number) => dispatch({ type: "remove", productId }),
    [],
  );
  const setQuantity = useCallback(
    (productId: number, quantity: number) =>
      dispatch({ type: "setQuantity", productId, quantity }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

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
    };
  }, [state, addItem, removeItem, setQuantity, clear]);

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