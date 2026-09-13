/**
 * Money entered by a person, turned into pence.
 *
 * Parsed from the text rather than `parseFloat` then multiplied by 100, because
 * `12.34 * 100` is 1233.9999999999998 in floating point. A ledger that loses a
 * penny on some rows and not others is worse than one that refuses the entry,
 * since nobody can tell afterwards which rows were affected.
 *
 * Returns null for anything it cannot read exactly. Guessing at "twenty quid"
 * or "12.345" would put a number in the accounts that nobody typed.
 */
export function poundsToPence(input: string): number | null {
  const text = input.replace(/[£,\s]/g, "");
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;

  const [, sign, whole, fraction = ""] = match;
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return sign === "-" ? -pence : pence;
}
