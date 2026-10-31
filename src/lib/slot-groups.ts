/** A day of bookable times, ready to render. */
export type SlotGroup = { date: string; label: string; slots: { iso: string; time: string }[] };

const LDN = "Europe/London";

/**
 * Group slots by UK calendar day.
 *
 * Grouped by the London date rather than the UTC one, so a late-evening time
 * never appears under the following day.
 */
export function groupSlotsByDay(slots: { startsAt: Date }[]): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();
  for (const s of slots) {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: LDN }).format(s.startsAt);
    let group = groups.get(date);
    if (!group) {
      group = {
        date,
        label: s.startsAt.toLocaleDateString("en-GB", { timeZone: LDN, weekday: "long", day: "numeric", month: "long" }),
        slots: [],
      };
      groups.set(date, group);
    }
    group.slots.push({
      iso: s.startsAt.toISOString(),
      time: s.startsAt.toLocaleTimeString("en-GB", { timeZone: LDN, hour: "2-digit", minute: "2-digit" }),
    });
  }
  return [...groups.values()];
}

/** "Tuesday 4 November, 18:00" in UK time. */
export function formatAppointment(d: Date): string {
  return d.toLocaleString("en-GB", {
    timeZone: LDN,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
