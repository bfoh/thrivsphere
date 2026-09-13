import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPence,
  meanPence,
  monthKey,
  monthlySeries,
  percentChange,
  rank,
  share,
} from "./revenue";

const NOW = new Date("2026-06-15T10:00:00Z");

test("months are keyed in UTC, so a late-night payment lands in one month only", () => {
  assert.equal(monthKey(new Date("2026-03-31T23:30:00Z")), "2026-03");
  assert.equal(monthKey(new Date("2026-04-01T00:30:00Z")), "2026-04");
  assert.equal(monthKey(new Date("2026-01-05T12:00:00Z")), "2026-01");
});

test("a month with no income appears as zero rather than being skipped", () => {
  const series = monthlySeries(
    [
      { at: new Date("2026-04-10T09:00:00Z"), amountPence: 5000 },
      { at: new Date("2026-06-02T09:00:00Z"), amountPence: 7500 },
    ],
    3,
    NOW
  );
  assert.deepEqual(
    series.map((b) => [b.key, b.incomePence]),
    [
      ["2026-04", 5000],
      ["2026-05", 0],
      ["2026-06", 7500],
    ]
  );
});

test("payments in the same month accumulate and are counted", () => {
  const series = monthlySeries(
    [
      { at: new Date("2026-06-01T09:00:00Z"), amountPence: 4000 },
      { at: new Date("2026-06-20T09:00:00Z"), amountPence: 6000 },
    ],
    1,
    NOW
  );
  assert.equal(series[0].incomePence, 10000);
  assert.equal(series[0].orders, 2);
});

test("payments outside the window are excluded, not folded into the edge month", () => {
  const series = monthlySeries(
    [
      { at: new Date("2025-01-01T09:00:00Z"), amountPence: 99999 },
      { at: new Date("2026-06-01T09:00:00Z"), amountPence: 1000 },
    ],
    3,
    NOW
  );
  assert.equal(series.reduce((s, b) => s + b.incomePence, 0), 1000);
});

test("the series spans a year boundary correctly", () => {
  const series = monthlySeries([], 3, new Date("2026-02-10T00:00:00Z"));
  assert.deepEqual(series.map((b) => b.key), ["2025-12", "2026-01", "2026-02"]);
});

test("money formats as sterling, with a minus sign before the symbol", () => {
  assert.equal(formatPence(0), "£0.00");
  assert.equal(formatPence(5), "£0.05");
  assert.equal(formatPence(123450), "£1,234.50");
  assert.equal(formatPence(-1200), "−£12.00");
});

test("means stay in whole pence and do not drift upward", () => {
  assert.equal(meanPence(10000, 3), 3333);
  assert.equal(meanPence(0, 5), 0);
  assert.equal(meanPence(5000, 0), 0);
  assert.equal(meanPence(-500, 2), -250);
});

test("growth from zero is not reported as a percentage", () => {
  assert.equal(percentChange(5000, 0), null);
  assert.equal(percentChange(0, 0), null);
});

test("percentage change is signed and rounded", () => {
  assert.equal(percentChange(15000, 10000), 50);
  assert.equal(percentChange(5000, 10000), -50);
  assert.equal(percentChange(10000, 10000), 0);
});

test("share of a zero total is zero, not a division by zero", () => {
  assert.equal(share(0, 0), 0);
  assert.equal(share(2500, 10000), 25);
});

test("ranking orders by income and attaches each row's share", () => {
  const ranked = rank([
    { name: "Single", incomePence: 2500 },
    { name: "Block of six", incomePence: 7500 },
  ]);
  assert.deepEqual(ranked.map((r) => r.name), ["Block of six", "Single"]);
  assert.deepEqual(ranked.map((r) => r.share), [75, 25]);
});

test("ranking does not mutate the rows it was given", () => {
  const rows = [{ incomePence: 1 }, { incomePence: 2 }];
  rank(rows);
  assert.deepEqual(rows.map((r) => r.incomePence), [1, 2]);
});
