import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amountMatches, packageExpiry, parseCheckoutMetadata, shouldFulfil } from "./fulfilment";

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
});
