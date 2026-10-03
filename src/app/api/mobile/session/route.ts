import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mobileAuthCodes } from "@/db/schema";
import { auth } from "@/auth";

/** Codes are short-lived: this only has to survive the app's redirect hop. */
const CODE_TTL_MS = 5 * 60 * 1000;

/**
 * Mints a one-time code for the signed-in web session.
 *
 * Called by /mobile/authorize after Google sign-in completes. The code -- not
 * the bearer token -- travels back to the app in the redirect URL, so the
 * token never appears in a URL that could be logged or cached.
 *
 * Only an Auth.js-verified session may mint a code, so this cannot be used to
 * escalate an anonymous visitor.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const code = randomBytes(32).toString("hex");

  await db.insert(mobileAuthCodes).values({
    code,
    userId: session.user.id,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  return NextResponse.json({ code, expiresInSeconds: CODE_TTL_MS / 1000 });
}

