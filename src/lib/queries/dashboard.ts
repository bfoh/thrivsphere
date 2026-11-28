import "server-only";

import { and, asc, count, eq, gte, lt, ne, notInArray, sql, sum } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, blogPosts, clients, enquiries, orders, safeguardingConcerns, users } from "@/db/schema";
import { can, type Actor } from "@/lib/authz";
import { decryptSecret } from "@/lib/crypto";
import { canJoin, monthToDate, ukDay } from "@/lib/dashboard";
import { countResourceWork } from "@/lib/queries/worksheets";
import { listOutcomesDue } from "@/lib/queries/suitability";
import { pendingCommentCount } from "@/lib/queries/blog";
import { getActiveStaff } from "@/lib/queries/availability";

/** Bookings that never happened as sessions: still being paid for, or cancelled. */
const NOT_SESSIONS = ["pending_payment", "cancelled_by_client", "cancelled_by_service"] as const;

/** Settled and not complimentary — the same rule as the Revenue page. */
const paid = and(eq(orders.status, "paid"), eq(orders.complimentary, false));
const settledAt = sql`coalesce(${orders.paidAt}, ${orders.createdAt})`;

/**
 * Everything the "Today" dashboard shows, for one person.
 *
 * Totals and today's diary only — no client detail beyond a name — and each
 * queue only for people who can open it, the same rule as the sidebar counts.
 * The page's own guard has already checked and logged the access.
 */
export async function getToday(actor: Actor, now: Date) {
  const db = getDb();
  const day = ukDay(now);
  const mtd = monthToDate(now);
  // Half-open [from, to), as on the Reports page, so nothing is counted twice.
  const within = (col: AnyColumn | SQL, from: Date, to: Date) =>
    sql`${col} >= ${from.toISOString()}::timestamptz and ${col} < ${to.toISOString()}::timestamptz`;
  const countWhere = async (table: typeof clients | typeof enquiries | typeof appointments, where: SQL | undefined) =>
    (await db.select({ n: count() }).from(table).where(where))[0].n;
  const zero = Promise.resolve(0);

  const isReviewer =
    actor.role === "founder" ||
    ((await db.select({ r: users.blogReviewer }).from(users).where(eq(users.id, actor.userId)).limit(1))[0]?.r ?? false);
  const showMoney = can(actor, "revenue:read");

  const [
    sessions,
    next,
    toClose,
    staff,
    outcomesDue,
    work,
    newEnquiries,
    openConcerns,
    postsToReview,
    comments,
    activeClients,
    newClients,
    newClientsBefore,
    bookings,
    bookingsBefore,
    enquiriesNow,
    enquiriesBefore,
    upcoming,
    income,
    incomeBefore,
  ] = await Promise.all([
    db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        kind: appointments.kind,
        practitionerId: appointments.practitionerId,
        meetingLinkEncrypted: appointments.meetingLinkEncrypted,
        clientId: clients.id,
        clientName: clients.preferredName,
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .where(and(within(appointments.startsAt, day.from, day.to), notInArray(appointments.status, [...NOT_SESSIONS])))
      .orderBy(asc(appointments.startsAt)),
    // What comes after today, for a quiet day.
    db
      .select({ startsAt: appointments.startsAt, practitionerId: appointments.practitionerId, clientName: clients.preferredName })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .where(and(eq(appointments.status, "scheduled"), gte(appointments.startsAt, day.to)))
      .orderBy(asc(appointments.startsAt))
      .limit(1),
    // Sessions that have ended but are still marked as booked.
    countWhere(appointments, and(eq(appointments.status, "scheduled"), lt(appointments.endsAt, now))),
    getActiveStaff(),
    listOutcomesDue(now),
    countResourceWork(actor.userId),
    can(actor, "enquiry:manage") ? countWhere(enquiries, eq(enquiries.status, "new")) : zero,
    can(actor, "safeguarding:read")
      ? db
          .select({ n: count() })
          .from(safeguardingConcerns)
          .where(ne(safeguardingConcerns.status, "closed"))
          .then((r) => r[0].n)
      : zero,
    can(actor, "blog:write") && isReviewer
      ? db
          .select({ n: count() })
          .from(blogPosts)
          .where(and(eq(blogPosts.status, "in_review"), sql`${blogPosts.authorId} is distinct from ${actor.userId}`))
          .then((r) => r[0].n)
      : zero,
    can(actor, "blog:write") ? pendingCommentCount() : Promise.resolve({ total: 0, urgent: 0 }),
    countWhere(clients, eq(clients.status, "active")),
    countWhere(clients, within(clients.createdAt, mtd.from, mtd.to)),
    countWhere(clients, within(clients.createdAt, mtd.prevFrom, mtd.prevTo)),
    countWhere(appointments, and(within(appointments.createdAt, mtd.from, mtd.to), ne(appointments.status, "pending_payment"))),
    countWhere(appointments, and(within(appointments.createdAt, mtd.prevFrom, mtd.prevTo), ne(appointments.status, "pending_payment"))),
    can(actor, "enquiry:manage") ? countWhere(enquiries, within(enquiries.createdAt, mtd.from, mtd.to)) : zero,
    can(actor, "enquiry:manage") ? countWhere(enquiries, within(enquiries.createdAt, mtd.prevFrom, mtd.prevTo)) : zero,
    countWhere(appointments, and(eq(appointments.status, "scheduled"), gte(appointments.startsAt, now))),
    showMoney
      ? db.select({ t: sum(orders.amountPence) }).from(orders).where(and(paid, within(settledAt, mtd.from, mtd.to))).then((r) => Number(r[0].t ?? 0))
      : zero,
    showMoney
      ? db.select({ t: sum(orders.amountPence) }).from(orders).where(and(paid, within(settledAt, mtd.prevFrom, mtd.prevTo))).then((r) => Number(r[0].t ?? 0))
      : zero,
  ]);

  const nameOf = new Map(staff.map((s) => [s.id, s.name]));
  const withWhom = (id: string) => (id === actor.userId ? "you" : (nameOf.get(id) ?? "a former colleague"));

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      kind: s.kind,
      clientId: s.clientId,
      clientName: s.clientName,
      mine: s.practitionerId === actor.userId,
      withWhom: withWhom(s.practitionerId),
      // Only your own session's link, and only around the time it runs.
      joinUrl: s.practitionerId === actor.userId && canJoin(s, now) ? joinUrl(s.meetingLinkEncrypted) : null,
      hasLink: !!s.meetingLinkEncrypted,
    })),
    next: next[0] ? { startsAt: next[0].startsAt, clientName: next[0].clientName, withWhom: withWhom(next[0].practitionerId) } : null,
    attention: {
      toClose,
      outcomesDue,
      newEnquiries,
      openConcerns,
      worksheetsToReview: can(actor, "worksheet:manage") ? work.worksheetsToReview : 0,
      myOpenTasks: work.myOpenTasks,
      postsToReview,
      comments,
    },
    figures: {
      activeClients,
      newClients: [newClients, newClientsBefore] as const,
      bookings: [bookings, bookingsBefore] as const,
      enquiries: can(actor, "enquiry:manage") ? ([enquiriesNow, enquiriesBefore] as const) : null,
      upcoming,
      income: showMoney ? ([income, incomeBefore] as const) : null,
    },
  };
}

function joinUrl(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    const url = decryptSecret(encrypted);
    // Only ever a web address; anything else is not offered as a link.
    return url && /^https:\/\//i.test(url) ? url : null;
  } catch (err) {
    console.error("[dashboard] could not decrypt meeting link", err);
    return null;
  }
}

export type Today = Awaited<ReturnType<typeof getToday>>;
