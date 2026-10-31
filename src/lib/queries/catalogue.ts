import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pricePlans, services } from "@/db/schema";
import { toService } from "@/lib/service-content";

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

/** The services shown on the website, in display order, worded as the owner set them. */
export async function getPublishedServices() {
  const rows = await getDb()
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder));
  return rows.map(toService);
}
