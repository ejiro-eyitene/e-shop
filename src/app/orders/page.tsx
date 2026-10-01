import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { naira } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      {list.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-base-content/60 mb-6">
            You haven&apos;t placed any orders yet.
          </p>
          <Link href="/" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto card bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs">#{o.id}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString("en-NG")}</td>
                  <td>
                    <span
                      className={`badge ${
                        o.status === "paid"
                          ? "badge-success"
                          : o.status === "failed"
                            ? "badge-error"
                            : "badge-warning"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="text-right font-medium">
                    {naira(o.totalInKobo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}