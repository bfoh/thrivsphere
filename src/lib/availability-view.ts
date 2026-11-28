/**
 * Layout arithmetic for the availability page's weekly grid. Pure, so it can
 * be tested without a database or a browser.
 */

/** Monday first, as a UK diary reads. Values are `dayOfWeek` (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** "18:30" or "18:30:00" → minutes after midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * The hours the grid spans: whole hours around every rule, 8am to 8pm when
 * there are none, and never less than six hours so short days stay legible.
 */
export function trackRange(rules: { startTime: string; endTime: string }[]): { from: number; to: number } {
  if (rules.length === 0) return { from: 8, to: 20 };
  let from = Math.floor(Math.min(...rules.map((r) => toMinutes(r.startTime))) / 60);
  let to = Math.ceil(Math.max(...rules.map((r) => toMinutes(r.endTime))) / 60);
  while (to - from < 6) {
    if (from > 0) from -= 1;
    if (to - from < 6 && to < 24) to += 1;
  }
  return { from, to };
}

/** Where a block sits on the track, as percentages of its width. */
export function blockPosition(start: string, end: string, range: { from: number; to: number }) {
  const span = (range.to - range.from) * 60;
  const s = Math.max(0, toMinutes(start) - range.from * 60);
  const e = Math.min(span, toMinutes(end) - range.from * 60);
  return { left: (s / span) * 100, width: (Math.max(0, e - s) / span) * 100 };
}

/** Hour marks under the grid: every hour, or every other one on a long day. */
export function hourMarks(range: { from: number; to: number }): number[] {
  const step = range.to - range.from > 8 ? 2 : 1;
  const marks: number[] = [];
  for (let h = range.from; h <= range.to; h += step) marks.push(h);
  return marks;
}

/** "Tue 1 Dec 2026" for a calendar date "2026-12-01". */
export function shortDate(date: string): string {
  // Weekday and date are formatted apart: en-GB puts a comma between them.
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = d.toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short" });
  return `${weekday} ${d.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}`;
}
