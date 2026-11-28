import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockPosition, hourMarks, shortDate, toMinutes, trackRange, WEEK_ORDER } from "./availability-view";

describe("availability grid", () => {
  it("reads the week Monday to Sunday", () => {
    assert.deepEqual([...WEEK_ORDER], [1, 2, 3, 4, 5, 6, 0]);
  });

  it("reads times with or without seconds", () => {
    assert.equal(toMinutes("18:30"), 1110);
    assert.equal(toMinutes("09:05:00"), 545);
  });

  it("spans whole hours around the rules", () => {
    assert.deepEqual(trackRange([{ startTime: "09:30", endTime: "12:00" }, { startTime: "17:00", endTime: "20:15" }]), { from: 9, to: 21 });
  });

  it("falls back to 8am to 8pm, and never spans less than six hours", () => {
    assert.deepEqual(trackRange([]), { from: 8, to: 20 });
    const r = trackRange([{ startTime: "18:00", endTime: "20:00" }]);
    assert.equal(r.to - r.from, 6);
    assert.ok(r.from <= 18 && r.to >= 20);
  });

  it("stays inside the day at the edges", () => {
    const r = trackRange([{ startTime: "00:00", endTime: "02:00" }]);
    assert.ok(r.from >= 0 && r.to - r.from === 6);
    const late = trackRange([{ startTime: "22:00", endTime: "23:59" }]);
    assert.ok(late.to <= 24 && late.to - late.from === 6);
  });

  it("places a block as a share of the track", () => {
    assert.deepEqual(blockPosition("18:00", "20:00", { from: 16, to: 22 }), { left: (2 / 6) * 100, width: (2 / 6) * 100 });
  });

  it("marks every hour on a short day and every other on a long one", () => {
    assert.deepEqual(hourMarks({ from: 16, to: 22 }), [16, 17, 18, 19, 20, 21, 22]);
    assert.deepEqual(hourMarks({ from: 8, to: 20 }), [8, 10, 12, 14, 16, 18, 20]);
  });

  it("writes a date the way a diary does", () => {
    assert.equal(shortDate("2026-12-01"), "Tue 1 Dec 2026");
  });
});
