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

test("carries who is free at each time, so the client can choose a practitioner", () => {
  const groups = groupSlotsByDay([
    { startsAt: new Date("2026-12-01T10:00:00Z"), practitionerIds: ["a", "b"] },
    { startsAt: new Date("2026-12-01T11:00:00Z"), practitionerIds: ["b"] },
  ]);
  assert.deepEqual(groups[0].slots.map((s) => s.practitionerIds), [["a", "b"], ["b"]]);
});

test("leaves practitioners out when they were not given", () => {
  const [g] = groupSlotsByDay([{ startsAt: new Date("2026-12-01T10:00:00Z") }]);
  assert.equal("practitionerIds" in g.slots[0], false);
});
