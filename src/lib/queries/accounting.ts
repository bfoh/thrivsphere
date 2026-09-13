import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, expenses, orders } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
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
      })
      .from(orders)
      .leftJoin(clients, eq(clients.id, orders.clientId))
      .where(and(eq(orders.status, "paid"), gte(settledAt, from), lte(settledAt, to))),

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
      description: r.plan,
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
