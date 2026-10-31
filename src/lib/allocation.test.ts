import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_REVIEW,
  SUPPORT_SESSION,
  appointmentKinds,
  canReschedule,
  cancellationOutcome,
  isOverlapViolation,
  poolSlots,
  rankPractitioners,
  selectPackage,
  sessionsRemaining,
} from "./allocation";

const at = (iso: string) => new Date(iso);
const slot = (iso: string, minutes = 50) => ({
  startsAt: at(iso),
  endsAt: new Date(at(iso).getTime() + minutes * 60_000),
});

describe("poolSlots", () => {
  it("offers a time once, with everyone free then", () => {
    const pooled = poolSlots([
      { practitionerId: "patience", slots: [slot("2026-11-10T18:00:00Z"), slot("2026-11-10T19:00:00Z")] },
      { practitionerId: "lucy", slots: [slot("2026-11-10T18:00:00Z")] },
    ]);
    assert.equal(pooled.length, 2);
    assert.deepEqual(pooled[0].practitionerIds, ["patience", "lucy"]);
    assert.deepEqual(pooled[1].practitionerIds, ["patience"]);
  });

  it("is sorted by time whatever order practitioners come in", () => {
    const pooled = poolSlots([
      { practitionerId: "b", slots: [slot("2026-11-11T10:00:00Z")] },
      { practitionerId: "a", slots: [slot("2026-11-10T10:00:00Z")] },
    ]);
    assert.deepEqual(pooled.map((s) => s.startsAt.toISOString()), ["2026-11-10T10:00:00.000Z", "2026-11-11T10:00:00.000Z"]);
  });

  it("drops times that clash with the client's own sessions", () => {
    const pooled = poolSlots(
      [{ practitionerId: "lucy", slots: [slot("2026-11-10T18:00:00Z"), slot("2026-11-10T19:00:00Z")] }],
      [{ startsAt: at("2026-11-10T18:30:00Z"), endsAt: at("2026-11-10T19:00:00Z") }]
    );
    assert.deepEqual(pooled.map((s) => s.startsAt.toISOString()), ["2026-11-10T19:00:00.000Z"]);
  });
});

describe("rankPractitioners", () => {
  it("keeps a client with the practitioner they already see", () => {
    const order = rankPractitioners({ candidates: ["a", "b"], previousPractitionerId: "b", upcomingLoad: { a: 0, b: 9 } });
    assert.deepEqual(order, ["b", "a"]);
  });

  it("otherwise shares work to whoever has fewer sessions coming up", () => {
    const order = rankPractitioners({ candidates: ["a", "b", "c"], upcomingLoad: { a: 4, b: 1, c: 2 } });
    assert.deepEqual(order, ["b", "c", "a"]);
  });

  it("ignores a previous practitioner who is not free then", () => {
    const order = rankPractitioners({ candidates: ["a", "c"], previousPractitionerId: "b", upcomingLoad: {} });
    assert.deepEqual(order, ["a", "c"]);
  });

  it("breaks ties the same way every time", () => {
    assert.deepEqual(rankPractitioners({ candidates: ["z", "m", "a"], upcomingLoad: {} }), ["a", "m", "z"]);
  });
});

