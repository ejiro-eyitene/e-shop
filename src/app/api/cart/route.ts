import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { bearerFrom, verifyMobileToken } from "@/lib/mobileAuth";
import type { MobileUser } from "@/lib/mobileAuth";

/**
 * Server-side cart for signed-in native clients.
 *
 * Guests keep their cart in AsyncStorage and merge it via /api/cart/merge, so
 * every route here requires a valid bearer token.
 */

async function requireUser(req: Request): Promise<
  { user: MobileUser } | { error: NextResponse }
> {
  const user = await verifyMobileToken(bearerFrom(req));
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Sign in to sync your cart." },
        { status: 401 },
      ),
    };
  }
  return { user };
}

/** Reads the cart joined to products so the client can render lines directly. */
async function readCart(userId: string) {
  const rows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      slug: products.slug,
      name: products.name,
      priceInKobo: products.priceInKobo,
      imageUrl: products.imageUrl,
      stock: products.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(cartItems.createdAt);

  const subtotalInKobo = rows.reduce(
    (sum, r) => sum + r.quantity * r.priceInKobo,
    0,
  );

  return {
    items: rows.map((r) => ({ ...r, lineTotalInKobo: r.quantity * r.priceInKobo })),
    subtotalInKobo,
  };
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  try {
    return NextResponse.json(await readCart(auth.user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Cart fetch failed:", error);
    return NextResponse.json({ error: "Could not load your cart." }, { status: 500 });
  }
}

const AddSchema = z.object({
  productId: z.number().int().positive(),
  /** Sent by the client for a cart already containing this line. */
  quantity: z.number().int().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid cart item." },
      { status: 400 },
    );
  }

  const { productId, quantity } = parsed.data;

  // Stock and price are read from the database, never from the request body.
  const [product] = await db
    .select({ id: products.id, stock: products.stock })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "That product is unavailable." }, { status: 404 });
  }

  const [existing] = await db
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(
      and(eq(cartItems.userId, auth.user.id), eq(cartItems.productId, productId)),
    )
    .limit(1);

  const desired = (existing?.quantity ?? 0) + (quantity ?? 1);
  if (desired > product.stock) {
    return NextResponse.json(
      { error: `Only ${product.stock} in stock.` },
      { status: 400 },
    );
  }

  // Upsert rather than insert, so adding the same product twice bumps the
  // quantity instead of creating a duplicate line.
  await db
    .insert(cartItems)
    .values({ userId: auth.user.id, productId, quantity: desired })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity: desired, updatedAt: new Date() },
    });

  return NextResponse.json(await readCart(auth.user.id), { status: 200 });
}

/**
 * DELETE with a productId and optional quantity.
 *
 * A positive quantity sets an absolute count; omitting it (or sending 0)
 * removes the line entirely.
 */
export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);

  // The body can only be read once, so it is parsed a single time and reused
  // for both fields. Reading it twice would leave the second call with a
  // consumed stream and silently fall back to undefined.
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);

  const rawId = url.searchParams.get("productId") ?? body.productId;
  const productId = Number(rawId);
  const rawQty = url.searchParams.get("quantity") ?? body.quantity;
  const quantity = Number(rawQty);

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "A productId is required." }, { status: 400 });
  }

  const [product] = await db
    .select({ stock: products.stock })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (Number.isInteger(quantity) && quantity > 0) {
    if (!product) {
      return NextResponse.json({ error: "That product is unavailable." }, { status: 404 });
    }
    if (quantity > product.stock) {
      return NextResponse.json(
        { error: `Only ${product.stock} in stock.` },
        { status: 400 },
      );
    }
    await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(
        and(eq(cartItems.userId, auth.user.id), eq(cartItems.productId, productId)),
      );
  } else {
    await db
      .delete(cartItems)
      .where(
        and(eq(cartItems.userId, auth.user.id), eq(cartItems.productId, productId)),
      );
  }

  return NextResponse.json(await readCart(auth.user.id));
}
