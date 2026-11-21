import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_MINUTES,
  INITIAL_REVIEW,
  NOTICE_HOURS,
  NOTICE_PERIOD,
  SUPPORT_SESSION,
  kindFor,
  kindLabel,
  nextKindFrom,
  bookingRoute,
  canReschedule,
  cancellationOutcome,
  holdTimes,
  isOverlapViolation,
  noticeDeadline,
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

describe("appointment kinds (handover §13.1)", () => {
  it("names each kind as the client sees it", () => {
    assert.equal(kindLabel("initial"), INITIAL_REVIEW);
    assert.equal(kindLabel("session"), SUPPORT_SESSION);
  });

  it("books the review as the initial consultation and everything after as a session", () => {
    assert.equal(kindFor("review"), "initial");
    assert.equal(kindFor("session"), "session");
  });

  it("starts with the review", () => {
    assert.equal(nextKindFrom([]), "review");
  });

  it("moves on to sessions once the review is booked or done", () => {
    assert.equal(nextKindFrom([{ kind: "initial", status: "scheduled" }]), "session");
    assert.equal(nextKindFrom([{ kind: "initial", status: "completed" }]), "session");
  });

  it("leaves the review to book when it was cancelled, missed or is still being paid for", () => {
    for (const status of ["cancelled_by_client", "cancelled_by_service", "no_show", "pending_payment"]) {
      assert.equal(nextKindFrom([{ kind: "initial", status }]), "review", status);
    }
  });

  it("does not count a session as the review", () => {
    assert.equal(nextKindFrom([{ kind: "session", status: "completed" }]), "review");
  });
});

describe("paying while booking (handover §19 Route A)", () => {
  it("sends the initial consultation to Stripe unless credit already pays for it", () => {
    assert.equal(bookingRoute("review", 0), "checkout");
    assert.equal(bookingRoute("review", 1), "credit");
    assert.equal(bookingRoute("session", 0), "credit");
  });

  it("keeps the checkout open for Stripe's 30-minute minimum, and the time a little longer", () => {
    const now = at("2026-11-21T10:00:00Z");
    const { checkoutExpiresAt, holdExpiresAt } = holdTimes(now);
    assert.ok(checkoutExpiresAt.getTime() - now.getTime() >= 30 * 60_000);
    assert.equal(CHECKOUT_MINUTES, 31);
    assert.ok(holdExpiresAt > checkoutExpiresAt, "a late payment must still find its time");
  });
});

describe("cancellationOutcome", () => {
  const now = at("2026-11-01T12:00:00Z");

  it("asks for the 72 hours' notice the owner confirmed", () => {
    assert.equal(NOTICE_HOURS, 72);
    assert.equal(NOTICE_PERIOD, "72 hours");
  });

  it("returns the session with 72 hours' notice or more", () => {
    assert.deepEqual(cancellationOutcome({ startsAt: at("2026-11-04T12:00:00Z"), status: "scheduled", now }), {
      allowed: true,
      late: false,
      returnsSession: true,
    });
  });

  it("counts the session as used with less notice", () => {
    assert.deepEqual(cancellationOutcome({ startsAt: at("2026-11-04T11:59:00Z"), status: "scheduled", now }), {
      allowed: true,
      late: true,
      returnsSession: false,
    });
    // A day's notice was enough under the old 24-hour rule; it no longer is.
    const dayAhead = cancellationOutcome({ startsAt: at("2026-11-02T12:00:00Z"), status: "scheduled", now });
    assert.ok(dayAhead.allowed && dayAhead.late);
  });

  it("names the last moment to cancel or move free of charge", () => {
    assert.equal(noticeDeadline(at("2026-11-04T12:00:00Z")).toISOString(), "2026-11-01T12:00:00.000Z");
  });

  it("refuses once the session has started or is no longer booked", () => {
    assert.equal(cancellationOutcome({ startsAt: at("2026-11-01T11:00:00Z"), status: "scheduled", now }).allowed, false);
    assert.equal(cancellationOutcome({ startsAt: at("2026-11-05T11:00:00Z"), status: "completed", now }).allowed, false);
  });

  it("allows rescheduling only with the full notice period", () => {
    assert.equal(canReschedule({ startsAt: at("2026-11-04T12:00:00Z"), status: "scheduled", now }), true);
    assert.equal(canReschedule({ startsAt: at("2026-11-04T11:00:00Z"), status: "scheduled", now }), false);
    assert.equal(canReschedule({ startsAt: at("2026-11-02T12:00:00Z"), status: "scheduled", now }), false);
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
