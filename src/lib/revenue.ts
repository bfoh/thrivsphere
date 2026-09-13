/**
 * Money and analytics arithmetic.
 *
 * Pure, so the sums a founder reports to a board or an accountant are tested
 * rather than trusted. Everything is integer pence — the unit Stripe charges
 * in and the unit payouts reconcile against. No float touches money at any
 * point; `formatPence` is the only place a decimal point appears, and it
 * produces a string for display, never a number to calculate with.
 */

export type MonthKey = string; // "2026-04"

export type MonthBucket = {
  key: MonthKey;
  label: string;
  incomePence: number;
  orders: number;
};

/** `2026-04`, in UTC so a payment near midnight lands in one month only. */
export function monthKey(date: Date): MonthKey {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: MonthKey): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Group settled payments into consecutive months.
 *
 * Months with no income are included as zero rather than skipped. A gap that
 * silently closes up reads as an unbroken run of trading, which is the one
 * thing a revenue chart must not imply.
 */
export function monthlySeries(
  payments: { at: Date; amountPence: number }[],
  months: number,
  now = new Date()
): MonthBucket[] {
  const buckets = new Map<MonthKey, MonthBucket>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = monthKey(d);
    buckets.set(key, { key, label: monthLabel(key), incomePence: 0, orders: 0 });
  }

  for (const payment of payments) {
    const bucket = buckets.get(monthKey(payment.at));
    if (!bucket) continue; // Outside the window asked for.
    bucket.incomePence += payment.amountPence;
    bucket.orders += 1;
  }

  return [...buckets.values()];
}

/** £1,234.50. Negative amounts read as −£12.00, not £-12.00. */
export function formatPence(pence: number): string {
  const negative = pence < 0;
  const abs = Math.abs(Math.round(pence));
  const formatted = (abs / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  });
  return negative ? `−${formatted}` : formatted;
}

/**
 * Integer-pence mean.
 *
 * Rounds half away from zero rather than using `Math.round`, which rounds .5
 * upward and so drifts a running total upward over many rows.
 */
export function meanPence(totalPence: number, count: number): number {
  if (count <= 0) return 0;
  const value = totalPence / count;
  return value < 0 ? -Math.round(Math.abs(value)) : Math.round(value);
}

/**
 * Percentage change between two periods.
 *
 * `null` when the earlier period is zero: growth from nothing is not a
 * percentage, and showing "+100%" or "∞" for a first month of trading would be
 * a made-up number on a page a founder may quote to a funder.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/** Share of a total, as a whole percentage. */
export function share(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/** Rows sorted by income, largest first, with a share of the total. */
export function rank<T extends { incomePence: number }>(rows: T[]): (T & { share: number })[] {
  const total = rows.reduce((sum, r) => sum + r.incomePence, 0);
  return [...rows]
    .sort((a, b) => b.incomePence - a.incomePence)
    .map((r) => ({ ...r, share: share(r.incomePence, total) }));
}
