import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Bearer tokens for the native mobile app.
 *
 * The web app's Auth.js session lives in an httpOnly cookie, which React
 * Native cannot read, so there is no token for the client to store. Instead we
 * mint our own short-lived, HMAC-signed token carrying the user id; the app
 * keeps it in expo-secure-store and sends it as `Authorization: Bearer`.
 *
 * Tokens are stateless on purpose: verifying one needs no database round-trip
 * and no session row. The trade-off is that logout cannot revoke a token
 * before it expires, which is why the TTL is kept short (30 days) and why the
 * user id is re-checked against the database on every request.
 */

/** 30 days. Long enough to avoid constant re-login, short enough to bound risk. */
export const MOBILE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is missing from your environment.");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Creates a signed token for the given user id. */
export function createMobileToken(userId: string): string {
  const body = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + MOBILE_TOKEN_TTL_MS }),
  ).toString("base64url");

  return `${body}.${sign(body)}`;
}

/** The account shape returned once a bearer token has been verified. */
export type MobileUser = { id: string; email: string | null; name: string | null };

/**
 * Verifies a token's signature and expiry, then confirms the user still
 * exists. Returns null for anything invalid, expired or deleted.
 */
export async function verifyMobileToken(
  token: string | null | undefined,
): Promise<MobileUser | null> {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  // Constant-time compare so the signature cannot be guessed byte by byte.
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  let payload: { uid?: string; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload.uid || typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;

  // Re-check the account so a deleted user's token stops working immediately
  // rather than at expiry.
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, payload.uid))
    .limit(1);

  return row ?? null;
}

/** Reads a bearer token from the Authorization header. */
export function bearerFrom(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}
