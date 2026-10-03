import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_URL, exchangeCodeForToken, type AuthUser } from "../lib/api";
import {
  clearSession,
  getValidSession,
  saveSession,
} from "../lib/secureSession";
import { clearGuestCart, readGuestCart } from "../lib/guestCart";
import { useCart } from "./CartContext";

// Lets the browser tab close itself once sign-in finishes.
WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  /** True until the stored session has been read, so the UI can hold off. */
  loading: boolean;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { replaceWithServerCart } = useCart();

  // Restore any persisted session on cold start.
  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getValidSession();
      if (!active) return;
      if (session) {
        setToken(session.token);
        setUser(session.user);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setSigningIn(true);

    try {
      // The browser tab signs in on the web origin, where Auth.js sets its
      // httpOnly cookie. /mobile/authorize then mints a one-time code and deep
      // links back here, because the cookie itself cannot be read from the app.
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: "eshop" });

      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/mobile/authorize`,
        redirectUrl,
      );

      if (result.type === "cancel" || result.type === "dismiss") {
        return;
      }

      if (result.type !== "success") {
        throw new Error("Sign-in did not complete. Please try again.");
      }

      const code = extractCode(result.url);
      if (!code) {
        throw new Error("Could not read the sign-in code. Please try again.");
      }

      const session = await exchangeCodeForToken(code);
      await saveSession(session);
      setToken(session.token);
      setUser(session.user);

      // Fold anything the shopper added as a guest into their server cart.
      // replaceWithServerCart clears the local copy once merged.
      const guestItems = await readGuestCart();
      if (guestItems.length > 0) {
        await replaceWithServerCart(session.token);
      }

      router.replace("/(tabs)");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setSigningIn(false);
    }
  }, [router, replaceWithServerCart]);

  const signOut = useCallback(async () => {
    await clearSession();
    await clearGuestCart();
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signingIn, signIn, signOut, error }),
    [user, token, loading, signingIn, signIn, signOut, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Pulls `code` out of the eshop://auth?code=... deep link. */
function extractCode(url: string): string | null {
  const match = /[?&]code=([^&]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return ctx;
}