import crypto from "node:crypto";

/**
 * Svix webhook signature verification, as used by Clerk.
 *
 * This endpoint writes to the access log and applies roles to newly created
 * accounts. Unverified, it would let anyone who found the URL forge sign-in
 * records — corrupting the evidence a founder relies on — or hand themselves a
 * role. It therefore fails closed on every uncertainty, including a missing
 * secret.
 *
 * Svix signs `"{id}.{timestamp}.{raw body}"` with HMAC-SHA256 keyed on the
 * base64-decoded secret, and sends the result base64-encoded:
 *
 *   svix-id: msg_...
 *   svix-timestamp: 1234567890        (seconds)
 *   svix-signature: v1,<base64> v1a,<base64>
 *
 * Several signatures appear during secret rotation; any one matching is valid.
 * Versions other than `v1` are ignored rather than rejected, so an unknown
 * scheme cannot pass by being unrecognised.
 *
 * Written here rather than taken from the svix package for the same reason as
 * `stripe-signature.ts`: it is short, it is the most security-sensitive code in
 * the path, and a local copy can be tested against tampering and replay
 * directly.
 */
export type VerifyResult = { ok: true } | { ok: false; reason: string };

const DEFAULT_TOLERANCE_SECONDS = 300;

export type SvixHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export function verifySvixSignature({
  payload,
  headers,
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  now = Date.now(),
}: {
  payload: string;
  headers: SvixHeaders;
  secret: string | undefined | null;
  toleranceSeconds?: number;
  now?: number;
}): VerifyResult {
  if (!secret) return { ok: false, reason: "missing webhook secret" };

  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing signature headers" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "malformed timestamp" };

  // A captured request must not work later.
  if (Math.abs(now / 1000 - ts) > toleranceSeconds) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const candidates = signature
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1,"))
    .map((part) => part.slice(3));

  if (candidates.length === 0) return { ok: false, reason: "no v1 signature" };

  const expected = sign(payload, secret, id, ts);
  const matched = candidates.some((candidate) => timingSafeEqual(candidate, expected));
  return matched ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

/** The signature Svix would produce. Exported so tests can forge valid requests. */
export function sign(payload: string, secret: string, id: string, timestamp: number): string {
  // The portion after "whsec_" is base64; the raw bytes are the HMAC key.
  const material = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyBytes = Buffer.from(material, "base64");
  return crypto
    .createHmac("sha256", keyBytes)
    .update(`${id}.${timestamp}.${payload}`, "utf8")
    .digest("base64");
}

/** Constant-time comparison, so a wrong signature cannot be found byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
