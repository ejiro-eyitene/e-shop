/**
 * Sends a test order-confirmation email through the real Mailgun code path.
 *
 *   npm run mailgun:testyou@email.com
 *
 * Useful because Mailgun free accounts only deliver to authorized recipients,
 * and because a successful API response does NOT mean the message was
 * actually delivered -- sandbox domains silently discard anything else.
 */
import { loadLocalEnv } from "../src/lib/env";

loadLocalEnv();

import { sendOrderConfirmation } from "../src/lib/mailgun";

const to = process.argv[2];

if (!to) {
  console.error("Usage: npm run mailgun:test -- you@email.com");
  process.exit(1);
}

const apiKey = process.env.MAILGUN_API_KEY ?? "";
const domain = process.env.MAILGUN_DOMAIN ?? "";

/**
 * Mailgun refuses to deliver to unauthorized addresses on free accounts, so
 * check first and give an actionable message instead of a confusing 400.
 */
async function listAuthorized(): Promise<string[]> {
  const res = await fetch(
    `https://api.mailgun.net/v5/sandbox/auth_recipients`,
    { headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { recipients?: { email: string }[] };
  return (data.recipients ?? []).map((r) => r.email.toLowerCase());
}

async function main() {
  console.log(`Domain: ${domain}`);
  console.log(`Sending a test receipt to ${to}…\n`);

  const authorized = await listAuthorized();
  if (authorized.length > 0) {
    const ok = authorized.includes(to.toLowerCase());
    console.log(`Authorized recipients: ${authorized.join(", ")}`);
    if (!ok) {
      console.warn(
        `\n⚠  ${to} is NOT an authorized recipient.\n` +
          `   Mailgun will accept the request but discard the message.\n` +
          `   Add it first:\n` +
          `   curl -u "api:$apiKey" -X POST \\\n` +
          `     https://api.mailgun.net/v5/sandbox/auth_recipients \\\n` +
          `     -F email="${to}"\n`,
      );
    }
  }

  const result = await sendOrderConfirmation({
    to,
    customerName: "Test Customer",
    orderId: 0,
    items: [
      { name: "Anasa Oba Ankara Wrap", quantity: 1, unitPriceInKobo: 1_850_000 },
      { name: "Pure Shea Butter Lotion (400ml)", quantity: 2, unitPriceInKobo: 285_000 },
    ],
    totalInKobo: 2_420_000,
  });

  console.log("\n✅ Accepted by Mailgun");
  console.log(`   id: ${result.id}`);

  // "Accepted" only means queued. Gmail rejects many sandbox-domain messages
  // on DMARC grounds after this point, so poll the events log for the verdict.
  console.log("\nWaiting for the delivery verdict…");
  const verdict = await waitForDelivery(String(result.id));

  if (verdict === "delivered") {
    console.log("\n🎉 Delivered. The email is in the inbox.");
  } else if (verdict === "failed") {
    console.error("\n❌ REJECTED BY THE RECIPIENT SERVER (commonly Gmail).");
    console.error(
      "   This is the known sandbox-domain DMARC problem: the From: domain\n" +
        "   is not aligned with Mailgun's DKIM record, so Gmail blocks it even\n" +
        "   for authorized recipients. A real (verified) sending domain fixes it.",
    );
  } else {
    console.log("\n⚠  No terminal event yet — check back in a minute.");
  }
}

type EventItem = {
  event: string;
  "message-id"?: string;
  reason?: string;
  delivery?: {
    status?: string;
    code?: number;
    description?: string;
  };
  reject?: { reason?: string };
};

async function waitForDelivery(messageId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((r) => setTimeout(r, 4000));

    const res = await fetch(
      `https://api.mailgun.net/v3/${domain}/events?limit=20`,
      { headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` } },
    );
    if (!res.ok) return "unknown";

    const data = (await res.json()) as { items?: EventItem[] };
    const mine = (data.items ?? []).filter((e) => e["message-id"] === messageId);

    const terminal = mine.find((e) =>
      ["delivered", "failed", "rejected"].includes(e.event),
    );
    if (terminal) {
      if (terminal.event === "failed") {
        console.error(`   reason: ${terminal.reason ?? "unknown"}`);
        console.error(
          `   ${terminal.delivery?.description?.replace(/\n/g, " ") ?? ""}`,
        );
      }
      return terminal.event;
    }
  }
  return "unknown";
}

main().catch((error) => {
  console.error("\n❌ Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});