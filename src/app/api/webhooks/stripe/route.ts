import { verifyStripeSignature } from "@/lib/stripe-signature";
import { recordAudit } from "@/lib/audit";
import { FULFILLING_EVENTS } from "@/lib/fulfilment";
import {
  applyRefund,
  closeCheckout,
  fulfilCheckout,
  holdForDispute,
  settleDispute,
  type ChargeObject,
  type CheckoutObject,
  type DisputeObject,
} from "@/lib/payment-events";

/**
 * Stripe webhook.
 *
 * Settles payments into sessions, and takes sessions back when a payment is
 * refunded or disputed. What each event does is in `lib/payment-events`.
 * The endpoint in Stripe must send every event type handled below.
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

  if (!event.id) return new Response("Missing event id", { status: 400 });
  const type = event.type ?? "";
  const object = event.data?.object ?? {};

  if (FULFILLING_EVENTS.includes(type)) return fulfilCheckout(event.id, type, object as CheckoutObject);

  switch (type) {
    case "checkout.session.async_payment_failed":
      return closeCheckout(object as CheckoutObject, "failed");
    case "checkout.session.expired":
      return closeCheckout(object as CheckoutObject, "cancelled");
    case "charge.refunded":
      return applyRefund(object as ChargeObject);
    case "charge.dispute.created":
      return holdForDispute(object as DisputeObject);
    case "charge.dispute.closed":
      return settleDispute(object as DisputeObject);
    default:
      // Acknowledged deliberately: retrying an event we will never act on only
      // produces noise in Stripe's dashboard.
      return new Response("Ignored", { status: 200 });
  }
}
