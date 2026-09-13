import test from "node:test";
import assert from "node:assert/strict";
import {
  absenceDays,
  checkDate,
  daysBetween,
  isAbsentOn,
  worstState,
} from "./hr-rules";

const NOW = new Date("2026-06-15T14:30:00Z");

test("a date in the comfortable future is ok", () => {
  const c = checkDate("2026-12-01", NOW);
  assert.equal(c.state, "ok");
  assert.equal(c.daysRemaining, 169);
});

test("a date inside the warning window is due soon", () => {
  assert.equal(checkDate("2026-07-01", NOW).state, "due_soon");
  assert.equal(checkDate("2026-08-14", NOW).state, "due_soon");
});

test("today is due, not overdue", () => {
  const c = checkDate("2026-06-15", NOW);
  assert.equal(c.state, "due_soon");
  assert.equal(c.label, "Due today");
  assert.equal(c.daysRemaining, 0);
});

test("yesterday is overdue by one day", () => {
  const c = checkDate("2026-06-14", NOW);
  assert.equal(c.state, "overdue");
  assert.equal(c.daysRemaining, -1);
  assert.equal(c.label, "Overdue by 1 day");
});

test("the time of day does not change the answer", () => {
  const morning = checkDate("2026-06-16", new Date("2026-06-15T00:01:00Z"));
  const evening = checkDate("2026-06-16", new Date("2026-06-15T23:59:00Z"));
  assert.equal(morning.daysRemaining, evening.daysRemaining);
});

test("a missing date is flagged as missing, never as ok", () => {
  for (const value of [null, undefined, ""]) {
    const c = checkDate(value, NOW);
    assert.equal(c.state, "missing");
    assert.equal(c.daysRemaining, null);
  }
});

test("an unparseable date is treated as missing rather than silently passing", () => {
  assert.equal(checkDate("not a date", NOW).state, "missing");
});

test("a person is only ok when everything about them is", () => {
  assert.equal(worstState(["ok", "ok"]), "ok");
  assert.equal(worstState(["ok", "due_soon"]), "due_soon");
  assert.equal(worstState(["ok", "due_soon", "missing"]), "missing");
  assert.equal(worstState(["overdue", "ok", "missing"]), "overdue");
  assert.equal(worstState([]), "ok");
});

test("absence dates are inclusive on both ends", () => {
  assert.equal(absenceDays("2026-06-01", "2026-06-01"), 1);
  assert.equal(absenceDays("2026-06-01", "2026-06-05"), 5);
});

test("an absence that ends before it starts counts as nothing", () => {
  assert.equal(absenceDays("2026-06-05", "2026-06-01"), 0);
});

test("an absence covers its first and last day", () => {
  const a = { startsOn: "2026-06-10", endsOn: "2026-06-20" };
  assert.equal(isAbsentOn(a, new Date("2026-06-10T09:00:00Z")), true);
  assert.equal(isAbsentOn(a, new Date("2026-06-20T23:00:00Z")), true);
  assert.equal(isAbsentOn(a, new Date("2026-06-09T23:00:00Z")), false);
  assert.equal(isAbsentOn(a, new Date("2026-06-21T00:30:00Z")), false);
});

test("day arithmetic crosses months and years", () => {
  assert.equal(daysBetween(new Date("2026-12-31T00:00:00Z"), new Date("2027-01-01T00:00:00Z")), 1);
  assert.equal(daysBetween(new Date("2028-02-28T00:00:00Z"), new Date("2028-03-01T00:00:00Z")), 2);
});
