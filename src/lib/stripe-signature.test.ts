import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signPayload, verifyStripeSignature } from "./stripe-signature";

/**
 * The fulfilment webhook grants paid sessions. If this function is wrong,
 * anyone who finds the URL can give themselves free appointments — so the
 * negative cases are the ones that matter.
 */
const SECRET = "whsec_test_secret";
const PAYLOAD = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const NOW = 1_760_000_000_000; // fixed clock
const TS = Math.floor(NOW / 1000);

const verify = (over: Partial<Parameters<typeof verifyStripeSignature>[0]> = {}) =>
  verifyStripeSignature({
    payload: PAYLOAD,
    header: signPayload(PAYLOAD, SECRET, TS),
    secret: SECRET,
    now: NOW,
    ...over,
  });

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed payload", () => {
    assert.deepEqual(verify(), { ok: true });
  });

  it("rejects a payload signed with a different secret", () => {
    assert.equal(verify({ header: signPayload(PAYLOAD, "whsec_wrong", TS) }).ok, false);
  });

  it("rejects a tampered payload", () => {
    // The signature is valid, but for different content.
    const tampered = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", extra: 1 });
    assert.equal(verify({ payload: tampered }).ok, false);
  });

  it("rejects a missing or malformed header", () => {
    assert.equal(verify({ header: null }).ok, false);
    assert.equal(verify({ header: "" }).ok, false);
    assert.equal(verify({ header: "garbage" }).ok, false);
    assert.equal(verify({ header: `t=${TS}` }).ok, false);
    assert.equal(verify({ header: "v1=abc" }).ok, false);
    assert.equal(verify({ header: `t=notanumber,v1=abc` }).ok, false);
  });

  it("rejects a replayed request from outside the tolerance window", () => {
    const old = TS - 3600;
    const r = verify({ header: signPayload(PAYLOAD, SECRET, old) });
    assert.equal(r.ok, false);
    assert.match((r as { reason: string }).reason, /tolerance/);
  });

  it("rejects a timestamp from the future beyond tolerance", () => {
    assert.equal(verify({ header: signPayload(PAYLOAD, SECRET, TS + 3600) }).ok, false);
  });

  it("accepts a signature just inside the tolerance window", () => {
    assert.equal(verify({ header: signPayload(PAYLOAD, SECRET, TS - 299) }).ok, true);
  });

  it("accepts when any one of several v1 signatures matches, as during rotation", () => {
    const valid = signPayload(PAYLOAD, SECRET, TS).split(",")[1];
    assert.equal(verify({ header: `t=${TS},v1=deadbeef,${valid}` }).ok, true);
  });

  it("refuses to verify when no secret is configured", () => {
    // Must fail closed: an unset secret cannot mean "allow everything".
    assert.equal(verify({ secret: "" }).ok, false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    assert.equal(verify({ header: `t=${TS},v1=abc` }).ok, false);
  });
});
