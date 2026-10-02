/**
 * Collects text from an error and every nested layer beneath it.
 *
 * This walks more than `cause`, because different layers hide the real problem
 * in different places:
 *  - `Error.cause`       — standard nested error
 *  - `error.sourceError` — Neon's NeonDbError wraps the transport failure here
 *  - own enumerable props — otherwise `JSON.stringify(new Error(...))` yields
 *    "{}", which is why the real message vanishes from the logs
 */
function errorText(error: unknown, depth = 0): string {
  if (error == null || depth > 6) return "";

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const nested = error as Error & {
      cause?: unknown;
      sourceError?: unknown;
    };

    const parts = [`${error.name}: ${error.message}`];

    // enumerable own props, e.g. `code` on system errors
    for (const key of Object.keys(error)) {
      const value = (error as unknown as Record<string, unknown>)[key];
      if (typeof value !== "object" && value !== undefined) {
        parts.push(`${key}=${String(value)}`);
      }
    }

    parts.push(errorText(nested.cause, depth + 1));
    parts.push(errorText(nested.sourceError, depth + 1));

    return parts.filter(Boolean).join(" | ");
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" || typeof value === "number") {
        parts.push(`${key}=${value}`);
      } else {
        parts.push(errorText(value, depth + 1));
      }
    }
    return parts.join(" | ");
  }

  return String(error);
}

/**
 * True when an error looks like "we could not reach the database"
 * (missing DATABASE_URL, DNS failure, refused connection, Neon cold start).
 *
 * Used to render a friendly fallback instead of a stack trace, so transient
 * infrastructure problems never take the storefront fully offline.
 */
export function dbUnavailable(error: unknown): boolean {
  const text = errorText(error);

  return [
    "DATABASE_URL",
    "fetch failed",
    "Error connecting to database",
    // Network/transport failures, including IPv6 black-holes that surface as
    // a plain connection timeout rather than a DNS error.
    "ConnectTimeoutError",
    "UND_ERR_CONNECT_TIMEOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "getaddrinfo",
    "ERR_TLS",
    "CERT_",
    // Neon's own transient failures.
    "terminating connection",
    "the database system is",
    "connection terminated",
    "connection reset",
    "server closed the connection",
  ].some((needle) => text.includes(needle));
}