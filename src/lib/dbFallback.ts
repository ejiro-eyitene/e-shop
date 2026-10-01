/**
 * Collects text from an error and its nested `cause` chain.
 *
 * Neon wraps the underlying transport failure (`fetch failed`, DNS errors,
 * timeouts) inside a NeonDbError, so checking only `error.message` misses it.
 */
function errorText(error: unknown, depth = 0): string {
  if (error == null || depth > 5) return "";

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return `${error.name}: ${error.message} ${errorText(cause, depth + 1)}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
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
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "getaddrinfo",
    "terminating connection",
    "the database system is",
    "connection terminated",
  ].some((needle) => text.includes(needle));
}