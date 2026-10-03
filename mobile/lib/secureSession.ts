import * as SecureStore from "expo-secure-store";
import type { AuthUser } from "./api";

/**
 * Token persistence for the native app.
 *
 * expo-secure-store is backed by the iOS keychain and Android's EncryptedShared
 * Preferences, so the bearer token never sits in plain-text AsyncStorage where
 * any app process could read it.
 *
 * AsyncStorage is deliberately used for the *guest* cart only (see
 * lib/guestCart.ts): it is throwaway data with no credentials in it.
 */

const TOKEN_KEY = "eshop.token";
const USER_KEY = "eshop.user";
const EXPIRY_KEY = "eshop.expiresAt";

export type StoredSession = {
  token: string;
  user: AuthUser;
  expiresAt: string;
};

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
  await SecureStore.setItemAsync(EXPIRY_KEY, session.expiresAt);
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A locked or unavailable keychain must not crash app start; the user is
    // simply treated as signed out.
    return null;
  }
}

export async function getUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the stored token only if it has not passed its expiry.
 *
 * Expired tokens are rejected locally so the app shows the sign-in screen
 * instead of firing requests that will 401. The server checks the expiry too,
 * so this is a convenience rather than the security boundary.
 */
export async function getValidSession(): Promise<StoredSession | null> {
  try {
    const [token, userRaw, expiresAt] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
      SecureStore.getItemAsync(EXPIRY_KEY),
    ]);

    if (!token || !userRaw || !expiresAt) return null;
    if (new Date(expiresAt).getTime() <= Date.now()) {
      await clearSession();
      return null;
    }

    return { token, user: JSON.parse(userRaw) as AuthUser, expiresAt };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  // deleteItemAsync throws if the key is missing, so each failure is ignored.
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(EXPIRY_KEY).catch(() => {}),
  ]);
}