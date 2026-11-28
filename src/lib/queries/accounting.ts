import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, expenses, orders } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { getCurrentActor } from "@/lib/session";
import { can } from "@/lib/authz";
import { totals, type LedgerEntry, type LedgerTotals } from "@/lib/accounting";

/**
 * The ledger for a period.
 *
 * Income is **read** from `orders`, never re-entered. Typing takings in by hand
 * beside a payment system that already knows them is how two sets of books
 * come to disagree, and reconciling them afterwards is somebody's afternoon.
 */

export type Ledger = {
  from: Date;
  to: Date;
  entries: LedgerEntry[];
  totals: LedgerTotals;
};

const settledAt = sql<Date>`coalesce(${orders.paidAt}, ${orders.createdAt})`;

/** Financial-year quarters are the accountant's unit; default to this quarter. */
export function quarterRange(offset = 0, now = new Date()): { from: Date; to: Date } {
  const quarter = Math.floor(now.getUTCMonth() / 3) - offset;
  const from = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1));
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 3, 0, 23, 59, 59));
  return { from, to };
}

export async function getLedger(from: Date, to: Date, forExport = false): Promise<Ledger> {
  await requireCapability("accounting:read", {
    entity: "expenses",
    action: forExport ? "export" : "view",
    detail: `${forExport ? "exported" : "viewed"} the ledger, ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
  });

  const db = getDb();

  const [income, spend] = await Promise.all([
    db
      .select({
        at: settledAt,
        amountPence: orders.amountPence,
        plan: orders.planNameAtPurchase,
        client: clients.preferredName,
        reference: orders.paymentIntentId,
        discountPence: orders.discountPence,
        discountLabel: orders.discountLabel,
      })
      .from(orders)
      .leftJoin(clients, eq(clients.id, orders.clientId))
      // Complimentary sessions moved no money, so they are not income.
      .where(and(eq(orders.status, "paid"), eq(orders.complimentary, false), gte(settledAt, from), lte(settledAt, to))),

    db
      .select()
      .from(expenses)
      .where(and(gte(expenses.incurredOn, iso(from)), lte(expenses.incurredOn, iso(to))))
      .orderBy(desc(expenses.incurredOn)),
  ]);

  const entries: LedgerEntry[] = [
    ...income.map((r) => ({
      date: new Date(r.at),
      kind: "income" as const,
      category: "session_income",
      description:
        r.discountPence > 0
          ? `${r.plan} (${r.discountLabel ?? "discount"}: £${(r.discountPence / 100).toFixed(2)} off)`
          : r.plan,
      counterparty: r.client ?? null,
      amountPence: r.amountPence,
      vatPence: 0,
      reference: r.reference,
    })),
    ...spend.map((e) => ({
      date: new Date(`${e.incurredOn}T00:00:00Z`),
      kind: "expense" as const,
      category: e.category,
      description: e.description,
      counterparty: e.supplier,
      amountPence: e.amountPence,
      vatPence: e.vatPence,
      reference: e.receiptPath ? "receipt on file" : null,
    })),
  ];

  return { from, to, entries, totals: totals(entries) };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export type QuarterTotal = { key: string; from: Date; to: Date; incomePence: number; expensePence: number };

/**
 * Income and expenses for the last `count` calendar quarters, oldest first:
 * the chart on the Accounting page. Same rules as the ledger — settled,
 * non-complimentary orders by the date the money arrived; expenses by the
 * date incurred — in two grouped queries.
 *
 * Call it after `getLedger`, which checks the capability and writes the audit
 * row for the page; this checks again without writing a second one.
 */
export async function getQuarterTotals(count = 4, now = new Date()): Promise<QuarterTotal[]> {
  const actor = await getCurrentActor();
  if (!actor || !can(actor, "accounting:read")) throw new Error("Not allowed to read the ledger.");

  const oldest = quarterRange(count - 1, now);
  const newest = quarterRange(0, now);
  const incomeQuarter = sql<string>`to_char(date_trunc('quarter', ${settledAt} at time zone 'UTC'), 'YYYY-MM')`;
  const expenseQuarter = sql<string>`to_char(date_trunc('quarter', ${expenses.incurredOn}), 'YYYY-MM')`;
  const db = getDb();

  const [income, spend] = await Promise.all([
    db
      .select({ q: incomeQuarter, pence: sql<number>`coalesce(sum(${orders.amountPence}), 0)`.mapWith(Number) })
      .from(orders)
      .where(and(eq(orders.status, "paid"), eq(orders.complimentary, false), gte(settledAt, oldest.from), lte(settledAt, newest.to)))
      .groupBy(incomeQuarter),
    db
      .select({ q: expenseQuarter, pence: sql<number>`coalesce(sum(${expenses.amountPence}), 0)`.mapWith(Number) })
      .from(expenses)
      .where(and(gte(expenses.incurredOn, iso(oldest.from)), lte(expenses.incurredOn, iso(newest.to))))
      .groupBy(expenseQuarter),
  ]);

  const inc = new Map(income.map((r) => [r.q, r.pence]));
  const exp = new Map(spend.map((r) => [r.q, r.pence]));
  const out: QuarterTotal[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const r = quarterRange(i, now);
    const key = r.from.toISOString().slice(0, 7);
    out.push({ key, from: r.from, to: r.to, incomePence: inc.get(key) ?? 0, expensePence: exp.get(key) ?? 0 });
  }
  return out;
}
