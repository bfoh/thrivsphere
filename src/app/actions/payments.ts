"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, consents, orders, pricePlans } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { createCheckoutSession } from "@/lib/stripe";
import {
  INITIAL_REVIEW,
  NOTICE_PERIOD,
  REVIEW_PLAN_SLUG,
  bookingRoute,
  holdTimes,
  sessionsRemaining,
} from "@/lib/allocation";
import {
  getClientCredits,
  nextBookingKind,
  placeBooking,
  releaseClientHolds,
  releaseHold,
} from "@/lib/booking-engine";
import { getOnboardingState } from "@/lib/onboarding";
import { SESSION_MINUTES } from "@/lib/queries/availability";
import { formatAppointment } from "@/lib/slot-groups";
import { policies } from "@/data/policies";
import type { PaymentState } from "@/lib/payment-state";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

/**
 * Start a hosted checkout for a plan.
 *
 * The amount is read from our own price list here rather than taken from the
 * request, so the client cannot choose what to pay. A pending order is written
 * before redirecting, so a payment that completes while the browser is closed
 * still has a row for the webhook to settle against.
 */
export async function startCheckout(
  _prev: PaymentState,
  formData: FormData
): Promise<PaymentState> {
  const planSlug = String(formData.get("planSlug") ?? "").trim();
  if (!planSlug) return { status: "error", message: "Please choose a plan." };

  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "Please sign in first." };
  if (!actor.clientId) return { status: "error", message: "Please finish registering first." };

  const db = getDb();
  const [plan] = await db
    .select()
    .from(pricePlans)
    .where(and(eq(pricePlans.slug, planSlug), eq(pricePlans.active, true)))
    .limit(1);

  if (!plan) return { status: "error", message: "That plan is no longer available." };
  // Paid as it is booked (§19), with the time held: never bought on its own.
  if (plan.slug === REVIEW_PLAN_SLUG) {
    return { status: "error", message: `Your ${INITIAL_REVIEW} is paid for as you book it. Choose a time under Book.` };
  }

  const [client] = await db
    .select({ email: clients.email })
    .from(clients)
    .where(eq(clients.id, actor.clientId))
    .limit(1);

  const [order] = await db
    .insert(orders)
    .values({
      clientId: actor.clientId,
      pricePlanId: plan.id,
      planNameAtPurchase: plan.name,
      amountPence: plan.amountPence,
      currency: plan.currency,
      status: "pending",
    })
    .returning();

  let url: string | null = null;
  try {
    const session = await createCheckoutSession({
      amountPence: plan.amountPence,
      currency: plan.currency,
      productName: `ThriveSphere — ${plan.name}`,
      description: plan.blurb ?? undefined,
      successUrl: `${siteUrl()}/portal/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl()}/portal/payment/cancelled`,
      customerEmail: client?.email ?? undefined,
      metadata: {
        orderId: order.id,
        clientId: actor.clientId,
        planSlug: plan.slug,
        planName: plan.name,
        sessions: String(plan.sessions),
        validityDays: plan.validityDays == null ? "" : String(plan.validityDays),
      },
      // Keyed on the order alone, so retrying this request can never open a
      // second Stripe session for the same order.
      idempotencyKey: `order-${order.id}`,
    });

    url = session.url;
    await db
      .update(orders)
      .set({ checkoutSessionId: session.id })
      .where(eq(orders.id, order.id));
  } catch (err) {
    console.error("[payments] failed to create checkout session", err);
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return {
      status: "error",
      message: "We couldn't start the payment just now. Please try again, or contact us.",
    };
  }

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "orders",
    entityId: order.id,
    subjectClientId: actor.clientId,
    detail: `started checkout for ${plan.name}`,
  });

  if (!url) return { status: "error", message: "Payment could not be started." };
  redirect(url);
}

/**
 * Book the initial consultation and pay for it in one go (IT handover §19,
 * Route A).
 *
 * The client has chosen a time, and a practitioner or "first available", and
 * accepted the booking terms and the 72-hour cancellation notice. The time is
 * held for them, so nobody else can take it while they pay, and they are sent
 * to Stripe. The webhook turns the hold into a booking once Stripe confirms
 * payment; if they do not pay, the hold is released when the checkout expires.
 * The amount is read from our own price list, never from the request.
 */
