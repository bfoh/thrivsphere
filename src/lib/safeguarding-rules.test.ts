import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AGREED_ACTIONS,
  CONCERN_TYPES,
  canStandDownFlag,
  flagReason,
  initialStatus,
  labelsFor,
  londonDateTime,
  parseConcernRecord,
  shouldShowCrisisGuidance,
} from "./safeguarding-rules";

const NOW = new Date("2026-11-21T15:00:00Z");
const PRACTITIONER = "11111111-2222-3333-4444-555555555555";

/** A form as a browser would send it. */
function form(values: Record<string, string | string[]>) {
  return {
    get: (n: string) => {
      const v = values[n];
      return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
    },
    getAll: (n: string) => {
      const v = values[n];
      return Array.isArray(v) ? v : v === undefined ? [] : [v];
    },
  };
}

const minimal = {
  occurredDate: "2026-11-21",
  occurredTime: "14:05",
  practitionerId: PRACTITIONER,
  arose: ["client_disclosure"],
  concernTypes: ["harm_from_another"],
  detail: "Client said their partner 'checks my phone every night'.",
  immediateThreat: "no",
  immediateThreatInfo: "Client said they are safe tonight and staying with a friend.",
  trustedPersonRequired: "no",
  externalContacted: "no",
  discussedInternally: "no",
  nextSteps: ["review"],
  initials: "AB",
};

describe("parseConcernRecord", () => {
  it("accepts a complete record and keeps the client's own words", () => {
    const r = parseConcernRecord(form(minimal), NOW);
    assert.ok(r.ok);
    assert.equal(r.record.detail, minimal.detail);
    assert.deepEqual(r.record.concernTypes, ["harm_from_another"]);
    assert.equal(r.record.trustedPersonAgreed, null);
    assert.equal(r.record.escalatedTo, null);
  });

  it("requires the essentials", () => {
    const r = parseConcernRecord(form({}), NOW);
    assert.ok(!r.ok);
    for (const field of ["occurredDate", "practitionerId", "arose", "concernTypes", "detail", "immediateThreat", "immediateThreatInfo", "trustedPersonRequired", "externalContacted", "discussedInternally", "nextSteps", "initials"]) {
      assert.ok(r.errors[field], `${field} should be required`);
    }
  });

  it("has no risk score to fill in", () => {
    const r = parseConcernRecord(form({ ...minimal, level: "high" }), NOW);
    assert.ok(r.ok);
    assert.equal("level" in r.record, false);
  });

  it("asks for the words behind each Other", () => {
    const r = parseConcernRecord(form({ ...minimal, arose: ["other"], concernTypes: ["other"], agreedActions: ["other"], nextSteps: ["other"] }), NOW);
    assert.ok(!r.ok);
    assert.ok(r.errors.aroseOther && r.errors.concernTypeOther && r.errors.agreedActionOther && r.errors.nextStepOther);
  });

  it("ignores ticks that aren't on the form", () => {
    const r = parseConcernRecord(form({ ...minimal, concernTypes: ["harm_to_self", "made_up"] }), NOW);
    assert.ok(r.ok);
    assert.deepEqual(r.record.concernTypes, ["harm_to_self"]);
  });

  it("needs the details when an external service was contacted", () => {
    const r = parseConcernRecord(form({ ...minimal, externalContacted: "yes" }), NOW);
    assert.ok(!r.ok);
    for (const field of ["escalatedTo", "escalatedDate", "informationShared", "sharingReason", "sharingClientInformed"]) {
      assert.ok(r.errors[field], `${field} should be required when shared`);
    }
    const ok = parseConcernRecord(
      form({
        ...minimal,
        externalContacted: "yes",
        escalatedTo: "Local authority adult safeguarding team",
        escalatedDate: "2026-11-21",
        escalatedTime: "14:40",
        informationShared: "Name, address, what was disclosed.",
        sharingReason: "Ongoing risk of serious harm from another person.",
        sharingClientInformed: "no",
        sharedWithoutConsentReason: "Client could not be reached and the risk was serious.",
      }),
      NOW
    );
    assert.ok(ok.ok);
    assert.equal(ok.record.sharingClientInformed, false);
    assert.equal(initialStatus(ok.record), "escalated");
  });

  it("needs who and when for an internal discussion, and whether the client agreed to a trusted person", () => {
    const r = parseConcernRecord(form({ ...minimal, discussedInternally: "yes", trustedPersonRequired: "yes" }), NOW);
    assert.ok(!r.ok);
    assert.ok(r.errors.discussedWith && r.errors.discussedDate && r.errors.trustedPersonAgreed);
  });

  it("drops section details when the answer was No", () => {
    const r = parseConcernRecord(form({ ...minimal, escalatedTo: "Police", discussedWith: ["lead"] }), NOW);
    assert.ok(r.ok);
    assert.equal(r.record.escalatedTo, null);
    assert.deepEqual(r.record.discussedWith, []);
    assert.equal(initialStatus(r.record), "open");
  });

  it("refuses a time in the future and a follow-up with nobody responsible", () => {
    const r = parseConcernRecord(form({ ...minimal, occurredTime: "23:00", followUpAction: "Call on Monday" }), NOW);
    assert.ok(!r.ok);
    assert.ok(r.errors.occurredDate && r.errors.followUpBy);
  });
});

describe("londonDateTime", () => {
  it("reads typed times as UK time, in and out of summer time", () => {
    assert.equal(londonDateTime("2026-11-21", "14:05")?.toISOString(), "2026-11-21T14:05:00.000Z");
    assert.equal(londonDateTime("2026-07-01", "14:05")?.toISOString(), "2026-07-01T13:05:00.000Z");
  });
  it("rejects dates that don't exist", () => {
    assert.equal(londonDateTime("2026-02-31", "10:00"), null);
    assert.equal(londonDateTime("21/11/2026", "10:00"), null);
  });
});

describe("what a record sets in motion", () => {
  it("raises a flag for Yes or Unclear, or a review before the next session", () => {
    assert.match(flagReason({ immediateThreat: "yes", nextSteps: [] })!, /Yes/);
    assert.match(flagReason({ immediateThreat: "unclear", nextSteps: [] })!, /Unclear/);
    assert.match(flagReason({ immediateThreat: "no", nextSteps: ["review"] })!, /Review with Safeguarding Lead/);
    assert.equal(flagReason({ immediateThreat: "no", nextSteps: ["continue"] }), null);
  });

  it("shows the crisis numbers when life may be at risk", () => {
    assert.equal(shouldShowCrisisGuidance(["harm_to_self"], "no"), true);
    assert.equal(shouldShowCrisisGuidance(["deterioration"], "unclear"), true);
    assert.equal(shouldShowCrisisGuidance(["medical"], "no"), false);
  });

  it("lets only the founder or the deputy stand a flag down", () => {
    assert.equal(canStandDownFlag({ role: "founder", safeguardingDeputy: false }), true);
    assert.equal(canStandDownFlag({ role: "practitioner", safeguardingDeputy: true }), true);
    assert.equal(canStandDownFlag({ role: "admin", safeguardingDeputy: false }), false);
    assert.equal(canStandDownFlag({ role: "practitioner", safeguardingDeputy: false }), false);
  });

  it("shows ticks in the form's words", () => {
    assert.deepEqual(labelsFor(CONCERN_TYPES, ["domestic_abuse"]), ["Domestic abuse / coercive control"]);
    assert.deepEqual(labelsFor(AGREED_ACTIONS, ["other"], "Call their sister"), ["Other: Call their sister"]);
  });
});
