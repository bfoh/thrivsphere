/**
 * The 18+ decision.
 *
 * Pure and dependency-free so it can be tested directly — this is the function
 * that decides whether an under-18 is admitted to an adults-only service, so
 * "it looked right" is not good enough.
 *
 * Deliberately not `(now - dob) / 365.25 days`: that drifts around leap years
 * and can admit someone the day before their birthday. Instead we construct
 * their eighteenth birthday and compare dates directly.
 */
export function isAdult(dateOfBirth: Date, now: Date = new Date()): boolean {
  if (Number.isNaN(dateOfBirth.getTime())) return false;

  const eighteenth = new Date(
    Date.UTC(
      dateOfBirth.getUTCFullYear() + 18,
      dateOfBirth.getUTCMonth(),
      dateOfBirth.getUTCDate()
    )
  );

  // A 29 February birthday has no exact anniversary in a non-leap year; the
  // Date constructor rolls it to 1 March, which is the conservative reading —
  // they become an adult a day later rather than a day early.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return eighteenth.getTime() <= today.getTime();
}
