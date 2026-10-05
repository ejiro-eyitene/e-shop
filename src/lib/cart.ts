export type CartLine = {
  id: number;
  productId: number;
  quantity: number;
  slug: string;
  name: string;
  priceInKobo: number;
  imageUrl: string | null;
  stock: number;
  lineTotalInKobo: number;
};

/**
 * Browser client for the shared server cart.
 *
 * Requests are same-origin with `credentials: "include"` so the Auth.js
 * session cookie rides along; the native app uses its bearer token against the
 * same routes instead. Both write identical cart_items rows, which is what makes
 * a cart built in a browser show up in the app.
 *
 * Prices come from the response, never from the caller's optimistic value: the
 * server is the only place stock and price are enforced.
 */

export type Cart = {
  items: CartLine[];
  subtotalInKobo: number;
};

export type MergeResult = {
  merged: number;
  skipped: { productId: number; reason: string }[];
  items: CartLine[];
  subtotalInKobo: number;
};

/** Thrown for any non-2xx response so callers can surface the server's message. */
export class CartApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CartApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: init?.body
        ? { "Content-Type": "application/json", ...init?.headers }
        : init?.headers,
    });
  } catch {
    throw new CartApiError("Could not reach the server. Check your connection.", 0);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new CartApiError(
      data.error ?? `Request failed (${response.status}).`,
      response.status,
    );
  }
  return data as T;
}

export const fetchCart = () => request<Cart>("/api/cart");

export const addToCart = (productId: number, quantity = 1) =>
  request<Cart>("/api/cart", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });

/** Sets an absolute quantity; omit it to remove the line. */
export const setCartQuantity = (productId: number, quantity?: number) =>
  request<Cart>("/api/cart", {
    method: "DELETE",
    body: JSON.stringify(
      quantity === undefined ? { productId } : { productId, quantity },
    ),
  });

/**
 * Folds a guest's localStorage cart into the account's server cart.
 *
 * Accepts the same { productId, quantity } shape the local cart stores, so the
 * provider can hand over its raw contents unchanged.
 */
export const mergeGuestCart = (items: { productId: number; quantity: number }[]) =>
  request<MergeResult>("/api/cart/merge", {
    method: "POST",
    body: JSON.stringify({ items }),
  });