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

/**
 * A public price: £30 for whole pounds, £30.50 otherwise.
 *
 * Prices on the website are set in whole pounds, and "£30.00" on a pricing
 * card reads like an invoice.
 */
export function displayPrice(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}
