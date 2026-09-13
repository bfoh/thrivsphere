import test from "node:test";
import assert from "node:assert/strict";
import {
  csvAmount,
  csvField,
  exportFilename,
  toCsv,
  totals,
  withRunningBalance,
  type LedgerEntry,
} from "./accounting";

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  date: new Date("2026-04-01T00:00:00Z"),
  kind: "expense",
  category: "software",
  description: "Hosting",
  counterparty: "Vercel",
  amountPence: 2000,
  vatPence: 400,
  reference: null,
  ...over,
});

test("totals separate money in from money out", () => {
  const t = totals([
    entry({ kind: "income", amountPence: 7500, vatPence: 0 }),
    entry({ kind: "expense", amountPence: 2000, vatPence: 400 }),
  ]);
  assert.deepEqual(t, {
    incomePence: 7500,
    expensePence: 2000,
    vatPence: 400,
    balancePence: 5500,
  });
});

test("an empty ledger totals to zero rather than NaN", () => {
  assert.deepEqual(totals([]), {
    incomePence: 0,
    expensePence: 0,
    vatPence: 0,
    balancePence: 0,
  });
});

test("VAT is counted on expenses only", () => {
  const t = totals([entry({ kind: "income", amountPence: 5000, vatPence: 999 })]);
  assert.equal(t.vatPence, 0);
});

test("the running balance accumulates oldest first", () => {
  const rows = withRunningBalance([
    entry({ date: new Date("2026-04-03T00:00:00Z"), kind: "expense", amountPence: 1000 }),
    entry({ date: new Date("2026-04-01T00:00:00Z"), kind: "income", amountPence: 5000 }),
  ]);
  assert.deepEqual(rows.map((r) => r.balancePence), [5000, 4000]);
});

test("running balance does not reorder the caller's array", () => {
  const rows = [
    entry({ date: new Date("2026-04-03T00:00:00Z") }),
    entry({ date: new Date("2026-04-01T00:00:00Z") }),
  ];
  withRunningBalance(rows);
  assert.equal(rows[0].date.toISOString().slice(0, 10), "2026-04-03");
});

test("a balance can go negative", () => {
  const rows = withRunningBalance([entry({ kind: "expense", amountPence: 2500 })]);
  assert.equal(rows[0].balancePence, -2500);
});

test("commas, quotes and newlines cannot shift columns", () => {
  assert.equal(csvField("Smith, Jones & Co"), '"Smith, Jones & Co"');
  assert.equal(csvField('He said "hello"'), '"He said ""hello"""');
  assert.equal(csvField("line one\nline two"), '"line one\nline two"');
  assert.equal(csvField("plain"), "plain");
});

test("a field that a spreadsheet would run as a formula is neutralised", () => {
  for (const dangerous of ["=1+1", "+SUM(A1)", "-2+3", "@import", "=cmd|'/c calc'!A0"]) {
    const field = csvField(dangerous);
    assert.ok(field.startsWith("'") || field.startsWith("\"'"), `not neutralised: ${field}`);
  }
});

test("empty and missing fields export as empty, not as \"null\"", () => {
  assert.equal(csvField(null), "");
  assert.equal(csvField(undefined), "");
  assert.equal(csvField(""), "");
});

test("pence become a plain decimal a spreadsheet can add up", () => {
  assert.equal(csvAmount(0), "0.00");
  assert.equal(csvAmount(5), "0.05");
  assert.equal(csvAmount(123456), "1234.56");
  assert.equal(csvAmount(-2500), "-25.00");
});

test("the CSV has a header, one row per entry, and CRLF endings", () => {
  const csv = toCsv([
    entry({ kind: "income", amountPence: 7500, description: "Single session" }),
    entry({ kind: "expense", amountPence: 2000 }),
  ]);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith("Date,Type,Category"));
  assert.ok(csv.endsWith("\r\n"));
});

test("expenses export as negative amounts, income as positive", () => {
  const csv = toCsv([
    entry({ kind: "income", amountPence: 7500 }),
    entry({ date: new Date("2026-04-02T00:00:00Z"), kind: "expense", amountPence: 2000 }),
  ]);
  const [, income, expense] = csv.trimEnd().split("\r\n");
  assert.ok(income.includes(",75.00,"));
  assert.ok(expense.includes(",-20.00,"));
});

test("a supplier name containing a comma survives the round trip intact", () => {
  const csv = toCsv([entry({ counterparty: "Jones, Smith & Partners" })]);
  assert.ok(csv.includes('"Jones, Smith & Partners"'));
});

test("the filename names the period it covers", () => {
  assert.equal(
    exportFilename(new Date("2026-04-01T00:00:00Z"), new Date("2026-06-30T00:00:00Z")),
    "thrivsphere-ledger-2026-04-01-to-2026-06-30.csv"
  );
});

test("a negative amount stays a number the accountant's spreadsheet can add", () => {
  assert.equal(csvField("-20.00"), "-20.00");
  assert.equal(csvField("-1234.56"), "-1234.56");
  // Still not a licence for anything that merely starts with a minus.
  assert.equal(csvField("-2+3"), "'-2+3");
  assert.equal(csvField("-1-cmd"), "'-1-cmd");
});
