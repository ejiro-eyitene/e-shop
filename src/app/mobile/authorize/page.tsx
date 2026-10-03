import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Bridge between the web sign-in and the native app.
 *
 * Flow: the app opens this page in a browser tab -> the shopper signs in with
 * Google (Auth.js sets its httpOnly cookie here) -> this page mints a one-time
 * code and redirects to eshop://auth?code=... -> the app swaps the code for a
 * bearer token and stores it in the keychain.
 *
 * The code is single-use and expires in 5 minutes, so it is safe to carry in a
 * URL in a way the token itself would not be.
 */
export default async function MobileAuthorizePage() {
  const session = await auth();

  // Not signed in (or declined): send them back through the normal sign-in.
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/mobile/authorize");
  }

  // Same-origin request from the browser tab, carrying the session cookie.
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/mobile/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: "{}",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    redirect("/auth/error?error=Configuration");
  }

  const { code } = (await response.json()) as { code: string };

  // The deep link returns control to the app, which performs the token swap.
  redirect(`eshop://auth?code=${encodeURIComponent(code)}`);
}
