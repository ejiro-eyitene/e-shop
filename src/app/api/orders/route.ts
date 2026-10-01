import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import { auth } from "@/auth";
import { initializePayment } from "@/lib/paystack";

const CheckoutSchema = z.object({
  email: z.string().email("A valid email is required for your receipt."),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  shippingAddress: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1, "Your cart is empty."),
});

export async function POST(req: Request) {
  const session = await auth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid checkout data." },
      { status: 400 },
    );
  }

  const { email, customerName, phone, shippingAddress, items } = parsed.data;

  // Prices MUST be read from the database — never trust the request body.
  const productIds = [...new Set(items.map((i) => i.productId))];
  const found = await db
    .select({
      id: products.id,
      name: products.name,
      priceInKobo: products.priceInKobo,
      stock: products.stock,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  if (found.length !== productIds.length) {
    return NextResponse.json(
      { error: "One or more products are no longer available." },
      { status: 400 },
    );
  }

  const priceById = new Map(found.map((p) => [p.id, p]));

  for (const item of items) {
    const product = priceById.get(item.productId)!;
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Only ${product.stock} of "${product.name}" left in stock.` },
        { status: 400 },
      );
    }
  }

  const totalInKobo = items.reduce(
    (sum, i) => sum + i.quantity * priceById.get(i.productId)!.priceInKobo,
    0,
  );

  const reference = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  // Guests may check out, so fall back to a placeholder owner row.
  const userId = session?.user?.id ?? (await ensureUser(email, customerName));

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      email,
      totalInKobo,
      status: "pending",
      paystackReference: reference,
      shippingAddress: JSON.stringify({ phone, shippingAddress }),
    })
    .returning({ id: orders.id });

  await db.insert(orderItems).values(
    items.map((i) => ({
      orderId: order!.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPriceInKobo: priceById.get(i.productId)!.priceInKobo,
    })),
  );

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  const payment = await initializePayment({
    email,
    amountInKobo: totalInKobo,
    reference,
    callbackUrl: `${origin}/checkout/verify?reference=${reference}`,
  });

  return NextResponse.json({
    orderId: order!.id,
    reference,
    authorizationUrl: payment.authorization_url,
  });
}

/** Reuses an existing account by email, or creates a guest-owned row. */
async function ensureUser(email: string, name: string): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(users)
    .values({ email, name })
    .returning({ id: users.id });

  return created!.id;
}