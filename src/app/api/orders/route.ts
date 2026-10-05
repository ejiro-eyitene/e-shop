import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, orderItems, orders, products, users } from "@/db/schema";
import { auth } from "@/auth";
import { bearerFrom, verifyMobileToken } from "@/lib/mobileAuth";
import { initializePayment, type InitializeResponse } from "@/lib/paystack";
import {
  DEFAULT_DELIVERY_TYPE,
  NIGERIAN_STATES,
  deliveryFeeInKobo,
  getDeliveryType,
} from "@/lib/shipping";

const CheckoutSchema = z.object({
  email: z.string().email("A valid email is required for your receipt."),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  state: z.string().min(1, "Select a delivery state."),
  city: z.string().min(1),
  shippingAddress: z.string().min(1),
  deliveryNotes: z.string().max(500).optional().default(""),
  deliveryType: z.string().min(1).default(DEFAULT_DELIVERY_TYPE),
  // Recorded for the receipt and fulfilment team; Paystack hosts all three
  // behind one redirect, so the chosen channel does not alter this flow.
  paymentType: z.enum(["card", "bank", "ussd"]).default("card"),
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
  // Mobile shoppers authenticate with an HMAC bearer token rather than a
  // session cookie, so resolve the owner from whichever credential arrived.
  // A bearer token wins when both are present: it is the explicit intent.
  const mobileUser = await verifyMobileToken(bearerFrom(req));

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

  const { items } = parsed.data;
  const {
    email,
    customerName,
    phone,
    state,
    city,
    shippingAddress,
    deliveryNotes,
    deliveryType,
    paymentType,
  } = parsed.data;

  // Guard the two values that must agree with the server's own list, so a
  // hand-crafted request cannot label a Lagos order as shipping to Antarctica.
  if (!NIGERIAN_STATES.includes(state)) {
    return NextResponse.json(
      { error: "Select a valid delivery state." },
      { status: 400 },
    );
  }

  const delivery = getDeliveryType(deliveryType);
  if (!delivery) {
    return NextResponse.json(
      { error: "Select a valid delivery method." },
      { status: 400 },
    );
  }

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

  // Delivery fee is re-derived here, never read from the request body.
const subtotalInKobo = items.reduce(
  (sum, i) => sum + i.quantity * priceById.get(i.productId)!.priceInKobo,
  0,
);
const deliveryChargeInKobo = deliveryFeeInKobo(deliveryType);
const totalInKobo = subtotalInKobo + deliveryChargeInKobo;

  const reference = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  // Guests may check out, so fall back to a placeholder owner row.
  const userId =
    mobileUser?.id ?? session?.user?.id ?? (await ensureUser(email, customerName));

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      email,
      totalInKobo,
      status: "pending",
      paystackReference: reference,
      shippingAddress: JSON.stringify({
        phone,
        customerName,
        state,
        city,
        shippingAddress,
        deliveryNotes,
        deliveryType,
        paymentType,
        subtotalInKobo,
        deliveryChargeInKobo,
      }),
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

  let payment: InitializeResponse;
  try {
    payment = await initializePayment({
      email,
      amountInKobo: totalInKobo,
      reference,
      callbackUrl: `${origin}/checkout/verify?reference=${reference}`,
    });
  } catch (err) {
    // The order rows are already written, so without this the shopper would have
    // an unpayable "pending" order that also blocks nothing. Mark it failed and
    // surface the real reason instead of handing back a broken redirect.
    await db
      .update(orders)
      .set({ status: "failed" })
      .where(eq(orders.id, order!.id));

    console.error("Paystack initialisation failed", { orderId: order!.id, err });
    return NextResponse.json(
      {
        error:
          "We could not start the payment. No charge was made — please try again.",
      },
      { status: 502 },
    );
  }

  // The cart is only consumed once payment is genuinely in progress, so a
  // failed initialisation leaves the shopper's cart intact.
  await db.delete(cartItems).where(eq(cartItems.userId, userId));

  return NextResponse.json({
    orderId: order!.id,
    reference,
    authorizationUrl: payment.authorization_url,
    subtotalInKobo,
    deliveryChargeInKobo,
    totalInKobo,
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

/**
 * Order history for the signed-in shopper.
 *
 * Mirrors what the web /orders page shows, so the same account sees the same
 * orders in both places. Scoped strictly to the authenticated user id, so one
 * account can never read another's orders.
 */
export async function GET(req: Request) {
  const user = await verifyMobileToken(bearerFrom(req));
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view your orders." },
      { status: 401 },
    );
  }

  try {
    const list = await db
      .select({
        id: orders.id,
        totalInKobo: orders.totalInKobo,
        status: orders.status,
        reference: orders.paystackReference,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));

    const ids = list.map((o) => o.id);
    const lines = ids.length
      ? await db
          .select({
            orderId: orderItems.orderId,
            quantity: orderItems.quantity,
            unitPriceInKobo: orderItems.unitPriceInKobo,
            name: products.name,
            slug: products.slug,
          })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(inArray(orderItems.orderId, ids))
      : [];

    const byOrder = new Map<number, typeof lines>();
    for (const line of lines) {
      const bucket = byOrder.get(line.orderId);
      if (bucket) bucket.push(line);
      else byOrder.set(line.orderId, [line]);
    }

    return NextResponse.json(
      {
        orders: list.map((o) => ({
          id: o.id,
          totalInKobo: o.totalInKobo,
          status: o.status,
          reference: o.reference,
          createdAt: o.createdAt,
          items: (byOrder.get(o.id) ?? []).map((l) => ({
            name: l.name,
            slug: l.slug,
            quantity: l.quantity,
            unitPriceInKobo: l.unitPriceInKobo,
            lineTotalInKobo: l.quantity * l.unitPriceInKobo,
          })),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Order history failed:", error);
    return NextResponse.json(
      { error: "Could not load your orders." },
      { status: 500 },
    );
  }
}
