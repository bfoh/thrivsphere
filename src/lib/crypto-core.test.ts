import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { encryptSecret, decryptSecret } from "./crypto-core";

/**
 * Joining links are stored encrypted because a session link identifies who is
 * receiving support and when. These assertions cover the properties that
 * matter: the plaintext must not survive in the stored value, tampering must
 * be detected, and failure must be quiet rather than explosive.
 */
before(() => {
  process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
});

const LINK = "https://zoom.us/j/123456789?pwd=secret";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a value", () => {
    assert.equal(decryptSecret(encryptSecret(LINK)), LINK);
  });

  it("does not leave the plaintext in the stored value", () => {
    assert.ok(!encryptSecret(LINK).includes("zoom.us"));
  });

  it("produces a different ciphertext each time", () => {
    assert.notEqual(encryptSecret(LINK), encryptSecret(LINK));
  });

  it("rejects a tampered ciphertext rather than returning garbage", () => {
    const enc = encryptSecret(LINK);
    assert.equal(decryptSecret(enc.slice(0, -4) + "AAAA"), null);
  });

  it("rejects a value encrypted under a different key", () => {
    const enc = encryptSecret(LINK);
    process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    assert.equal(decryptSecret(enc), null);
  });

  it("returns null for missing or malformed input", () => {
    assert.equal(decryptSecret(null), null);
    assert.equal(decryptSecret(undefined), null);
    assert.equal(decryptSecret(""), null);
    assert.equal(decryptSecret("not-a-ciphertext"), null);
    assert.equal(decryptSecret("v9.a.b.c"), null);
  });

  it("handles unicode", () => {
    process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    const v = "https://example.com/room?name=Zoë–Ω";
    assert.equal(decryptSecret(encryptSecret(v)), v);
  });

  it("refuses a key that is not 32 bytes", () => {
    process.env.APP_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    assert.throws(() => encryptSecret(LINK), /32 bytes/);
  });
});
