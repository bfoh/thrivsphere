/**
 * Deciding which appointment reminders are due.
 *
 * Pure and tested. Reminders go to people who may be having a difficult week,
 * and getting this wrong is not a cosmetic bug: a duplicate reminder is an
 * extra disclosure in an inbox someone else may read, and a missed one is a
 * missed session that was paid for and waited on.
 */

export type ReminderKind = "booking_confirmation" | "reminder_24h" | "reminder_1h";

export type ReminderCandidate = {
  appointmentId: string;
  startsAt: Date;
  status: string;
  emailRemindersEnabled: boolean;
  /** Kinds already sent for this appointment. */
  alreadySent: ReminderKind[];
};

export type DueReminder = { appointmentId: string; kind: ReminderKind };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** How close to the appointment each reminder fires, and its tolerance window. */
const WINDOWS: Record<Exclude<ReminderKind, "booking_confirmation">, { lead: number; slack: number }> = {
  // A day ahead, with a generous window so an hourly cron cannot miss it.
  reminder_24h: { lead: 24 * HOUR, slack: 90 * MINUTE },
  // An hour ahead, tighter — this one is about to be useful or useless.
  reminder_1h: { lead: 1 * HOUR, slack: 30 * MINUTE },
};

/**
 * Which reminders are due right now.
 *
 * Only `scheduled` appointments qualify: a cancelled session must stop
 * reminding immediately, which is the failure people notice and resent.
 * Anything in the past is skipped — a late cron run should not send a reminder
 * for a session that has already happened.
 */
export function dueReminders(
  candidates: ReminderCandidate[],
  now: Date = new Date()
): DueReminder[] {
  const due: DueReminder[] = [];

  for (const c of candidates) {
    if (c.status !== "scheduled") continue;
    if (!c.emailRemindersEnabled) continue;

    const msUntil = c.startsAt.getTime() - now.getTime();
    if (msUntil <= 0) continue;

    const sent = new Set(c.alreadySent);

    // Confirmation goes out once, as soon as the booking is seen.
    if (!sent.has("booking_confirmation")) {
      due.push({ appointmentId: c.appointmentId, kind: "booking_confirmation" });
    }

    for (const kind of ["reminder_24h", "reminder_1h"] as const) {
      if (sent.has(kind)) continue;
      const { lead, slack } = WINDOWS[kind];
      if (msUntil <= lead + slack && msUntil > lead - slack) {
        due.push({ appointmentId: c.appointmentId, kind });
      }
    }
  }

  return due;
}
