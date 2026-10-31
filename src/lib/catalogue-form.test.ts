import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  describePlanChanges,
  describeServiceChanges,
  parsePlanEdit,
  parseServiceEdit,
  type PlanEdit,
  type ServiceEdit,
} from "./catalogue-form";

const form = (values: Record<string, string>) => (name: string) => values[name] ?? "";

const valid = { name: "Individual Wellbeing Support Session", price: "40", sessions: "1", sortOrder: "1", active: "on" };

describe("parsePlanEdit", () => {
  it("reads a complete form", () => {
    const r = parsePlanEdit(form({ ...valid, blurb: "  A 50-minute session.  " }));
    assert.deepEqual(r, {
      ok: true,
      plan: {
        name: "Individual Wellbeing Support Session",
        blurb: "A 50-minute session.",
        amountPence: 4000,
        sessions: 1,
        sortOrder: 1,
        active: true,
        featured: false,
      },
    });
  });

  it("accepts pounds and pence, with or without the £ sign", () => {
    for (const [price, pence] of [["£150", 15000], ["22.50", 2250], ["1,000", 100000]] as const) {
      const r = parsePlanEdit(form({ ...valid, price }));
      assert.ok(r.ok && r.plan.amountPence === pence, price);
    }
  });

  it("refuses a price it cannot read exactly, or one of zero", () => {
    for (const price of ["", "forty", "40.555", "0", "-5"]) {
      assert.equal(parsePlanEdit(form({ ...valid, price })).ok, false, price);
    }
  });

  it("refuses a missing name", () => {
    assert.equal(parsePlanEdit(form({ ...valid, name: "   " })).ok, false);
  });

  it("refuses sessions that are not a sensible whole number", () => {
    for (const sessions of ["0", "1.5", "", "100"]) {
      assert.equal(parsePlanEdit(form({ ...valid, sessions })).ok, false, sessions);
    }
  });

  it("treats an unticked box as off", () => {
    const r = parsePlanEdit(form({ ...valid, active: "" }));
    assert.ok(r.ok && r.plan.active === false && r.plan.featured === false);
  });
});

describe("describePlanChanges", () => {
  const before: PlanEdit = {
    name: "Four-session package",
    blurb: "Four sessions.",
    amountPence: 15000,
    sessions: 4,
    sortOrder: 2,
    active: true,
    featured: false,
  };

  it("lists what changed, old to new", () => {
    assert.equal(
      describePlanChanges(before, { ...before, amountPence: 16000, active: false }),
      "price £150 → £160; taken off sale"
    );
  });

  it("is empty when nothing changed", () => {
    assert.equal(describePlanChanges(before, { ...before }), "");
  });
});

describe("parseServiceEdit", () => {
  const base = { name: "Workplace Wellbeing", description: "Support with:", sortOrder: "4", active: "on" };

  it("reads one point per line, ignoring blanks and typed bullets", () => {
    const r = serviceOk(parseServiceEdit(form({ ...base, points: "• Workplace stress\r\n\n- Work-life balance\n  Resilience  " })));
    assert.deepEqual(r.points, ["Workplace stress", "Work-life balance", "Resilience"]);
  });

  it("keeps an empty summary and note as null", () => {
    const r = serviceOk(parseServiceEdit(form({ ...base, summary: "  ", note: "" })));
    assert.equal(r.summary, null);
    assert.equal(r.note, null);
  });

  it("refuses a missing name or description", () => {
    assert.equal(parseServiceEdit(form({ ...base, name: "" })).ok, false);
    assert.equal(parseServiceEdit(form({ ...base, description: " " })).ok, false);
  });
});

describe("describeServiceChanges", () => {
  const before: ServiceEdit = {
    name: "Workplace Wellbeing",
    summary: "s",
    description: "Support with:",
    points: ["Workplace stress"],
    note: null,
    sortOrder: 4,
    active: true,
  };

  it("names each kind of change", () => {
    assert.equal(
      describeServiceChanges(before, { ...before, points: ["Workplace stress", "Burnout"], active: false }),
      "points changed; hidden from the website"
    );
  });

  it("is empty when nothing changed", () => {
    assert.equal(describeServiceChanges(before, { ...before, points: [...before.points] }), "");
  });
});

function serviceOk(r: ReturnType<typeof parseServiceEdit>): ServiceEdit {
  assert.ok(r.ok, r.ok ? "" : r.message);
  return r.service;
}
