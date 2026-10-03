import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { bearerFrom, verifyMobileToken } from "@/lib/mobileAuth";

/**
 * Folds a guest's AsyncStorage cart into the signed-in user's database cart.
 *
 * Called once right after login. Quantities are summed per product and then
 * clamped to current stock, so merging can never create an over-large line.
 * Unknown products are reported back rather than silently dropped, letting the
 * app tell the shopper why something disappeared.
 */

const MergeSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .max(100, "Your cart has too many items to sync.")
    .default([]),
});

export async function POST(req: Request) {
  const user = await verifyMobileToken(bearerFrom(req));
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to sync your cart." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = MergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid merge payload." },
      { status: 400 },
    );
  }

  const { items } = parsed.data;
  if (items.length === 0) {
    return NextResponse.json({
      merged: 0,
      skipped: [],
      items: [],
      subtotalInKobo: 0,
    });
  }

  // Sum duplicates in the payload itself before touching the database.
  const wanted = new Map<number, number>();
  for (const item of items) {
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
  }

  const productIds = [...wanted.keys()];
  const found = await db
    .select({ id: products.id, stock: products.stock })
    .from(products)
    .where(inArray(products.id, productIds));

  const stockById = new Map(found.map((p) => [p.id, p.stock]));
  const skipped: { productId: number; reason: string }[] = [];
  let merged = 0;

  for (const [productId, quantity] of wanted) {
    const stock = stockById.get(productId);

    if (stock === undefined) {
      skipped.push({ productId, reason: "no longer available" });
      continue;
    }

    const [existing] = await db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(
        and(eq(cartItems.userId, user.id), eq(cartItems.productId, productId)),
      )
      .limit(1);

    // Clamp rather than reject: a shopper who queued 5 while the stock dropped
    // to 2 should end up with 2, not an error.
    const total = Math.min((existing?.quantity ?? 0) + quantity, stock);

    if (total < 1) {
      skipped.push({ productId, reason: "out of stock" });
      continue;
    }
    if (total < (existing?.quantity ?? 0) + quantity) {
      skipped.push({ productId, reason: `only ${stock} in stock` });
    }

    await db
      .insert(cartItems)
      .values({ userId: user.id, productId, quantity: total })
      .onConflictDoUpdate({
        target: [cartItems.userId, cartItems.productId],
        set: { quantity: total, updatedAt: new Date() },
      });

    merged++;
  }

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
    .where(eq(cartItems.userId, user.id))
    .orderBy(cartItems.createdAt);

  return NextResponse.json({
    merged,
    skipped,
    items: rows.map((r) => ({
      ...r,
      lineTotalInKobo: r.quantity * r.priceInKobo,
    })),
    subtotalInKobo: rows.reduce((sum, r) => sum + r.quantity * r.priceInKobo, 0),
  });
}
