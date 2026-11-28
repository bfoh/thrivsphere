import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { axisPounds, labelledColumns, niceScale } from "./chart";

describe("niceScale", () => {
  it("rounds up to a clean top with clean steps", () => {
    assert.deepEqual(niceScale(87), { top: 100, ticks: [0, 25, 50, 75, 100] });
    assert.deepEqual(niceScale(13000), { top: 15000, ticks: [0, 5000, 10000, 15000] });
  });

  it("never gives counts a fractional step", () => {
    assert.deepEqual(niceScale(3, { integer: true }), { top: 3, ticks: [0, 1, 2, 3] });
    assert.deepEqual(niceScale(1, { integer: true }), { top: 1, ticks: [0, 1] });
  });

  it("still draws an axis when everything is zero", () => {
    assert.deepEqual(niceScale(0, { integer: true }).ticks, [0, 1, 2, 3, 4]);
    assert.deepEqual(niceScale(0).ticks, [0, 0.5, 1]);
  });

  it("keeps the top at or above the largest value", () => {
    for (const max of [1, 7, 12, 99, 101, 4999, 250000]) assert.ok(niceScale(max).top >= max, String(max));
  });
});

describe("labelledColumns", () => {
  it("labels the latest and the highest, nothing else", () => {
    assert.deepEqual([...labelledColumns([1, 9, 3, 4])].sort(), [1, 3]);
  });
  it("labels one column when the latest is the highest", () => {
    assert.deepEqual([...labelledColumns([1, 2, 5])], [2]);
  });
  it("prints no zeros", () => {
    assert.equal(labelledColumns([0, 0, 0]).size, 0);
    assert.deepEqual([...labelledColumns([0, 4, 0])], [1]);
  });
});

describe("axisPounds", () => {
  it("writes pounds compactly", () => {
    assert.equal(axisPounds(0), "£0");
    assert.equal(axisPounds(5000), "£50");
    assert.equal(axisPounds(150000), "£1.5K");
    assert.equal(axisPounds(1200000), "£12K");
  });
});
