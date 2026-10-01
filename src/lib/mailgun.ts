import Mailgun from "mailgun.js";
import { naira } from "./formatters";

function client() {
  const apiKey = process.env.MAILGUN_API_KEY;
  if (!apiKey || !process.env.MAILGUN_DOMAIN) {
    throw new Error(
      "MAILGUN_API_KEY and MAILGUN_DOMAIN must be set to send email.",
    );
  }

  // mailgun.js wants a FormData constructor; Node 18+ provides one globally.
  // `useFetch` skips the axios streaming path, which is better for serverless.
  return new Mailgun(FormData).client({
    username: "api",
    key: apiKey,
    useFetch: true,
  });
}

export async function sendOrderConfirmation(input: {
  to: string;
  customerName: string;
  orderId: number;
  items: { name: string; quantity: number; unitPriceInKobo: number }[];
  totalInKobo: number;
}) {
  const domain = process.env.MAILGUN_DOMAIN!;
  const from = process.env.MAILGUN_FROM ?? `Shop <no-reply@${domain}>`;

  const rows = input.items
    .map(
      (i) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${i.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${naira(i.unitPriceInKobo)}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2>Thank you for your order, ${escapeHtml(input.customerName)}!</h2>
      <p>Your order <strong>#${input.orderId}</strong> has been received and is being prepared.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0">
        <thead>
          <tr>
            <th align="left" style="padding:8px;border-bottom:2px solid #ddd">Item</th>
            <th align="right" style="padding:8px;border-bottom:2px solid #ddd">Qty</th>
            <th align="right" style="padding:8px;border-bottom:2px solid #ddd">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" align="right" style="padding:8px;font-weight:bold">Total</td>
            <td align="right" style="padding:8px;font-weight:bold">${naira(input.totalInKobo)}</td>
          </tr>
        </tfoot>
      </table>
      <p>You will receive another email when your order ships.</p>
    </div>
  `;

  const res = await client().messages.create(domain, {
    from,
    to: input.to,
    subject: `Order #${input.orderId} confirmed`,
    html,
  });

  // Mailgun returns 200 even when the message is queued for later delivery.
  return res;
}

/** Prevents user-supplied names from injecting markup into the email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}