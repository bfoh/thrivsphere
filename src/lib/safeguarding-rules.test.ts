import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  shouldRaiseRiskFlag,
  shouldShowCrisisGuidance,
  validateConcern,
  type ConcernInput,
} from "./safeguarding-rules";

const valid: ConcernInput = {
  category: "adult_safeguarding",
  level: "low",
  detail: "Client described feeling unsafe at home during the session.",
  clientInformed: true,
  consentToShare: true,
};

describe("validateConcern", () => {
  it("accepts a complete low-risk concern", () => {
    assert.deepEqual(validateConcern(valid), {});
  });

  it("rejects an unknown category or level", () => {
    assert.ok(validateConcern({ ...valid, category: "made-up" }).category);
    assert.ok(validateConcern({ ...valid, level: "catastrophic" }).level);
  });

  it("requires a real description, not a couple of characters", () => {
    assert.ok(validateConcern({ ...valid, detail: "hm" }).detail);
    assert.ok(validateConcern({ ...valid, detail: "   " }).detail);
  });

  it("requires an action for a high-risk concern", () => {
    const e = validateConcern({ ...valid, level: "high" });
    assert.ok(e.immediateAction, "high risk with no action must be rejected");
  });

  it("requires an action for an immediate-risk concern", () => {
    assert.ok(validateConcern({ ...valid, level: "immediate" }).immediateAction);
  });

  it("accepts a high-risk concern once an action is recorded", () => {
    const e = validateConcern({
      ...valid,
      level: "high",
      immediateAction: "Stayed with client, agreed safety plan, advised to contact GP.",
    });
    assert.deepEqual(e, {});
  });

  it("requires an action for a child-at-risk concern at any level", () => {
    const e = validateConcern({ ...valid, category: "child_at_risk", level: "low" });
    assert.ok(e.immediateAction, "child at risk always needs an action");
  });

  it("requires an action for immediate danger at any level", () => {
    assert.ok(validateConcern({ ...valid, category: "immediate_danger", level: "low" }).immediateAction);
  });

  it("requires a reason when information is shared without consent", () => {
    const e = validateConcern({ ...valid, consentToShare: false });
    assert.ok(e.sharedWithoutConsentReason);
  });

  it("accepts sharing without consent when a reason is given", () => {
    const e = validateConcern({
      ...valid,
      consentToShare: false,
      sharedWithoutConsentReason: "Serious and immediate risk to life.",
    });
    assert.deepEqual(e, {});
  });

  it("does not demand a reason when consent was given or not applicable", () => {
    assert.equal(validateConcern({ ...valid, consentToShare: true }).sharedWithoutConsentReason, undefined);
    assert.equal(validateConcern({ ...valid, consentToShare: null }).sharedWithoutConsentReason, undefined);
  });
});

describe("shouldShowCrisisGuidance", () => {
  it("shows for suicide or self-harm at any level", () => {
    assert.equal(shouldShowCrisisGuidance("suicide_self_harm", "low"), true);
  });
  it("shows for immediate danger", () => {
    assert.equal(shouldShowCrisisGuidance("immediate_danger", "low"), true);
  });
  it("shows for any category at immediate risk", () => {
    assert.equal(shouldShowCrisisGuidance("other", "immediate"), true);
  });
  it("does not show for a routine low-risk concern", () => {
    assert.equal(shouldShowCrisisGuidance("adult_safeguarding", "low"), false);
  });
});

describe("shouldRaiseRiskFlag", () => {
  it("carries medium and above forward as a standing flag", () => {
    assert.equal(shouldRaiseRiskFlag("medium"), true);
    assert.equal(shouldRaiseRiskFlag("high"), true);
    assert.equal(shouldRaiseRiskFlag("immediate"), true);
  });
  it("does not flag a low-risk concern", () => {
    assert.equal(shouldRaiseRiskFlag("low"), false);
  });
});
