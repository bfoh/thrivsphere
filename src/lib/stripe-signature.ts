import crypto from "node:crypto";

/**
 * Stripe webhook signature verification.
 *
 * The fulfilment endpoint grants paid sessions, so an unverified webhook is a
 * way for anyone who finds the URL to give themselves free appointments.
 * Implemented here rather than pulled from the SDK so it can be tested
 * directly — this is the single most security-sensitive function in the
 * payment path.
 *
 * Stripe signs `"{timestamp}.{raw body}"` with HMAC-SHA256 and sends it as
 *   Stripe-Signature: t=1234567890,v1=<hex>,v1=<hex>
 * Multiple v1 values appear during secret rotation; any one matching is valid.
 */
export type VerifyResult = { ok: true } | { ok: false; reason: string };

const DEFAULT_TOLERANCE_SECONDS = 300;

export function verifyStripeSignature({
  payload,
  header,
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now = Date.now(),
}: {
  payload: string;
  header: string | null;
  secret: string;
  toleranceSeconds?: number;
  now?: number;
}): VerifyResult {
  if (!header) return { ok: false, reason: "missing signature header" };
  if (!secret) return { ok: false, reason: "missing webhook secret" };

  const parts = header.split(",").map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));

  if (!timestamp || signatures.length === 0) {
    return { ok: false, reason: "malformed signature header" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "malformed timestamp" };

  // Reject anything outside the tolerance window, so a captured request cannot
  // be replayed later.
  const ageSeconds = Math.abs(now / 1000 - ts);
  if (ageSeconds > toleranceSeconds) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const matched = signatures.some((candidate) => timingSafeEqual(candidate, expected));
  return matched ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

/** Constant-time comparison, so a wrong signature cannot be found byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Build a signature header. Used by the tests; not needed at runtime. */
export function signPayload(payload: string, secret: string, timestamp: number): string {
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