describe("selectPackage", () => {
  const now = at("2026-11-01T12:00:00Z");
  const pkg = (id: string, over: Partial<{ status: string; sessionsTotal: number; sessionsUsed: number; expiresAt: Date | null; createdAt: Date; forReview: boolean }> = {}) => ({
    id,
    status: "active",
    sessionsTotal: 4,
    sessionsUsed: 0,
    expiresAt: null as Date | null,
    createdAt: at("2026-10-01T00:00:00Z"),
    ...over,
  });

  it("returns null when there is no credit", () => {
    assert.equal(selectPackage([], "session", now), null);
    assert.equal(selectPackage([pkg("used", { sessionsUsed: 4 })], "session", now), null);
  });

  it("never draws on an expired, exhausted or refunded package", () => {
    const chosen = selectPackage(
      [
        pkg("expired", { expiresAt: at("2026-10-31T00:00:00Z") }),
        pkg("exhausted", { status: "exhausted" }),
        pkg("refunded", { status: "refunded" }),
        pkg("good"),
      ],
      "session",
      now
    );
    assert.equal(chosen?.id, "good");
  });

  it("spends the package that expires soonest first", () => {
    const chosen = selectPackage(
      [
        pkg("later", { expiresAt: at("2027-04-01T00:00:00Z") }),
        pkg("never"),
        pkg("sooner", { expiresAt: at("2027-01-01T00:00:00Z") }),
      ],
      "session",
      now
    );
    assert.equal(chosen?.id, "sooner");
  });

  it("pays for the review with review credit first", () => {
    const owned = [
      pkg("four", { expiresAt: at("2026-12-01T00:00:00Z") }),
      pkg("review", { sessionsTotal: 1, forReview: true, expiresAt: at("2027-04-01T00:00:00Z") }),
    ];
    assert.equal(selectPackage(owned, "review", now)?.id, "review");
  });

  it("lets session credit pay for the review when there is no review credit", () => {
    assert.equal(selectPackage([pkg("four")], "review", now)?.id, "four");
  });

  it("never spends review credit on a later session", () => {
    const review = pkg("review", { sessionsTotal: 1, forReview: true });
    assert.equal(selectPackage([review], "session", now), null);
    assert.equal(selectPackage([review, pkg("single", { sessionsTotal: 1 })], "session", now)?.id, "single");
  });

  it("counts only the credit that can pay for the next booking when asked", () => {
    const owned = [pkg("review", { sessionsTotal: 1, forReview: true }), pkg("four", { sessionsUsed: 1 })];
    assert.equal(sessionsRemaining(owned, now), 4);
    assert.equal(sessionsRemaining(owned, now, "review"), 4);
    assert.equal(sessionsRemaining(owned, now, "session"), 3);
  });

  it("counts remaining sessions only on packages that can still be used", () => {
    assert.equal(
      sessionsRemaining(
        [pkg("a", { sessionsUsed: 1 }), pkg("b", { expiresAt: at("2026-10-01T00:00:00Z") }), pkg("c", { status: "refunded" })],
        now
      ),
      3
    );
  });
});

describe("appointmentKinds", () => {
  it("names the first live appointment the Initial Wellbeing Needs Review", () => {
    const kinds = appointmentKinds([
      { id: "second", startsAt: at("2026-11-20T18:00:00Z"), status: "scheduled" },
      { id: "first", startsAt: at("2026-11-10T18:00:00Z"), status: "completed" },
    ]);
    assert.equal(kinds.get("first"), INITIAL_REVIEW);
    assert.equal(kinds.get("second"), SUPPORT_SESSION);
  });

  it("does not let a cancelled first booking use up the review", () => {
    const kinds = appointmentKinds([
      { id: "cancelled", startsAt: at("2026-11-05T18:00:00Z"), status: "cancelled_by_client" },
      { id: "rebooked", startsAt: at("2026-11-12T18:00:00Z"), status: "scheduled" },
    ]);
    assert.equal(kinds.get("rebooked"), INITIAL_REVIEW);
    assert.equal(kinds.get("cancelled"), SUPPORT_SESSION);
  });
});

describe("cancellationOutcome", () => {
  const now = at("2026-11-01T12:00:00Z");

  it("returns the session with 24 hours' notice or more", () => {
    assert.deepEqual(cancellationOutcome({ startsAt: at("2026-11-02T12:00:00Z"), status: "scheduled", now }), {
      allowed: true,
      late: false,
      returnsSession: true,
    });
  });

  it("counts the session as used with less notice", () => {
    assert.deepEqual(cancellationOutcome({ startsAt: at("2026-11-02T11:59:00Z"), status: "scheduled", now }), {
      allowed: true,
      late: true,
      returnsSession: false,
    });
  });

  it("refuses once the session has started or is no longer booked", () => {
    assert.equal(cancellationOutcome({ startsAt: at("2026-11-01T11:00:00Z"), status: "scheduled", now }).allowed, false);
    assert.equal(cancellationOutcome({ startsAt: at("2026-11-05T11:00:00Z"), status: "completed", now }).allowed, false);
  });

  it("allows rescheduling only with the full notice period", () => {
    assert.equal(canReschedule({ startsAt: at("2026-11-02T12:00:00Z"), status: "scheduled", now }), true);
    assert.equal(canReschedule({ startsAt: at("2026-11-02T11:00:00Z"), status: "scheduled", now }), false);
    assert.equal(canReschedule({ startsAt: at("2026-11-09T11:00:00Z"), status: "cancelled_by_client", now }), false);
  });
});

describe("isOverlapViolation", () => {
  it("recognises the exclusion-constraint error, wrapped or not", () => {
    assert.equal(isOverlapViolation({ code: "23P01" }), true);
    assert.equal(isOverlapViolation({ cause: { code: "23P01" } }), true);
    assert.equal(isOverlapViolation({ code: "23505" }), false);
    assert.equal(isOverlapViolation(new Error("network")), false);
  });
});
