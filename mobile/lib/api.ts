/**
 * Base URL of the Next.js backend.
 *
 * Overridable at runtime with EXPO_PUBLIC_API_URL so the same build can point
 * at staging without a code change. The default matches the production
 * deployment.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://e-shop-alpha-ashy.vercel.app";

import type { DeliveryTypeId, PaymentTypeId } from "./shipping";

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  priceInKobo: number;
  imageUrl: string | null;
  stock: number;
  category: string;
};

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

export type Cart = {
  items: CartLine[];
  subtotalInKobo: number;
};

export type ProductsResponse = {
  products: Product[];
  categories: string[];
  total: number;
};

/** Error carrying the HTTP status so callers can react to 401 specifically. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** Bearer token; omit for public routes or guest requests. */
  token?: string | null;
  /**
   * Extra headers. Needed to forward the browser cookie when exchanging a web
   * session for a native token.
   */
  headers?: Record<string, string>;
};

/**
 * Single fetch wrapper that attaches the bearer token, sets JSON headers and
 * normalises error responses into ApiError.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, headers: extra } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // A network drop is not an API problem, so report it plainly rather than
    // letting an opaque TypeError reach the UI.
    throw new ApiError("Could not reach the server. Check your connection.", 0);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new ApiError(
      data.error ?? `Request failed (${response.status}).`,
      response.status,
    );
  }

  return data as T;
}

/** Public catalogue, with optional search, category filter and sort. */
export function fetchProducts(filters: {
  category?: string;
  q?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "name";
} = {}): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== "All") {
    params.set("category", filters.category);
  }
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);

  const query = params.toString();
  return request<ProductsResponse>(`/api/products${query ? `?${query}` : ""}`);
}

export const fetchCart = (token: string) => request<Cart>("/api/cart", { token });

export const addToCart = (token: string, productId: number, quantity = 1) =>
  request<Cart>("/api/cart", {
    method: "POST",
    token,
    body: { productId, quantity },
  });

/** Sets an absolute quantity; omit `quantity` to remove the line. */
export const updateCartItem = (
  token: string,
  productId: number,
  quantity?: number,
) =>
  request<Cart>("/api/cart", {
    method: "DELETE",
    token,
    body: quantity === undefined ? { productId } : { productId, quantity },
  });

export type MergeResult = {
  merged: number;
  skipped: { productId: number; reason: string }[];
} & Cart;

/**
 * Folds a guest's local cart into the signed-in user's server cart.
 *
 * `items` uses the same productId/quantity shape the local cart stores, so the
 * caller can hand over its AsyncStorage contents unchanged.
 */
export function mergeGuestCart(
  token: string,
  items: { productId: number; quantity: number }[],
): Promise<MergeResult> {
  return request<MergeResult>("/api/cart/merge", {
    method: "POST",
    token,
    body: { items },
  });
}

/** The shopper's account, as returned by the token exchange. */
export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/**
 * Swaps a one-time sign-in code for a bearer token.
 *
 * The code arrives via the eshop://auth deep link after the shopper completes
 * Google sign-in in a browser tab; the token itself never touches a URL.
 */
export function exchangeCodeForToken(
  code: string,
): Promise<{ token: string; user: AuthUser; expiresAt: string }> {
  return request("/api/mobile/token", {
    method: "POST",
    body: { code },
  });
}

export type OrderLine = {
  name: string;
  slug: string;
  quantity: number;
  unitPriceInKobo: number;
  lineTotalInKobo: number;
};

export type Order = {
  id: number;
  totalInKobo: number;
  status: "pending" | "paid" | "failed" | "refunded";
  reference: string | null;
  createdAt: string;
  items: OrderLine[];
};

/** Order history for the signed-in shopper. Requires a token. */
export function fetchOrders(token: string): Promise<{ orders: Order[] }> {
  return request<{ orders: Order[] }>("/api/orders", { token });
}

/**
 * Placeholder fields plus the cart contents.
 *
 * `token` is omitted for guests: the API falls back to an account keyed by the
 * email, so a guest can check out and still receive their receipt.
 */
export type CheckoutInput = {
  email: string;
  customerName: string;
  phone: string;
  state: string;
  city: string;
  shippingAddress: string;
  deliveryNotes?: string;
  deliveryType: DeliveryTypeId;
  paymentType: PaymentTypeId;
  items: { productId: number; quantity: number }[];
};

export type CheckoutResult = {
  orderId: number;
  reference: string;
  authorizationUrl: string;
  subtotalInKobo: number;
  deliveryChargeInKobo: number;
  totalInKobo: number;
};

/**
 * Creates the order and returns Paystack's authorisation URL.
 *
 * Prices are recomputed server-side, so the totals returned here are
 * authoritative even if the cart changed since it was loaded.
 */
export function createOrder(
  input: CheckoutInput,
  token?: string | null,
): Promise<CheckoutResult> {
  return request<CheckoutResult>("/api/orders", {
    method: "POST",
    token,
    body: input,
  });
}