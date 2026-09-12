import { addDays, formatZonedDate, zonedTimeToUtc } from "./time";

/**
 * Turning availability into bookable slots.
 *
 * Pure so the awkward parts — a holiday that blocks part of a day, an
 * appointment that half-overlaps a slot, a slot that falls inside the notice
 * period — can be asserted directly rather than discovered by a client being
 * offered a time that is already taken.
 */

export type AvailabilityRule = {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "18:00" local to `timezone`
  endTime: string;
  timezone: string;
  active?: boolean;
};

export type AvailabilityException = {
  date: string; // "YYYY-MM-DD"
  blocked: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type BusyPeriod = { startsAt: Date; endsAt: Date };

export type Slot = { startsAt: Date; endsAt: Date };

export type GenerateSlotsInput = {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  /** Appointments already taking up time. Cancelled ones must not be passed. */
  busy: BusyPeriod[];
  /** First calendar date to offer, in the practitioner's zone. */
  fromDate: string;
  /** Number of days to offer from `fromDate`, inclusive. */
  days: number;
  durationMinutes: number;
  /** Nothing may be booked sooner than this many hours from `now`. */
  minimumNoticeHours?: number;
  now?: Date;
  timezone?: string;
};

const MINUTE = 60_000;

export function generateSlots({
  rules,
  exceptions,
  busy,
  fromDate,
  days,
  durationMinutes,
  minimumNoticeHours = 24,
  now = new Date(),
  timezone = "Europe/London",
}: GenerateSlotsInput): Slot[] {
  if (durationMinutes <= 0 || days <= 0) return [];

  const earliest = new Date(now.getTime() + minimumNoticeHours * 60 * MINUTE);
  const activeRules = rules.filter((r) => r.active !== false);
  const slots: Slot[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    const dayExceptions = exceptions.filter((e) => e.date === date);

    // A blanket block (no times) removes the whole day.
    if (dayExceptions.some((e) => e.blocked && !e.startTime)) continue;

    const zone = activeRules[0]?.timezone ?? timezone;
    const dow = dayOfWeekForDate(date, zone);

    // Windows come from the weekly pattern plus any one-off additions.
    const windows: { start: string; end: string; zone: string }[] = [
      ...activeRules
        .filter((r) => r.dayOfWeek === dow)
        .map((r) => ({ start: r.startTime, end: r.endTime, zone: r.timezone })),
      ...dayExceptions
        .filter((e) => !e.blocked && e.startTime && e.endTime)
        .map((e) => ({ start: e.startTime!, end: e.endTime!, zone })),
    ];

    // Partial blocks (a holiday afternoon) are subtracted as busy periods.
    const partialBlocks = dayExceptions
      .filter((e) => e.blocked && e.startTime && e.endTime)
      .map((e) => ({
        startsAt: zonedTimeToUtc(date, e.startTime!, zone),
        endsAt: zonedTimeToUtc(date, e.endTime!, zone),
      }));

    for (const w of windows) {
      const windowStart = zonedTimeToUtc(date, w.start, w.zone);
      const windowEnd = zonedTimeToUtc(date, w.end, w.zone);
      if (!(windowEnd > windowStart)) continue;

      for (
        let t = windowStart.getTime();
        t + durationMinutes * MINUTE <= windowEnd.getTime();
        t += durationMinutes * MINUTE
      ) {
        const startsAt = new Date(t);
        const endsAt = new Date(t + durationMinutes * MINUTE);

        if (startsAt < earliest) continue;
        if (overlapsAny(startsAt, endsAt, busy)) continue;
        if (overlapsAny(startsAt, endsAt, partialBlocks)) continue;

        slots.push({ startsAt, endsAt });
      }
    }
  }

  // A practitioner may have two rules covering the same hours; offer it once.
  const seen = new Set<number>();
  return slots
    .filter((s) => {
      const key = s.startsAt.getTime();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Half-open comparison: a slot ending exactly when another starts is free. */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function overlapsAny(start: Date, end: Date, periods: BusyPeriod[]): boolean {
  return periods.some((p) => overlaps(start, end, p.startsAt, p.endsAt));
}

function dayOfWeekForDate(date: string, zone: string): number {
  // Midday avoids any chance of a DST shift moving the date.
  const noon = zonedTimeToUtc(date, "12:00", zone);
  const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export { formatZonedDate };
