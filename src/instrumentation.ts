/**
 * Runs once when the server boots, before any request is handled.
 *
 * Next.js is not loading .env.local in this setup, and the Google OAuth
 * provider reads AUTH_GOOGLE_ID at import time -- so the variables must be in
 * process.env before application modules are evaluated. This hook is the
 * earliest reliable place to do that.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadLocalEnv } = await import("./lib/env");
    loadLocalEnv();
  }
}