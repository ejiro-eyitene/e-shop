import { auth } from "@/auth";
import { bearerFrom, verifyMobileToken } from "./mobileAuth";

/**
 * Resolves the acting shopper from either credential type.
 *
 * The web storefront authenticates with an Auth.js session cookie while the
 * native app sends an HMAC bearer token, but both read and write the same
 * cart_items rows. Every cart endpoint resolves its owner through here, so the
 * two clients stay interchangeable and a guest never gets a cart back.
 *
 * A bearer token wins when both are present: it is the more explicit signal of
 * intent. `auth()` is wrapped because it queries the sessions table, and a
 * database blip should read as "signed out" rather than take down the cart.
 */
export async function resolveCartUser(
  req: Request,
): Promise<{ id: string } | null> {
  const mobileUser = await verifyMobileToken(bearerFrom(req));
  if (mobileUser) return { id: mobileUser.id };

  try {
    const session = await auth();
    return session?.user?.id ? { id: session.user.id } : null;
  } catch (error) {
    console.error("Session lookup failed while resolving cart user:", error);
    return null;
  }
}