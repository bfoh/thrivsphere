/**
 * Ledger arithmetic and CSV export.
 *
 * A ledger that feeds an accountant, not a replacement for one. Nothing here
 * is statutory bookkeeping: it records money in and money out so both can be
 * handed over in a form somebody qualified can work with.
 *
 * Pure, so the totals and the exported file are tested rather than trusted.
 * Everything is integer pence — the same unit as `orders`, because the two are
 * subtracted from each other and a ledger where one side is a float will
 * eventually disagree with itself by a penny with no way to tell which side is
 * wrong.
 */

export type LedgerEntry = {
  date: Date;
  kind: "income" | "expense";
  category: string;
  description: string;
  counterparty: string | null;
  amountPence: number;
  vatPence: number;
  reference: string | null;
};

export type LedgerTotals = {
  incomePence: number;
  expensePence: number;
  vatPence: number;
  balancePence: number;
};

export function totals(entries: LedgerEntry[]): LedgerTotals {
  let income = 0;
  let expense = 0;
  let vat = 0;

  for (const e of entries) {
    if (e.kind === "income") income += e.amountPence;
    else {
      expense += e.amountPence;
      vat += e.vatPence;
    }
  }

  return {
    incomePence: income,
    expensePence: expense,
    vatPence: vat,
    balancePence: income - expense,
  };
}

/**
 * Entries oldest first, with a running balance.
 *
 * Oldest first because that is the direction a balance accumulates; showing
 * newest first with a running total would produce a column that counts
 * backwards and means nothing.
 */
export function withRunningBalance(
  entries: LedgerEntry[]
): (LedgerEntry & { balancePence: number })[] {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  let balance = 0;
  return sorted.map((e) => {
    balance += e.kind === "income" ? e.amountPence : -e.amountPence;
    return { ...e, balancePence: balance };
  });
}

/**
 * Escape one CSV field.
 *
 * Two separate concerns:
 *
 *  - **Quoting**, so a comma, quote or newline in a supplier name cannot shift
 *    every following column into the wrong place.
 *  - **Formula injection.** A field beginning `=`, `+`, `-` or `@` is executed
 *    as a formula when the file is opened in Excel or Sheets. Since suppliers
 *    and descriptions are typed by hand, a leading apostrophe is added so the
 *    spreadsheet treats it as text. This is not theoretical: it is the standard
 *    way a malicious value in an exported report reaches whoever opens it.
 *
 *    A plain number is exempt, negatives included. `-20.00` is an amount, not a
 *    formula, and quoting it as text would leave the accountant with a column
 *    that will not add up — which defeats the point of exporting at all.
 */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  if (/^[=+\-@\t\r]/.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;

  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Pence as a plain decimal for a spreadsheet — no currency symbol, no commas. */
export function csvAmount(pence: number): string {
  const negative = pence < 0;
  const abs = Math.abs(Math.round(pence));
  return `${negative ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const ISO_DATE = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The ledger as CSV.
 *
 * `\r\n` line endings, which is what RFC 4180 specifies and what Excel expects
 * on Windows; every other spreadsheet accepts them.
 */
export function toCsv(entries: LedgerEntry[]): string {
  const header = [
    "Date",
    "Type",
    "Category",
    "Description",
    "Supplier or client",
    "Amount",
    "VAT",
    "Running balance",
    "Reference",
  ];

  const rows = withRunningBalance(entries).map((e) => [
    csvField(ISO_DATE(e.date)),
    csvField(e.kind === "income" ? "Income" : "Expense"),
    csvField(categoryLabel(e.category)),
    csvField(e.description),
    csvField(e.counterparty),
    csvField(csvAmount(e.kind === "income" ? e.amountPence : -e.amountPence)),
    csvField(csvAmount(e.kind === "income" ? 0 : e.vatPence)),
    csvField(csvAmount(e.balancePence)),
    csvField(e.reference),
  ]);

  return [header, ...rows].map((cells) => cells.join(",")).join("\r\n") + "\r\n";
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    software: "Software",
    insurance: "Insurance",
    supervision: "Supervision",
    training: "Training",
    marketing: "Marketing",
    professional_fees: "Professional fees",
    equipment: "Equipment",
    premises: "Premises",
    travel: "Travel",
    bank_charges: "Bank charges",
    other: "Other",
    session_income: "Sessions",
  };
  return labels[category] ?? category;
}

/** Filename for a download, e.g. thrivsphere-ledger-2026-04-01-to-2026-06-30.csv */
export function exportFilename(from: Date, to: Date): string {
  return `thrivsphere-ledger-${ISO_DATE(from)}-to-${ISO_DATE(to)}.csv`;
}