export async function startBookingCheckout(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "Please sign in first." };
  const onboarding = await getOnboardingState(actor.userId);
  if (onboarding.step !== "complete" || !onboarding.clientId) {
    return { status: "error", message: "Please finish registering first." };
  }
  const clientId = onboarding.clientId;

  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  if (Number.isNaN(startsAt.getTime())) return { status: "error", message: "Please choose a time." };
  const practitionerId = String(formData.get("practitionerId") ?? "").trim() || null;
  if (formData.get("bookingTerms") !== "on") {
    return {
      status: "error",
      message: `Please accept the booking terms and the ${NOTICE_PERIOD}' cancellation notice to continue.`,
    };
  }

  const db = getDb();
  const now = new Date();
  const [booking, owned] = await Promise.all([nextBookingKind(clientId), getClientCredits(clientId)]);
  if (booking !== "review") {
    return { status: "error", message: `Your ${INITIAL_REVIEW} is already booked. You'll find it under Appointments.` };
  }
  if (bookingRoute(booking, sessionsRemaining(owned, now, booking)) !== "checkout") {
    return { status: "error", message: "Your consultation is already paid for. Choose a time to book it." };
  }

  const [plan] = await db
    .select()
    .from(pricePlans)
    .where(and(eq(pricePlans.slug, REVIEW_PLAN_SLUG), eq(pricePlans.active, true)))
    .limit(1);
  if (!plan) {
    return { status: "error", message: "Online booking isn't available just now. Please request a callback instead." };
  }

  // An earlier visit to Stripe that was abandoned holds a time; let it go.
  await releaseClientHolds(clientId);

  const { checkoutExpiresAt, holdExpiresAt } = holdTimes(now);
  const [order] = await db
    .insert(orders)
    .values({
      clientId,
      pricePlanId: plan.id,
      planNameAtPurchase: plan.name,
      amountPence: plan.amountPence,
      currency: plan.currency,
      status: "pending",
    })
    .returning();

  const placed = await placeBooking({
    clientId,
    startsAt,
    packageId: null,
    onlyPractitionerId: practitionerId,
    hold: { orderId: order.id, expiresAt: holdExpiresAt },
    now,
  });
  if (!placed.ok) {
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
    return { status: "error", message: placed.message };
  }

  // The separate, unticked booking acknowledgement (§15.1), pinned to the
  // version of the Cancellation and Refund Policy on screen.
  const h = await headers();
  await db.insert(consents).values({
    clientId,
    type: "booking_terms",
    policySlug: "payments",
    policyVersion: policies.payments?.version ?? null,
    granted: true,
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  });

  const [client] = await db.select({ email: clients.email }).from(clients).where(eq(clients.id, clientId)).limit(1);

  let url: string | null = null;
  try {
    const session = await createCheckoutSession({
      amountPence: plan.amountPence,
      currency: plan.currency,
      productName: `ThriveSphere — ${plan.name}`,
      description: `${formatAppointment(startsAt)} (UK time), ${SESSION_MINUTES} minutes, online`,
      successUrl: `${siteUrl()}/portal/payment/success?booking=1`,
      cancelUrl: `${siteUrl()}/portal/payment/cancelled?booking=1`,
      customerEmail: client?.email ?? undefined,
      metadata: {
        orderId: order.id,
        clientId,
        planSlug: plan.slug,
        planName: plan.name,
        sessions: String(plan.sessions),
        validityDays: plan.validityDays == null ? "" : String(plan.validityDays),
        bookingStartsAt: startsAt.toISOString(),
        bookingPractitionerId: placed.practitionerId,
      },
      idempotencyKey: `order-${order.id}`,
      expiresAt: checkoutExpiresAt,
    });
    url = session.url;
    await db.update(orders).set({ checkoutSessionId: session.id }).where(eq(orders.id, order.id));
  } catch (err) {
    console.error("[payments] failed to create booking checkout", err);
    await releaseHold(order.id);
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return { status: "error", message: "We couldn't start the payment just now. Please try again, or request a callback." };
  }

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "orders",
    entityId: order.id,
    subjectClientId: clientId,
    detail: `started booking checkout for ${plan.name} at ${startsAt.toISOString()}`,
  });

  if (!url) {
    await releaseHold(order.id);
    return { status: "error", message: "Payment could not be started." };
  }
  redirect(url);
}
