/**
 * Timezone helpers.
 *
 * Availability is stored as local wall-clock time plus an IANA zone
 * ("Tuesdays 18:00, Europe/London") rather than as UTC instants, so that 6pm
 * stays 6pm across a BST/GMT change. Converting that into a real instant is
 * the fiddly part, and getting it wrong means appointments silently shift by
 * an hour twice a year — so it lives here, pure and tested.
 *
 * Uses Intl rather than a date library: the zone data is already in the
 * runtime, and this keeps a dependency out of the booking path.
 */

/** Milliseconds that `zone` is ahead of UTC at the given instant. */
export function zoneOffsetMs(instant: Date, zone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    // Intl can render midnight as hour 24 in some environments.
    get("hour") % 24,
    get("minute"),
    get("second")
  );

  return asIfUtc - instant.getTime();
}

/**
 * Turn a local date and time in `zone` into the matching UTC instant.
 *
 * Two passes: guess by treating the wall-clock time as UTC, correct by the
 * offset at that guess, then re-check, because the offset at the corrected
 * instant can differ from the offset at the guess right on a DST boundary.
 *
 * @param date "YYYY-MM-DD" as it reads on a calendar in `zone`
 * @param time "HH:MM" or "HH:MM:SS" as it reads on a clock in `zone`
 */
export function zonedTimeToUtc(date: string, time: string, zone: string): Date {
  const [h = "0", m = "0", s = "0"] = time.split(":");
  const naive = new Date(`${date}T${pad(h)}:${pad(m)}:${pad(s)}Z`);
  if (Number.isNaN(naive.getTime())) return naive;

  const firstOffset = zoneOffsetMs(naive, zone);
  let instant = new Date(naive.getTime() - firstOffset);

  const secondOffset = zoneOffsetMs(instant, zone);
  if (secondOffset !== firstOffset) {
    instant = new Date(naive.getTime() - secondOffset);
  }

  return instant;
}

/** "YYYY-MM-DD" for an instant as it reads on a calendar in `zone`. */
export function formatZonedDate(instant: Date, zone: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(instant);
}

/** Day of week (0 = Sunday) for an instant as it falls in `zone`. */
export function zonedDayOfWeek(instant: Date, zone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(
    instant
  );
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Add whole days to a "YYYY-MM-DD" string without touching timezones. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pad(v: string) {
  return v.padStart(2, "0");
}
