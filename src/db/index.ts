import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
// Relative import: tsx (used by npm run db:seed) does not resolve the
// "@/*" tsconfig path alias by default.
import { loadLocalEnv } from "../lib/env";

// Standalone scripts (npm run db:seed) don't get .env.local from Next.js.
loadLocalEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Copy .env.example to .env.local and fill it in.",
  );
}

// neon-http speaks plain HTTP, so it works in serverless/edge runtimes
// without needing a persistent TCP/WebSocket connection.
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
export * as tables from "./schema";