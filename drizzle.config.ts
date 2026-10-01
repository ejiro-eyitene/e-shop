import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside of Next.js, so nothing loads .env.local for us.
// Node's --env-file / loadEnvFile will NOT overwrite a variable that is
// already defined -- and some shells define DATABASE_URL as an empty string,
// so delete it first, otherwise the connection URL stays blank.
if (existsSync(".env.local")) {
  delete process.env.DATABASE_URL;
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});