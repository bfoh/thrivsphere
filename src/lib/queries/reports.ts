import "server-only";

import { and, count, eq, gte, lt, sql, sum } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  clients,
  enquiries,
  orders,
  referrals,
  safeguardingConcerns,
} from "@/db/schema";
import { requireCapability } from "@/lib/guard";

export type ReportRange = { from: Date; to: Date; label: string };

/** Calendar months back from today, used for the period selector. */
export function monthRange(monthsAgo = 0): ReportRange {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  return {
    from,
    to,
    label: from.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

/**
 * Service activity for a period.
 *
 * Deliberately counts rather than lists. A CIC reporting to funders or a board
 * needs totals — how many people were supported, how many sessions delivered,
 * how many safeguarding concerns raised — and pulling those from aggregates
 * means no one has to open a client record to produce a report.
 */
export async function getReport(range: ReportRange) {
  await requireCapability("report:read", {
    entity: "reports",
    action: "view",
    detail: `ran the service report for ${range.label}`,
  });

  const db = getDb();
  // Half-open [from, to) so a row on a boundary is counted in exactly one
  // period and never in both.
  const within = (col: AnyColumn) => and(gte(col, range.from), lt(col, range.to));

  const [
    newClients,
    delivered,
    cancelled,
    noShows,
    booked,
    income,
    concernsRaised,
    concernsEscalated,
    referralsMade,
    newEnquiries,
    activeClients,
  ] = await Promise.all([
    db.select({ n: count() }).from(clients).where(within(clients.createdAt)),
    db
      .select({ n: count() })
      .from(appointments)
      .where(and(within(appointments.startsAt), eq(appointments.status, "completed"))),
    db
      .select({ n: count() })
      .from(appointments)
      .where(
        and(
          within(appointments.startsAt),
          sql`${appointments.status} in ('cancelled_by_client','cancelled_by_service')`
        )
      ),
    db
      .select({ n: count() })
      .from(appointments)
      .where(and(within(appointments.startsAt), eq(appointments.status, "no_show"))),
    db.select({ n: count() }).from(appointments).where(within(appointments.startsAt)),
    db
      .select({ total: sum(orders.amountPence) })
      .from(orders)
      .where(and(within(orders.createdAt), eq(orders.status, "paid"))),
    db
      .select({ n: count() })
      .from(safeguardingConcerns)
      .where(within(safeguardingConcerns.raisedAt)),
    db
      .select({ n: count() })
      .from(safeguardingConcerns)
      .where(
        and(within(safeguardingConcerns.raisedAt), sql`${safeguardingConcerns.escalatedAt} is not null`)
      ),
    db.select({ n: count() }).from(referrals).where(within(referrals.madeAt)),
    db.select({ n: count() }).from(enquiries).where(within(enquiries.createdAt)),
    db.select({ n: count() }).from(clients).where(eq(clients.status, "active")),
  ]);

  const deliveredN = delivered[0].n;
  const noShowsN = noShows[0].n;
  const attendable = deliveredN + noShowsN;

  return {
    range,
    newClients: newClients[0].n,
    activeClients: activeClients[0].n,
    sessionsBooked: booked[0].n,
    sessionsDelivered: deliveredN,
    cancellations: cancelled[0].n,
    noShows: noShowsN,
    // Attendance excludes cancellations: someone who gave notice did not fail
    // to attend, and counting them as such would misrepresent the service.
    attendanceRate: attendable === 0 ? null : Math.round((deliveredN / attendable) * 100),
    incomePence: Number(income[0].total ?? 0),
    concernsRaised: concernsRaised[0].n,
    concernsEscalated: concernsEscalated[0].n,
    referralsMade: referralsMade[0].n,
    newEnquiries: newEnquiries[0].n,
  };
}
