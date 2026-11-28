import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canJoin, firstName, greeting, longDate, monthToDate, sessionPhase, trend, ukDay } from "./dashboard";

describe("ukDay", () => {
  it("runs midnight to midnight in winter (UK time is UTC)", () => {
    const d = ukDay(new Date("2026-11-28T15:00:00Z"));
    assert.equal(d.from.toISOString(), "2026-11-28T00:00:00.000Z");
    assert.equal(d.to.toISOString(), "2026-11-29T00:00:00.000Z");
  });

  it("follows British Summer Time, so 00:30 on a summer Monday is Monday", () => {
    // 23:30 UTC on Sunday 14 June is 00:30 on Monday 15 June in London.
    const d = ukDay(new Date("2026-06-14T23:30:00Z"));
    assert.equal(d.from.toISOString(), "2026-06-14T23:00:00.000Z");
    assert.equal(d.to.toISOString(), "2026-06-15T23:00:00.000Z");
  });
});

describe("monthToDate", () => {
  it("compares this month so far with the same stretch of last month", () => {
    const now = new Date("2026-11-28T12:00:00Z");
    const r = monthToDate(now);
    assert.equal(r.from.toISOString(), "2026-11-01T00:00:00.000Z");
    assert.equal(r.to, now);
    // October starts in summer time (UTC+1).
    assert.equal(r.prevFrom.toISOString(), "2026-09-30T23:00:00.000Z");
    assert.equal(r.prevTo.getTime() - r.prevFrom.getTime(), now.getTime() - r.from.getTime());
  });

  it("stops at the end of a shorter last month", () => {
    const r = monthToDate(new Date("2026-03-30T12:00:00Z"));
    assert.equal(r.prevTo.toISOString(), r.from.toISOString());
  });

  it("reaches back into December from January", () => {
    const r = monthToDate(new Date("2027-01-10T09:00:00Z"));
    assert.equal(r.prevFrom.toISOString(), "2026-12-01T00:00:00.000Z");
  });
});

describe("trend", () => {
  it("says nothing when both months are empty", () => {
    assert.equal(trend(0, 0), null);
  });

  it("gives the plain difference, never a percentage", () => {
    assert.deepEqual(trend(1, 0), { text: "1 more than this time last month", direction: "up" });
    assert.deepEqual(trend(2, 5), { text: "3 fewer than this time last month", direction: "down" });
    assert.deepEqual(trend(4, 4), { text: "Same as this time last month", direction: "flat" });
  });

  it("formats money when asked", () => {
    assert.equal(trend(4000, 1000, (p) => `£${p / 100}`)?.text, "£30 more than this time last month");
  });
});

describe("greeting", () => {
  it("uses the UK clock", () => {
    assert.equal(greeting(new Date("2026-11-28T09:00:00Z")), "Good morning");
    assert.equal(greeting(new Date("2026-11-28T13:00:00Z")), "Good afternoon");
    assert.equal(greeting(new Date("2026-11-28T19:00:00Z")), "Good evening");
    // 11:30 UTC in June is 12:30 in London.
    assert.equal(greeting(new Date("2026-06-15T11:30:00Z")), "Good afternoon");
  });
});

describe("longDate", () => {
  it("reads like a date on a letter", () => {
    assert.equal(longDate(new Date("2026-11-28T12:00:00Z")), "Saturday 28 November 2026");
  });
});

describe("firstName", () => {
  it("greets by the first word of the name given", () => {
    assert.equal(firstName("Patience Barning"), "Patience");
    assert.equal(firstName("  Lucy  "), "Lucy");
  });

  it("gives nothing rather than an email or a blank", () => {
    assert.equal(firstName(null), null);
    assert.equal(firstName("   "), null);
  });
});

describe("sessionPhase and canJoin", () => {
  const s = { startsAt: new Date("2026-11-28T18:00:00Z"), endsAt: new Date("2026-11-28T18:50:00Z"), status: "scheduled" };
  const at = (iso: string) => new Date(iso);

  it("tracks a booked session through the day", () => {
    assert.equal(sessionPhase(s, at("2026-11-28T17:00:00Z")), "upcoming");
    assert.equal(sessionPhase(s, at("2026-11-28T18:10:00Z")), "now");
    assert.equal(sessionPhase(s, at("2026-11-28T19:00:00Z")), "to-close");
    assert.equal(sessionPhase({ ...s, status: "completed" }, at("2026-11-28T19:00:00Z")), "done");
  });

  it("offers the joining link from 15 minutes before until the end", () => {
    assert.equal(canJoin(s, at("2026-11-28T17:44:00Z")), false);
    assert.equal(canJoin(s, at("2026-11-28T17:45:00Z")), true);
    assert.equal(canJoin(s, at("2026-11-28T18:49:00Z")), true);
    assert.equal(canJoin(s, at("2026-11-28T18:50:00Z")), false);
    assert.equal(canJoin({ ...s, status: "cancelled_by_client" }, at("2026-11-28T18:10:00Z")), false);
  });
});
