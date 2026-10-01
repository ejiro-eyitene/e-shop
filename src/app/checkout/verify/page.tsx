import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { verifyPayment } from "@/lib/paystack";
import { sendOrderConfirmation } from "@/lib/mailgun";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  if (!reference) {
    redirect("/checkout?error=missing-reference");
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.paystackReference, reference))
    .limit(1);

  if (!order) {
    redirect("/checkout?error=unknown-order");
  }

  // Never trust the browser redirect — confirm with Paystack's API.
  if (order.status === "pending") {
    let payment;
    try {
      payment = await verifyPayment(reference);
    } catch (error) {
      console.error("Paystack verification failed:", error);
      redirect(`/checkout?error=verification-failed`);
    }

    if (payment.status === "success" && payment.amount === order.totalInKobo) {
      await db
        .update(orders)
        .set({ status: "paid" })
        .where(eq(orders.id, order.id));

      const items = await db
        .select({
          name: products.name,
          quantity: orderItems.quantity,
          unitPriceInKobo: orderItems.unitPriceInKobo,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      // A failed receipt must not block the shopper from seeing success.
      try {
        await sendOrderConfirmation({
          to: order.email,
          customerName: "Customer",
          orderId: order.id,
          items,
          totalInKobo: order.totalInKobo,
        });
      } catch (error) {
        console.error("Confirmation email failed to send:", error);
      }
    } else {
      await db
        .update(orders)
        .set({ status: "failed" })
        .where(eq(orders.id, order.id));
      redirect("/checkout?error=payment-failed");
    }
  }

  redirect(`/checkout/success?reference=${reference}`);
}