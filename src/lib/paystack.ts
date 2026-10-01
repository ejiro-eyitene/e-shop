const BASE = "https://api.paystack.co";

function authHeader(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is missing from your environment.");
  }
  return `Bearer ${key}`;
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const json = await res.json();

  if (!res.ok || json.status === false) {
    throw new Error(
      `Paystack ${path} failed: ${json.message ?? res.statusText}`,
    );
  }
  return json.data as T;
}

export type InitializeResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export function initializePayment(input: {
  email: string;
  /** Amount in kobo — Paystack's minor unit. */
  amountInKobo: number;
  reference: string;
  callbackUrl: string;
}): Promise<InitializeResponse> {
  return paystackFetch<InitializeResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountInKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
    }),
  });
}

export type VerifyResponse = {
  id: number;
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number;
  email: string;
};

/**
 * Server-side confirmation of a payment. Never trust the browser redirect
 * alone — always verify with Paystack before marking an order paid.
 */
export function verifyPayment(reference: string): Promise<VerifyResponse> {
  return paystackFetch<VerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}