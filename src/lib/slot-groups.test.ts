import test from "node:test";
import assert from "node:assert/strict";
import { groupSlotsByDay } from "./slot-groups";

test("groups by the UK day, not the UTC one", () => {
  // 23:30 UTC on 31 May is 00:30 BST on 1 June.
  const groups = groupSlotsByDay([
    { startsAt: new Date("2026-05-31T17:00:00Z") },
    { startsAt: new Date("2026-05-31T23:30:00Z") },
  ]);
  assert.deepEqual(groups.map((g) => g.date), ["2026-05-31", "2026-06-01"]);
  assert.equal(groups[0].slots[0].time, "18:00");
  assert.equal(groups[1].slots[0].time, "00:30");
});
