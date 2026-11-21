import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pricePlans, services } from "@/db/schema";
import { toService } from "@/lib/service-content";
import { REVIEW_PLAN_SLUG } from "@/lib/allocation";
import { displayPrice } from "@/lib/money";

/**
 * The plans on sale, in display order.
 *
 * The one price list: the public pricing page, the client's purchase page and
 * Stripe checkout all read this table, so a price is changed in one place.
 */
export async function getActivePlans() {
  return getDb()
    .select()
    .from(pricePlans)
    .where(eq(pricePlans.active, true))
    .orderBy(asc(pricePlans.sortOrder));
}

/**
 * The initial consultation's price as shown to people, e.g. "£30". Read from
 * the price list so the booking pages follow a change made in Services &
 * prices; "£30" (IT handover §19) if the plan cannot be read.
 */
export async function getInitialConsultationPrice(): Promise<{ pence: number; label: string }> {
  try {
    const [plan] = await getDb()
      .select({ amountPence: pricePlans.amountPence })
      .from(pricePlans)
      .where(eq(pricePlans.slug, REVIEW_PLAN_SLUG))
      .limit(1);
    if (plan) return { pence: plan.amountPence, label: displayPrice(plan.amountPence) };
  } catch (err) {
    console.error("[catalogue] initial consultation price unavailable", err);
  }
  return { pence: 3000, label: "£30" };
}

/** The services shown on the website, in display order, worded as the owner set them. */
export async function getPublishedServices() {
  const rows = await getDb()
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder));
  return rows.map(toService);
}
