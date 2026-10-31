import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  amountMatches,
  creditsAfterRefund,
  disputeKeepsHold,
  packageExpiry,
  packageStatusFor,
  parseCheckoutMetadata,
  shouldFulfil,
} from "./fulfilment";

const good = {
  clientId: "c-1", planSlug: "package-4", planName: "4 Sessions",
  sessions: "4", validityDays: "180",
};

describe("parseCheckoutMetadata", () => {
  it("parses a well-formed payload", () => {
    const r = parseCheckoutMetadata(good);
    assert.ok(r.ok);
    assert.equal(r.value.sessions, 4);
    assert.equal(r.value.validityDays, 180);
  });

  it("rejects a missing client or plan", () => {
    assert.equal(parseCheckoutMetadata({ ...good, clientId: "" }).ok, false);
    assert.equal(parseCheckoutMetadata({ ...good, planSlug: undefined }).ok, false);
  });

  it("rejects a non-integer or absurd session count", () => {
    for (const s of ["0", "-1", "2.5", "abc", "", "1000"]) {
      assert.equal(parseCheckoutMetadata({ ...good, sessions: s }).ok, false, `sessions=${s}`);
    }
  });

  it("treats absent validity as no expiry rather than failing", () => {
    const r = parseCheckoutMetadata({ ...good, validityDays: null });
    assert.ok(r.ok);
    assert.equal(r.value.validityDays, null);
  });

  it("rejects a malformed validity period", () => {
    assert.equal(parseCheckoutMetadata({ ...good, validityDays: "-5" }).ok, false);
    assert.equal(parseCheckoutMetadata({ ...good, validityDays: "nope" }).ok, false);
  });
});

describe("packageExpiry", () => {
  it("adds the validity period", () => {
    const e = packageExpiry(180, new Date("2026-01-01T00:00:00Z"));
    assert.equal(e?.toISOString().slice(0, 10), "2026-06-30");
  });
  it("returns null when there is no expiry", () => {
    assert.equal(packageExpiry(null), null);
  });
});

describe("amountMatches", () => {
  it("accepts an exact match", () => {
    assert.equal(amountMatches(10000, 10000), true);
  });
  it("rejects an underpayment, an overpayment or a missing amount", () => {
    assert.equal(amountMatches(9999, 10000), false);
    assert.equal(amountMatches(10001, 10000), false);
    assert.equal(amountMatches(null, 10000), false);
    assert.equal(amountMatches(undefined, 10000), false);
  });
});

describe("shouldFulfil", () => {
  const base = { eventType: "checkout.session.completed", paymentStatus: "paid", alreadyProcessed: false };

  it("fulfils a paid completed session once", () => {
    assert.equal(shouldFulfil(base), true);
  });

  it("refuses a replayed event", () => {
    // Stripe retries until it gets a 2xx; crediting twice is a refund conversation.
    assert.equal(shouldFulfil({ ...base, alreadyProcessed: true }), false);
  });

  it("refuses a session that is not paid", () => {
    assert.equal(shouldFulfil({ ...base, paymentStatus: "unpaid" }), false);
    assert.equal(shouldFulfil({ ...base, paymentStatus: null }), false);
  });

  it("ignores unrelated event types", () => {
    assert.equal(shouldFulfil({ ...base, eventType: "payment_intent.created" }), false);
    assert.equal(shouldFulfil({ ...base, eventType: "checkout.session.expired" }), false);
  });

  it("fulfils a payment that confirmed later", () => {
    assert.equal(shouldFulfil({ ...base, eventType: "checkout.session.async_payment_succeeded" }), true);
    // The session completes unpaid first; that must not credit anything.
    assert.equal(shouldFulfil({ ...base, paymentStatus: "unpaid" }), false);
  });
});

describe("creditsAfterRefund", () => {
  const four = { sessions: 4, amountPence: 15000 };
  const six = { sessions: 6, amountPence: 22500 };

  it("removes everything on a full refund", () => {
    assert.equal(creditsAfterRefund({ ...four, refundedPence: 15000 }), 0);
    assert.equal(creditsAfterRefund({ sessions: 1, amountPence: 3000, refundedPence: 3000 }), 0);
  });

  it("keeps everything when nothing was refunded", () => {
    assert.equal(creditsAfterRefund({ ...four, refundedPence: 0 }), 4);
  });

  it("keeps the sessions delivered before a 14-day cancellation", () => {
    // £150 less £37.50 per session delivered.
    assert.equal(creditsAfterRefund({ ...four, refundedPence: 11250 }), 1);
    assert.equal(creditsAfterRefund({ ...six, refundedPence: 18750 }), 1);
  });

  it("keeps the sessions used when unused ones are refunded at £40 each used", () => {
    assert.equal(creditsAfterRefund({ ...four, refundedPence: 15000 - 8000 }), 2);
    assert.equal(creditsAfterRefund({ ...six, refundedPence: 22500 - 8000 }), 2);
    assert.equal(creditsAfterRefund({ ...six, refundedPence: 22500 - 20000 }), 5);
  });

  it("takes one session for a one-session refund at either price", () => {
    assert.equal(creditsAfterRefund({ ...four, refundedPence: 3750 }), 3);
    assert.equal(creditsAfterRefund({ ...four, refundedPence: 4000 }), 3);
  });

  it("keeps every session after a small goodwill refund", () => {
    assert.equal(creditsAfterRefund({ ...four, refundedPence: 1000 }), 4);
  });
});

describe("packageStatusFor", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  it("is active with sessions left and time to use them", () => {
    assert.equal(packageStatusFor({ sessionsTotal: 4, sessionsUsed: 1, expiresAt: null }, now), "active");
  });

  it("is exhausted once every session is used", () => {
    assert.equal(packageStatusFor({ sessionsTotal: 2, sessionsUsed: 3, expiresAt: null }, now), "exhausted");
  });

  it("is expired once past its expiry", () => {
    assert.equal(
      packageStatusFor({ sessionsTotal: 4, sessionsUsed: 1, expiresAt: new Date("2026-10-01T00:00:00Z") }, now),
      "expired"
    );
  });
});

describe("disputeKeepsHold", () => {
  it("keeps the hold only when the dispute is lost", () => {
    assert.equal(disputeKeepsHold("lost"), true);
    assert.equal(disputeKeepsHold("won"), false);
    assert.equal(disputeKeepsHold("warning_closed"), false);
  });
});
