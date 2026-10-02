import Link from "next/link";
import { auth, signOut } from "@/auth";
import { CartBadge } from "./CartBadge";

/**
 * Reads the session, tolerating a database outage.
 *
 * `auth()` queries the sessions table on every render (the root layout
 * includes this Navbar), so an unhandled failure here takes down every route
 * in the app — not just authentication.
 */
async function safeAuth() {
  try {
    return await auth();
  } catch (error) {
    console.error("Session lookup failed:", error);
    return null;
  }
}

export async function Navbar() {
  const session = await safeAuth();

  return (
    <div className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost text-xl font-bold">
          🛍️ e-shop
        </Link>
      </div>

      <div className="flex-none gap-2">
        <Link href="/products" className="btn btn-ghost btn-sm">
          All products
        </Link>
        <CartBadge />

        {session?.user ? (
          <>
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-sm avatar avatar-placeholder"
              >
                <div className="w-6 rounded-full bg-neutral text-neutral-content">
                  <span className="text-xs">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
              >
                <li className="menu-title truncate">{session.user.email}</li>
                <li>
                  <Link href="/orders">My orders</Link>
                </li>
                <li>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button type="submit">Sign out</button>
                  </form>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}