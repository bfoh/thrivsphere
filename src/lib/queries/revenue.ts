import "server-only";

import { and, count, desc, eq, gte, isNotNull, sql, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, orders, packages } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { meanPence, monthlySeries, rank, type MonthBucket } from "@/lib/revenue";

/**
 * Income and service analytics.
 *
 * Income is recognised on the date a payment **settled**, not the date the
 * order was created. An order raised on the last day of a month and paid on
 * the first of the next belongs to the month the money arrived, which is the
 * month an accountant will look for it in. Where an old row has no `paid_at`,
 * the creation date stands in rather than the payment vanishing from the
 * totals altogether.
 */

export type RevenueSummary = {
  months: MonthBucket[];
  settledPence: number;
  outstandingPence: number;
  refundedPence: number;
  paidOrders: number;
  pendingOrders: number;
  averageOrderPence: number;
  averageSessionsPerClient: number | null;
  byPlan: { name: string; incomePence: number; orders: number; share: number }[];
  byClient: { clientId: string; name: string; incomePence: number; orders: number; share: number }[];
  sessionsDelivered: number;
  sessionsRemaining: number;
  payingClients: number;
};

const settledAt = sql<Date>`coalesce(${orders.paidAt}, ${orders.createdAt})`;

export async function getRevenue(months = 12): Promise<RevenueSummary> {
  await requireCapability("revenue:read", {
    entity: "orders",
    action: "view",
    detail: `viewed revenue for the last ${months} months`,
  });

  const db = getDb();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - (months - 1), 1);
  since.setUTCHours(0, 0, 0, 0);

  const [
    settledRows,
    outstanding,
    refunded,
    planRows,
    clientRows,
    delivered,
    packageTotals,
    payingClients,
  ] = await Promise.all([
    db
      .select({ at: settledAt, amountPence: orders.amountPence })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(settledAt, since))),

    db
      .select({ total: sum(orders.amountPence), n: count() })
      .from(orders)
      .where(eq(orders.status, "pending")),

    db
      .select({ total: sum(orders.amountPence), n: count() })
      .from(orders)
      .where(and(eq(orders.status, "refunded"), isNotNull(orders.refundedAt))),

    db
      .select({
        name: orders.planNameAtPurchase,
        incomePence: sum(orders.amountPence),
        orders: count(),
      })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(settledAt, since)))
      .groupBy(orders.planNameAtPurchase),

    db
      .select({
        clientId: orders.clientId,
        name: clients.preferredName,
        incomePence: sum(orders.amountPence),
        orders: count(),
      })
      .from(orders)
      .leftJoin(clients, eq(clients.id, orders.clientId))
      .where(and(eq(orders.status, "paid"), gte(settledAt, since)))
      .groupBy(orders.clientId, clients.preferredName)
      .orderBy(desc(sum(orders.amountPence)))
      .limit(20),

    db
      .select({ n: count() })
      .from(appointments)
      .where(eq(appointments.status, "completed")),

    db
      .select({
        total: sum(packages.sessionsTotal),
        used: sum(packages.sessionsUsed),
      })
      .from(packages)
      .where(eq(packages.status, "active")),

    db
      .select({ n: sql<number>`count(distinct ${orders.clientId})` })
      .from(orders)
      .where(eq(orders.status, "paid")),
  ]);

  const settledPence = settledRows.reduce((total, row) => total + row.amountPence, 0);
  const paidOrders = settledRows.length;
  const paying = Number(payingClients[0]?.n ?? 0);
  const deliveredN = delivered[0].n;

  const packagesTotal = Number(packageTotals[0]?.total ?? 0);
  const packagesUsed = Number(packageTotals[0]?.used ?? 0);

  return {
    months: monthlySeries(
      settledRows.map((r) => ({ at: new Date(r.at), amountPence: r.amountPence })),
      months
    ),
    settledPence,
    outstandingPence: Number(outstanding[0]?.total ?? 0),
    refundedPence: Number(refunded[0]?.total ?? 0),
    paidOrders,
    pendingOrders: outstanding[0]?.n ?? 0,
    averageOrderPence: meanPence(settledPence, paidOrders),
    // Sessions actually delivered, per client who has paid for any. Null
    // rather than zero when nobody has yet, so an empty service does not
    // report an average of nought as though it were a result.
    averageSessionsPerClient: paying === 0 ? null : Math.round((deliveredN / paying) * 10) / 10,
    byPlan: rank(
      planRows.map((r) => ({
        name: r.name,
        incomePence: Number(r.incomePence ?? 0),
        orders: r.orders,
      }))
    ),
    byClient: rank(
      clientRows.map((r) => ({
        clientId: r.clientId,
        name: r.name ?? "former client",
        incomePence: Number(r.incomePence ?? 0),
        orders: r.orders,
      }))
    ),
    sessionsDelivered: deliveredN,
    // Prepaid and not yet used: a liability, not income already earned.
    sessionsRemaining: Math.max(0, packagesTotal - packagesUsed),
    payingClients: paying,
  };
}
