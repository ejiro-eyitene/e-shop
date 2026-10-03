import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { mobileAuthCodes, users } from "@/db/schema";
import { createMobileToken, MOBILE_TOKEN_TTL_MS } from "@/lib/mobileAuth";

const Schema = z.object({
  code: z.string().min(20).max(64),
});

/**
 * Redeems a one-time sign-in code for a long-lived bearer token.
 *
 * The code was minted by /api/mobile/session while an Auth.js web session was
 * active. It is marked used in the same statement that reads it, so a replayed
 * code finds nothing to claim -- a read-then-write would leave a window where
 * two simultaneous redemptions could both succeed.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A sign-in code is required." },
      { status: 400 },
    );
  }

  const now = new Date();
  const [redeemed] = await db
    .update(mobileAuthCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(mobileAuthCodes.code, parsed.data.code),
        isNull(mobileAuthCodes.usedAt),
        // `gt` (not `lt`): only still-valid codes are claimable, and this also
        // sweeps away whatever has already expired.
        gt(mobileAuthCodes.expiresAt, now),
      ),
    )
    .returning({ userId: mobileAuthCodes.userId });

  if (!redeemed) {
    return NextResponse.json(
      { error: "That sign-in link has expired. Please try again." },
      { status: 401 },
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, redeemed.userId))
    .limit(1);

  // The account was deleted between minting and redeeming the code.
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json({
    token: createMobileToken(user.id),
    expiresAt: new Date(MOBILE_TOKEN_TTL_MS).toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
  });
}
