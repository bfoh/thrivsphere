"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, pricePlans } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { createCheckoutSession } from "@/lib/stripe";
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
      productName: `ThrivSphere — ${plan.name}`,
      description: plan.blurb ?? undefined,
      successUrl: `${siteUrl()}/portal/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl()}/portal/payment/cancelled`,
      metadata: {
        orderId: order.id,
        clientId: actor.clientId,
        planSlug: plan.slug,
        planName: plan.name,
        sessions: String(plan.sessions),
        validityDays: plan.validityDays == null ? "" : String(plan.validityDays),
      },
      // Keyed on the order, so a double-submitted form cannot create two
      // Stripe sessions for the same intent to pay.
      idempotencyKey: `order-${order.id}-${randomUUID().slice(0, 8)}`,
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
