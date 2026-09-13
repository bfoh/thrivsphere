/**
 * Compliance status for staff records.
 *
 * Pure and tested, because these dates are safeguarding evidence rather than
 * administrative trivia. A DBS check or a safeguarding certificate that lapsed
 * unnoticed is the kind of gap an inspector, an insurer or a serious case
 * review finds — and the register that was supposed to catch it saying
 * "fine" is worse than having no register at all.
 *
 * Dates are compared as whole days in UTC. A certificate expiring today is
 * still valid today; it is overdue tomorrow.
 */

export type ComplianceState = "ok" | "due_soon" | "overdue" | "missing";

export type ComplianceCheck = {
  state: ComplianceState;
  /** Days until the date; negative once passed. Null when there is no date. */
  daysRemaining: number | null;
  label: string;
};

/** How far ahead something counts as needing attention. */
export const DUE_SOON_DAYS = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two dates, ignoring the time of day. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / MS_PER_DAY);
}

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Status of a single dated requirement.
 *
 * A missing date is `missing`, not `ok`. Absence of evidence is the state most
 * worth surfacing: nobody chases what the register says is fine.
 */
export function checkDate(
  due: string | Date | null | undefined,
  now = new Date(),
  dueSoonDays = DUE_SOON_DAYS
): ComplianceCheck {
  const date = parseDate(due);
  if (!date) return { state: "missing", daysRemaining: null, label: "Not recorded" };

  const days = daysBetween(now, date);
  if (days < 0) {
    return {
      state: "overdue",
      daysRemaining: days,
      label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
    };
  }
  if (days <= dueSoonDays) {
    return {
      state: "due_soon",
      daysRemaining: days,
      label: days === 0 ? "Due today" : `Due in ${days} day${days === 1 ? "" : "s"}`,
    };
  }
  return { state: "ok", daysRemaining: days, label: `Due in ${days} days` };
}

/**
 * The worst state across several checks.
 *
 * A person is only "ok" when everything about them is. Summarising by the best
 * or the most common state would hide the one thing that needs doing, which is
 * the entire point of looking.
 */
export function worstState(states: ComplianceState[]): ComplianceState {
  const order: ComplianceState[] = ["ok", "due_soon", "missing", "overdue"];
  return states.reduce<ComplianceState>(
    (worst, s) => (order.indexOf(s) > order.indexOf(worst) ? s : worst),
    "ok"
  );
}

/** Inclusive on both ends, so a single day is the same date twice. */
export function absenceDays(startsOn: string | Date, endsOn: string | Date): number {
  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  if (!start || !end) return 0;
  const days = daysBetween(start, end) + 1;
  return days > 0 ? days : 0;
}

/** True when an absence covers today. */
export function isAbsentOn(
  absence: { startsOn: string | Date; endsOn: string | Date },
  day: Date
): boolean {
  const start = parseDate(absence.startsOn);
  const end = parseDate(absence.endsOn);
  if (!start || !end) return false;
  return daysBetween(start, day) >= 0 && daysBetween(day, end) >= 0;
}

export function absenceLabel(type: string): string {
  const labels: Record<string, string> = {
    annual_leave: "Annual leave",
    sick: "Sickness",
    training: "Training",
    parental: "Parental leave",
    compassionate: "Compassionate leave",
    unpaid: "Unpaid leave",
    other: "Other",
  };
  return labels[type] ?? type;
}

export function contractLabel(contract: string): string {
  const labels: Record<string, string> = {
    employee: "Employee",
    self_employed: "Self-employed",
    volunteer: "Volunteer",
    sessional: "Sessional",
    director: "Director",
  };
  return labels[contract] ?? contract;
}
