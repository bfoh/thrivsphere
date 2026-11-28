import { addDays, formatZonedDate, zonedDayOfWeek, zonedTimeToUtc } from "./time";

/**
 * The "Today" dashboard's arithmetic, kept pure so it can be tested without a
 * clock or a database. Everything is in UK time: a session at 00:30 on a
 * summer Monday belongs to Monday, not to Sunday in UTC.
 */
export const LDN = "Europe/London";

/** Midnight to midnight, UK time, for the day `now` falls in. */
export function ukDay(now: Date): { from: Date; to: Date } {
  const today = formatZonedDate(now, LDN);
  return { from: zonedTimeToUtc(today, "00:00", LDN), to: zonedTimeToUtc(addDays(today, 1), "00:00", LDN) };
}

/**
 * A Monday-to-Sunday week in UK time, `offset` weeks from this one, with its
 * seven calendar dates for the columns of the week view.
 */
export function ukWeek(now: Date, offset = 0): { from: Date; to: Date; days: string[] } {
  const today = formatZonedDate(now, LDN);
  const monday = addDays(today, -((zonedDayOfWeek(now, LDN) + 6) % 7) + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return { from: zonedTimeToUtc(monday, "00:00", LDN), to: zonedTimeToUtc(addDays(monday, 7), "00:00", LDN), days };
}

/** "Today", "Tomorrow" or "Wednesday 3 December", for an agenda heading. */
export function dayHeading(date: string, now: Date): string {
  const today = formatZonedDate(now, LDN);
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  const d = zonedTimeToUtc(date, "12:00", LDN);
  return `${d.toLocaleDateString("en-GB", { timeZone: LDN, weekday: "long" })} ${d.toLocaleDateString("en-GB", { timeZone: LDN, day: "numeric", month: "long" })}`;
}

/** The UK calendar date an instant falls on, "YYYY-MM-DD". */
export const ukDate = (d: Date) => formatZonedDate(d, LDN);

/**
 * This month so far, and the same stretch of last month.
 *
 * Comparing a part-finished month with the whole of last month makes every
 * figure look like it has fallen until the last day, so the comparison is
 * like for like: 1–28 November against 1–28 October. When last month is
 * shorter (30 March against February), it stops at the end of last month.
 */
export function monthToDate(now: Date): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const [y, m] = formatZonedDate(now, LDN).split("-").map(Number);
  const first = (year: number, month: number) => {
    const d = new Date(Date.UTC(year, month - 1, 1));
    return zonedTimeToUtc(d.toISOString().slice(0, 10), "00:00", LDN);
  };
  const from = first(y, m);
  const prevFrom = first(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
  const elapsed = now.getTime() - from.getTime();
  const prevTo = new Date(Math.min(prevFrom.getTime() + elapsed, from.getTime()));
  return { from, to: now, prevFrom, prevTo };
}

export type Trend = { text: string; direction: "up" | "down" | "flat" };

/**
 * "2 more than this time last month". Plain differences, not percentages: with
 * a practice this size, one booking against none would read as "+100%" or
 * "∞", which says nothing true.
 */
export function trend(
  current: number,
  previous: number,
  format: (n: number) => string = String,
  unit?: [one: string, many: string]
): Trend | null {
  if (current === 0 && previous === 0) return null;
  const diff = current - previous;
  if (diff === 0) return { text: "Same as this time last month", direction: "flat" };
  const n = Math.abs(diff);
  const what = unit ? ` ${n === 1 ? unit[0] : unit[1]}` : "";
  return {
    text: `${format(n)} ${diff > 0 ? "more" : "fewer"}${what} than this time last month`,
    direction: diff > 0 ? "up" : "down",
  };
}

/** Good morning / afternoon / evening, by the UK clock. */
export function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: LDN, hour: "2-digit", hourCycle: "h23" }).format(now));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** "Saturday 28 November 2026". */
export function longDate(now: Date): string {
  const weekday = now.toLocaleDateString("en-GB", { timeZone: LDN, weekday: "long" });
  const date = now.toLocaleDateString("en-GB", { timeZone: LDN, day: "numeric", month: "long", year: "numeric" });
  return `${weekday} ${date}`;
}

/** "18:00". */
export function clock(d: Date): string {
  return d.toLocaleTimeString("en-GB", { timeZone: LDN, hour: "2-digit", minute: "2-digit" });
}

/**
 * The first name to greet someone by, from the name they gave. Nothing when
 * there is no name: "Good morning, bfoh2g" is worse than "Good morning".
 */
export function firstName(displayName: string | null | undefined): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first || null;
}

export type SessionPhase = "upcoming" | "now" | "to-close" | "done";

/** Where a session stands against the clock. A booked session that has ended still needs marking. */
export function sessionPhase(s: { startsAt: Date; endsAt: Date; status: string }, now: Date): SessionPhase {
  if (s.status !== "scheduled") return "done";
  if (now < s.startsAt) return "upcoming";
  if (now < s.endsAt) return "now";
  return "to-close";
}

/**
 * Whether the joining link is worth offering: from 15 minutes before until the
 * session ends, so the button is there when it's needed and not a day early.
 */
export function canJoin(s: { startsAt: Date; endsAt: Date; status: string }, now: Date): boolean {
  return s.status === "scheduled" && now.getTime() >= s.startsAt.getTime() - 15 * 60_000 && now < s.endsAt;
}
