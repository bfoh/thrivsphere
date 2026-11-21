import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SUITABILITY_OUTCOMES, outcomeDue, outcomeLabel, parseDecision, sessionGate } from "./suitability-rules";

describe("sessionGate", () => {
  it("opens sessions only after a Suitable decision", () => {
    assert.deepEqual(sessionGate("suitable"), { open: true });
    for (const latest of [null, "clarification", "not_suitable"] as const) {
      const gate = sessionGate(latest);
      assert.equal(gate.open, false, `${latest} must keep sessions closed`);
      if (!gate.open) assert.ok(gate.message.length > 20);
    }
  });

  it("never tells an unsuitable client why, in their account", () => {
    const gate = sessionGate("not_suitable");
    assert.ok(!gate.open && !/suitab/i.test(gate.message));
  });
});

describe("parseDecision", () => {
  const base = { outcome: "suitable", rationale: "Goals sit within the non-clinical remit.", signpostedTo: "" };

  it("accepts a Suitable decision with a rationale", () => {
    const r = parseDecision(base);
    assert.ok(r.ok);
    assert.deepEqual(r.ok && r.value, { outcome: "suitable", rationale: base.rationale, signpostedTo: null });
  });

  it("requires a rationale", () => {
    const r = parseDecision({ ...base, rationale: "ok" });
    assert.ok(!r.ok && r.fieldErrors.rationale);
  });

  it("refuses an unknown outcome", () => {
    const r = parseDecision({ ...base, outcome: "maybe" });
    assert.ok(!r.ok && r.fieldErrors.outcome);
  });

  it("requires where a Not suitable client was signposted", () => {
    const missing = parseDecision({ ...base, outcome: "not_suitable" });
    assert.ok(!missing.ok && missing.fieldErrors.signpostedTo);
    const given = parseDecision({ ...base, outcome: "not_suitable", signpostedTo: "  Their GP  " });
    assert.ok(given.ok && given.value.signpostedTo === "Their GP");
  });

  it("drops a signpost given with any other outcome", () => {
    const r = parseDecision({ ...base, outcome: "clarification", signpostedTo: "Their GP" });
    assert.ok(r.ok && r.value.signpostedTo === null);
  });
});

describe("outcomeDue", () => {
  const t = (iso: string) => new Date(iso);

  it("is due after a completed consultation with no decision", () => {
    assert.equal(outcomeDue({ consultationCompletedAt: t("2026-11-20T10:00Z"), latestDecisionAt: null }), true);
  });

  it("is not due before the consultation", () => {
    assert.equal(outcomeDue({ consultationCompletedAt: null, latestDecisionAt: null }), false);
  });

  it("is not due once decided after the consultation", () => {
    assert.equal(
      outcomeDue({ consultationCompletedAt: t("2026-11-20T10:00Z"), latestDecisionAt: t("2026-11-20T11:00Z") }),
      false
    );
  });

  it("is due again after a second consultation following an earlier decision", () => {
    assert.equal(
      outcomeDue({ consultationCompletedAt: t("2026-12-01T10:00Z"), latestDecisionAt: t("2026-11-20T11:00Z") }),
      true
    );
  });
});

it("words the outcomes as the handover does", () => {
  assert.deepEqual(
    SUITABILITY_OUTCOMES.map((o) => o.label),
    ["Suitable", "Clarification or further support needed", "Not suitable — signpost"]
  );
  assert.equal(outcomeLabel("clarification"), "Clarification or further support needed");
});
