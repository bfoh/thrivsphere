import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDays, formatZonedDate, zoneOffsetMs, zonedDayOfWeek, zonedTimeToUtc } from "./time";

const LDN = "Europe/London";
const HOUR = 3600_000;

/**
 * Availability is stored as wall-clock time in a zone, so these conversions
 * decide when appointments actually happen. An error here shifts every session
 * by an hour for half the year, which is exactly the kind of bug that only
 * surfaces after a clock change.
 */
describe("zoneOffsetMs", () => {
  it("is GMT (+0) in winter", () => {
    assert.equal(zoneOffsetMs(new Date("2026-01-15T12:00:00Z"), LDN), 0);
  });

  it("is BST (+1h) in summer", () => {
    assert.equal(zoneOffsetMs(new Date("2026-06-15T12:00:00Z"), LDN), HOUR);
  });
});

describe("zonedTimeToUtc", () => {
  it("treats winter wall-clock time as UTC", () => {
    assert.equal(zonedTimeToUtc("2026-01-15", "18:00", LDN).toISOString(), "2026-01-15T18:00:00.000Z");
  });

  it("shifts summer wall-clock time back an hour", () => {
    // 18:00 BST is 17:00 UTC.
    assert.equal(zonedTimeToUtc("2026-06-15", "18:00", LDN).toISOString(), "2026-06-15T17:00:00.000Z");
  });

  it("keeps 6pm meaning 6pm either side of the spring change", () => {
    const before = zonedTimeToUtc("2026-03-28", "18:00", LDN);
    const after = zonedTimeToUtc("2026-03-30", "18:00", LDN);
    // Both read 18:00 locally even though the UTC instants differ by an hour.
    assert.equal(formatLocalHour(before), "18");
    assert.equal(formatLocalHour(after), "18");
    assert.notEqual(before.toISOString().slice(11, 13), after.toISOString().slice(11, 13));
  });

  it("keeps 6pm meaning 6pm either side of the autumn change", () => {
    assert.equal(formatLocalHour(zonedTimeToUtc("2026-10-24", "18:00", LDN)), "18");
    assert.equal(formatLocalHour(zonedTimeToUtc("2026-10-26", "18:00", LDN)), "18");
  });

  it("handles a time inside the spring-forward gap without throwing", () => {
    // 01:30 on the morning the clocks jump 01:00 -> 02:00 does not exist.
    const d = zonedTimeToUtc("2026-03-29", "01:30", LDN);
    assert.ok(!Number.isNaN(d.getTime()));
  });

  it("accepts seconds in the time string", () => {
    assert.equal(zonedTimeToUtc("2026-01-15", "09:05:30", LDN).toISOString(), "2026-01-15T09:05:30.000Z");
  });

  it("round-trips through formatZonedDate", () => {
    const inst = zonedTimeToUtc("2026-06-15", "23:30", LDN);
    assert.equal(formatZonedDate(inst, LDN), "2026-06-15");
  });

  it("does not roll a late-evening BST slot into the next day", () => {
    // 23:30 BST is 22:30 UTC — same calendar day locally.
    const inst = zonedTimeToUtc("2026-07-01", "23:30", LDN);
    assert.equal(inst.toISOString(), "2026-07-01T22:30:00.000Z");
    assert.equal(formatZonedDate(inst, LDN), "2026-07-01");
  });
});

describe("zonedDayOfWeek", () => {
  it("reports the local day, not the UTC day", () => {
    // 00:30 BST on Tuesday is 23:30 UTC on Monday.
    const inst = new Date("2026-06-15T23:30:00Z");
    assert.equal(zonedDayOfWeek(inst, LDN), 2); // Tuesday locally
    assert.equal(inst.getUTCDay(), 1); // Monday in UTC
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  });
  it("crosses a year boundary", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  });
  it("goes backwards", () => {
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });
});

function formatLocalHour(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: LDN, hour: "2-digit", hour12: false }).format(d);
}
