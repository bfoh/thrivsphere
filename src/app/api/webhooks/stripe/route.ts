import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, orders, packages } from "@/db/schema";
import { verifyStripeSignature } from "@/lib/stripe-signature";
import { amountMatches, packageExpiry, parseCheckoutMetadata, shouldFulfil } from "@/lib/fulfilment";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { paymentReceipt } from "@/lib/email-templates";

/**
 * Stripe fulfilment webhook.
 *
 * Fulfilment happens here rather than on the success redirect, because a
 * client may close the browser the moment they pay. The redirect is only a
 * confirmation screen; this is what actually grants the sessions.
 *
 * The endpoint is unauthenticated by necessity — Stripe has no session — so
 * the signature check is the only thing standing between this and anyone
 * granting themselves free appointments. It fails closed.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  const verified = verifyStripeSignature({
    payload,
    header: signature,
    secret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  });

  if (!verified.ok) {
    console.error("[stripe] rejected webhook:", verified.reason);
    await recordAudit({
      actorId: null,
      action: "permission_denied",
      entity: "orders",
      detail: `rejected Stripe webhook: ${verified.reason}`,
    });
    return new Response("Invalid signature", { status: 400 });
  }

  let event: {
    id?: string;
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const eventId = event.id;
  const session = (event.data?.object ?? {}) as {
    id?: string;
    payment_status?: string;
    amount_total?: number;
    payment_intent?: string;
    metadata?: Record<string, string>;
  };

  if (!eventId) return new Response("Missing event id", { status: 400 });

  const db = getDb();

  // Stripe retries until it gets a 2xx, so a replay must be a no-op rather
  // than a second package.
  const [alreadySeen] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.processedEventId, eventId))
    .limit(1);

  if (
    !shouldFulfil({
      eventType: event.type ?? "",
      paymentStatus: session.payment_status,
      alreadyProcessed: !!alreadySeen,
    })
  ) {
    // Acknowledged deliberately: retrying an event we will never act on only
    // produces noise in Stripe's dashboard.
    return new Response("Ignored", { status: 200 });
  }

  const parsed = parseCheckoutMetadata(session.metadata ?? {});
  if (!parsed.ok) {
    console.error("[stripe] unusable metadata:", parsed.reason);
    return new Response("Unusable metadata", { status: 400 });
  }

  const orderId = session.metadata?.orderId;
  if (!orderId) return new Response("Missing order reference", { status: 400 });

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return new Response("Unknown order", { status: 400 });
  if (order.status === "paid") return new Response("Already settled", { status: 200 });

  // Checkout is created from our own catalogue, so this should always agree —
  // verifying it is what stops a stale or tampered session granting six
  // sessions for the price of one.
  if (!amountMatches(session.amount_total, order.amountPence)) {
    console.error(
      "[stripe] amount mismatch",
      { charged: session.amount_total, expected: order.amountPence, orderId }
    );
    await recordAudit({
      actorId: null,
      action: "permission_denied",
      entity: "orders",
      entityId: orderId,
      subjectClientId: order.clientId,
      detail: `payment amount mismatch: charged ${session.amount_total}, expected ${order.amountPence}`,
    });
    return new Response("Amount mismatch", { status: 400 });
  }

  await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      paymentIntentId: session.payment_intent ?? null,
      processedEventId: eventId,
    })
    .where(eq(orders.id, orderId));

  await db.insert(packages).values({
    clientId: order.clientId,
    orderId: order.id,
    sessionsTotal: parsed.value.sessions,
    sessionsUsed: 0,
    status: "active",
    expiresAt: packageExpiry(parsed.value.validityDays),
  });

  await recordAudit({
    actorId: null,
    action: "update",
    entity: "orders",
    entityId: orderId,
    subjectClientId: order.clientId,
    detail: `payment settled: ${parsed.value.planName}, ${parsed.value.sessions} session(s)`,
  });

  /*
   * Receipt.
   *
   * Sent after the sessions are credited, and deliberately after the point of
   * no return: if the mail fails, the client has still been given what they
   * paid for. Returning anything but a 2xx here would make Stripe retry the
   * whole event, and the replay guard would then refuse to fulfil it again —
   * so a failed receipt must never fail the request.
   *
   * Receipts are not subject to the reminder opt-out. Someone who has paid is
   * entitled to a record of it.
   */
  try {
    const [client] = await db
      .select({ email: clients.email })
      .from(clients)
      .where(eq(clients.id, order.clientId))
      .limit(1);

    if (client?.email) {
      const receipt = paymentReceipt(
        parsed.value.planName,
        order.amountPence,
        parsed.value.sessions
      );
      const sent = await sendEmail({
        to: client.email,
        subject: receipt.subject,
        text: receipt.text,
        html: receipt.html,
      });
      if (!sent.ok) console.error("[stripe] receipt not sent:", sent.reason, orderId);
    }
  } catch (err) {
    console.error("[stripe] receipt failed", orderId, err);
  }

  return new Response("Fulfilled", { status: 200 });
}
