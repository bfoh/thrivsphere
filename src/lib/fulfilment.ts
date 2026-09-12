/**
 * Turning a completed payment into sessions the client can book.
 *
 * Pure and tested. Payment webhooks are delivered at least once and can arrive
 * out of order, so the rules about what a payment entitles someone to are
 * worth asserting rather than trusting to a happy path that ran correctly in
 * manual testing.
 */

export type CheckoutMetadata = {
  clientId?: string | null;
  planSlug?: string | null;
  planName?: string | null;
  sessions?: string | null;
  validityDays?: string | null;
};

export type ParsedCheckout = {
  clientId: string;
  planSlug: string;
  planName: string;
  sessions: number;
  validityDays: number | null;
};

export type ParseResult =
  | { ok: true; value: ParsedCheckout }
  | { ok: false; reason: string };

/**
 * Read the metadata we attached when creating the Checkout Session.
 *
 * Everything is validated rather than trusted. Metadata comes back from a
 * third party, and a malformed or missing field must fail loudly instead of
 * quietly crediting the wrong number of sessions.
 */
export function parseCheckoutMetadata(meta: CheckoutMetadata): ParseResult {
  const clientId = meta.clientId?.trim();
  const planSlug = meta.planSlug?.trim();
  const planName = meta.planName?.trim();

  if (!clientId) return { ok: false, reason: "missing clientId" };
  if (!planSlug) return { ok: false, reason: "missing planSlug" };

  const sessions = Number(meta.sessions);
  if (!Number.isInteger(sessions) || sessions < 1 || sessions > 100) {
    return { ok: false, reason: `invalid session count: ${meta.sessions}` };
  }

  let validityDays: number | null = null;
  if (meta.validityDays != null && meta.validityDays !== "") {
    const v = Number(meta.validityDays);
    if (!Number.isInteger(v) || v < 1 || v > 3650) {
      return { ok: false, reason: `invalid validityDays: ${meta.validityDays}` };
    }
    validityDays = v;
  }

  return {
    ok: true,
    value: { clientId, planSlug, planName: planName || planSlug, sessions, validityDays },
  };
}

/** When a package bought now stops being usable. Null means no expiry. */
export function packageExpiry(validityDays: number | null, from: Date = new Date()): Date | null {
  if (validityDays == null) return null;
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + validityDays);
  return expires;
}

/**
 * Whether the amount Stripe actually charged matches what the plan costs.
 *
 * Checkout is created server-side from our own price list, so this should
 * always agree — but verifying it is what stops a tampered or stale session
 * granting six sessions for the price of one.
 */
export function amountMatches(
  chargedPence: number | null | undefined,
  expectedPence: number
): boolean {
  return typeof chargedPence === "number" && chargedPence === expectedPence;
}

/**
 * Whether a webhook event should be acted on.
 *
 * Stripe retries until it gets a 2xx, so the same event can arrive repeatedly.
 * Fulfilment must happen exactly once — a client paying for four sessions and
 * receiving eight is a refund conversation; receiving zero is a complaint.
 */
export function shouldFulfil(params: {
  eventType: string;
  paymentStatus: string | null | undefined;
  alreadyProcessed: boolean;
}): boolean {
  if (params.alreadyProcessed) return false;
  if (params.eventType !== "checkout.session.completed") return false;
  return params.paymentStatus === "paid";
}
