import "server-only";

/**
 * Minimal Stripe client.
 *
 * Talks to Stripe's REST API directly rather than through the SDK: the only
 * calls needed are creating a Checkout Session and reading one back, and
 * webhook signatures are verified in `stripe-signature.ts`. That keeps a large
 * dependency out of the payment path and leaves the behaviour readable.
 *
 * Card details never reach this application — Checkout is hosted by Stripe, so
 * PCI scope stays outside ThrivSphere entirely.
 */
const API = "https://api.stripe.com/v1";

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return key;
}

/** Stripe's API takes form-encoded bodies, including nested keys. */
function encode(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    if (v === undefined || v === null) return [];
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) {
      return encode(v as Record<string, unknown>, key);
    }
    if (Array.isArray(v)) {
      return v.flatMap((item, i) =>
        typeof item === "object"
          ? encode(item as Record<string, unknown>, `${key}[${i}]`)
          : [`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`]
      );
    }
    return [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];
  });
}

async function stripeRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: Record<string, unknown>; idempotencyKey?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers,
    body: init.body ? encode(init.body).join("&") : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    const message = json?.error?.message ?? `Stripe returned ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
};

export async function createCheckoutSession(params: {
  amountPence: number;
  currency: string;
  productName: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>("/checkout/sessions", {
    method: "POST",
    idempotencyKey: params.idempotencyKey,
    body: {
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail,
      // Prices are built from our own catalogue at request time rather than
      // from a Stripe price id, so the amount charged always matches the
      // plan the client actually clicked.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.amountPence,
            product_data: {
              name: params.productName,
              description: params.description,
            },
          },
        },
      ],
      metadata: params.metadata,
      payment_intent_data: { metadata: params.metadata },
    },
  });
}

export async function retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}
