import { existsSync, readFileSync } from "node:fs";

/**
 * Loads .env.local into process.env for the Node.js server runtime.
 *
 * `process.loadEnvFile` / `--env-file` deliberately refuse to overwrite a
 * variable that already exists. Some environments (CI, sandboxes, shells that
 * export empty placeholders) already define AUTH_GOOGLE_ID, AUTH_SECRET and
 * friends as empty strings, which would silently leave them blank and break
 * OAuth. Parsing and assigning explicitly avoids that entirely.
 *
 * Loading this early matters too: `@auth/core/providers/google` reads
 * AUTH_GOOGLE_ID when it is first imported, so the variables must already be
 * in process.env before application modules evaluate. instrumentation.ts
 * guarantees that ordering.
 *
 * On platforms like Vercel the variables come from the platform environment
 * and .env.local does not exist, making this a harmless no-op.
 */
export function loadLocalEnv(): void {
  const runtime = process.env.NEXT_RUNTIME;
  if (runtime && runtime !== "nodejs") return;

  const file = ".env.local";
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;

    let value = trimmed.slice(eq + 1).trim();
    // Strip a single pair of surrounding quotes.
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }

  // A stale AUTH_URL inherited from the shell/CI silently redirects OAuth
  // callbacks to the wrong port, which surfaces as an unexplained 404.
  // Never let it outlive .env.local.
  if (existsSync(file) && !readFileSync(file, "utf8").includes("AUTH_URL=")) {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  }
}