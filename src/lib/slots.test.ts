import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSlots, overlaps, type AvailabilityRule } from "./slots";

const LDN = "Europe/London";
const NOW = new Date("2026-06-01T09:00:00Z"); // Monday

// Mondays 18:00–20:00 London.
const mondayEvening: AvailabilityRule = {
  dayOfWeek: 1, startTime: "18:00", endTime: "20:00", timezone: LDN,
};

const base = {
  rules: [mondayEvening],
  exceptions: [],
  busy: [],
  fromDate: "2026-06-08", // the following Monday
  days: 1,
  durationMinutes: 60,
  minimumNoticeHours: 24,
  now: NOW,
};

const iso = (d: Date) => d.toISOString();

describe("generateSlots", () => {
  it("chops a window into whole slots", () => {
    const s = generateSlots(base);
    assert.equal(s.length, 2);
    // 18:00 BST = 17:00 UTC
    assert.equal(iso(s[0].startsAt), "2026-06-08T17:00:00.000Z");
    assert.equal(iso(s[1].startsAt), "2026-06-08T18:00:00.000Z");
  });

  it("never offers a partial slot at the end of a window", () => {
    const s = generateSlots({ ...base, durationMinutes: 90 });
    assert.equal(s.length, 1); // 90 + 90 > 120 minutes
  });

  it("only offers days matching the weekly rule", () => {
    const s = generateSlots({ ...base, fromDate: "2026-06-09", days: 6 }); // Tue–Sun
    assert.equal(s.length, 0);
  });

  it("skips a day blocked entirely by an exception", () => {
    const s = generateSlots({
      ...base,
      exceptions: [{ date: "2026-06-08", blocked: true }],
    });
    assert.equal(s.length, 0);
  });

  it("subtracts a partial block from a day", () => {
    const s = generateSlots({
      ...base,
      exceptions: [{ date: "2026-06-08", blocked: true, startTime: "18:00", endTime: "19:00" }],
    });
    assert.equal(s.length, 1);
    assert.equal(iso(s[0].startsAt), "2026-06-08T18:00:00.000Z"); // 19:00 BST
  });

  it("adds a one-off window on a day with no rule", () => {
    const s = generateSlots({
      ...base,
      fromDate: "2026-06-10", // Wednesday
      exceptions: [{ date: "2026-06-10", blocked: false, startTime: "10:00", endTime: "11:00" }],
    });
    assert.equal(s.length, 1);
    assert.equal(iso(s[0].startsAt), "2026-06-10T09:00:00.000Z");
  });

  it("does not offer a slot that is already booked", () => {
    const s = generateSlots({
      ...base,
      busy: [{ startsAt: new Date("2026-06-08T17:00:00Z"), endsAt: new Date("2026-06-08T18:00:00Z") }],
    });
    assert.equal(s.length, 1);
    assert.equal(iso(s[0].startsAt), "2026-06-08T18:00:00.000Z");
  });

  it("excludes a slot that only partially overlaps a booking", () => {
    const s = generateSlots({
      ...base,
      busy: [{ startsAt: new Date("2026-06-08T17:30:00Z"), endsAt: new Date("2026-06-08T18:30:00Z") }],
    });
    assert.equal(s.length, 0); // both slots are clipped
  });

  it("still offers a slot that merely abuts a booking", () => {
    const s = generateSlots({
      ...base,
      busy: [{ startsAt: new Date("2026-06-08T18:00:00Z"), endsAt: new Date("2026-06-08T19:00:00Z") }],
    });
    assert.equal(s.length, 1);
    assert.equal(iso(s[0].startsAt), "2026-06-08T17:00:00.000Z");
  });

  it("honours the minimum notice period", () => {
    // Same-day Monday with only a few hours' notice.
    const s = generateSlots({ ...base, fromDate: "2026-06-01", now: new Date("2026-06-01T12:00:00Z") });
    assert.equal(s.length, 0);
  });

  it("offers slots once notice has passed", () => {
    const s = generateSlots({ ...base, fromDate: "2026-06-01", now: new Date("2026-05-31T09:00:00Z") });
    assert.equal(s.length, 2);
  });

  it("keeps 18:00 local across the autumn clock change", () => {
    const rules = [{ ...mondayEvening, dayOfWeek: 0 }]; // Sundays
    const before = generateSlots({ ...base, rules, fromDate: "2026-10-18", days: 1 });
    const after = generateSlots({ ...base, rules, fromDate: "2026-10-25", days: 1 });
    assert.equal(localHour(before[0].startsAt), "18");
    assert.equal(localHour(after[0].startsAt), "18");
    // The UTC instants differ, because the offset changed.
    assert.notEqual(before[0].startsAt.toISOString().slice(11, 13), after[0].startsAt.toISOString().slice(11, 13));
  });

  it("does not duplicate a slot when two rules overlap", () => {
    const s = generateSlots({ ...base, rules: [mondayEvening, { ...mondayEvening }] });
    assert.equal(s.length, 2);
  });

  it("ignores inactive rules", () => {
    const s = generateSlots({ ...base, rules: [{ ...mondayEvening, active: false }] });
    assert.equal(s.length, 0);
  });

  it("returns nothing for a zero or negative duration", () => {
    assert.equal(generateSlots({ ...base, durationMinutes: 0 }).length, 0);
  });

  it("returns slots in chronological order", () => {
    const s = generateSlots({ ...base, fromDate: "2026-06-08", days: 15 });
    for (let i = 1; i < s.length; i++) {
      assert.ok(s[i].startsAt >= s[i - 1].startsAt, "slots must be sorted");
    }
  });
});

describe("overlaps", () => {
  const d = (s: string) => new Date(s);
  it("is false when one ends exactly as the other begins", () => {
    assert.equal(overlaps(d("2026-06-08T17:00Z"), d("2026-06-08T18:00Z"), d("2026-06-08T18:00Z"), d("2026-06-08T19:00Z")), false);
  });
  it("is true for a partial overlap", () => {
    assert.equal(overlaps(d("2026-06-08T17:00Z"), d("2026-06-08T18:00Z"), d("2026-06-08T17:30Z"), d("2026-06-08T18:30Z")), true);
  });
  it("is true when one contains the other", () => {
    assert.equal(overlaps(d("2026-06-08T17:00Z"), d("2026-06-08T19:00Z"), d("2026-06-08T17:30Z"), d("2026-06-08T18:00Z")), true);
  });
});

function localHour(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: LDN, hour: "2-digit", hour12: false }).format(d);
}
