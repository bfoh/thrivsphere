import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pricePlans } from "@/db/schema";

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
