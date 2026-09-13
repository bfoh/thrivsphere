import test from "node:test";
import assert from "node:assert/strict";
import { sign, verifySvixSignature } from "./svix-signature";

const SECRET = "whsec_" + Buffer.from("a-test-signing-secret-value").toString("base64");
const ID = "msg_2abc";
const NOW = 1_760_000_000_000; // ms
const TS = Math.floor(NOW / 1000);
const BODY = JSON.stringify({ type: "session.created", data: { user_id: "user_1" } });

function headersFor(payload = BODY, id = ID, ts = TS, secret = SECRET) {
  return { id, timestamp: String(ts), signature: `v1,${sign(payload, secret, id, ts)}` };
}

test("accepts a correctly signed payload", () => {
  const result = verifySvixSignature({
    payload: BODY,
    headers: headersFor(),
    secret: SECRET,
    now: NOW,
  });
  assert.deepEqual(result, { ok: true });
});

test("rejects a tampered payload", () => {
  const headers = headersFor();
  const tampered = JSON.stringify({ type: "session.created", data: { user_id: "user_999" } });
  const result = verifySvixSignature({ payload: tampered, headers, secret: SECRET, now: NOW });
  assert.equal(result.ok, false);
});

test("rejects a signature made with a different secret", () => {
  const other = "whsec_" + Buffer.from("someone-elses-secret").toString("base64");
  const headers = headersFor(BODY, ID, TS, other);
  const result = verifySvixSignature({ payload: BODY, headers, secret: SECRET, now: NOW });
  assert.equal(result.ok, false);
});

test("rejects a replay outside the tolerance window", () => {
  const headers = headersFor();
  const result = verifySvixSignature({
    payload: BODY,
    headers,
    secret: SECRET,
    now: NOW + 10 * 60 * 1000,
  });
  assert.deepEqual(result, { ok: false, reason: "timestamp outside tolerance" });
});

test("accepts a request within the tolerance window", () => {
  const headers = headersFor();
  const result = verifySvixSignature({
    payload: BODY,
    headers,
    secret: SECRET,
    now: NOW + 120 * 1000,
  });
  assert.deepEqual(result, { ok: true });
});

test("rejects a signature bound to a different message id", () => {
  const headers = headersFor(BODY, "msg_other");
  headers.id = ID; // valid signature, but claiming to be a different message
  const result = verifySvixSignature({ payload: BODY, headers, secret: SECRET, now: NOW });
  assert.equal(result.ok, false);
});

test("fails closed when the secret is not configured", () => {
  const result = verifySvixSignature({
    payload: BODY,
    headers: headersFor(),
    secret: undefined,
    now: NOW,
  });
  assert.deepEqual(result, { ok: false, reason: "missing webhook secret" });
});

test("fails closed when headers are missing", () => {
  for (const missing of ["id", "timestamp", "signature"] as const) {
    const headers = { ...headersFor(), [missing]: null };
    const result = verifySvixSignature({ payload: BODY, headers, secret: SECRET, now: NOW });
    assert.deepEqual(result, { ok: false, reason: "missing signature headers" });
  }
});

test("ignores signature versions it does not understand", () => {
  const headers = headersFor();
  headers.signature = `v0,${sign(BODY, SECRET, ID, TS)}`;
  const result = verifySvixSignature({ payload: BODY, headers, secret: SECRET, now: NOW });
  assert.deepEqual(result, { ok: false, reason: "no v1 signature" });
});

test("accepts when one of several rotated signatures matches", () => {
  const headers = headersFor();
  headers.signature = `v1,bm90LXRoZS1yaWdodC1vbmU= ${headers.signature}`;
  const result = verifySvixSignature({ payload: BODY, headers, secret: SECRET, now: NOW });
  assert.deepEqual(result, { ok: true });
});

test("rejects a non-numeric timestamp", () => {
  const headers = { ...headersFor(), timestamp: "yesterday" };
  const result = verifySvixSignature({ payload: BODY, headers, secret: SECRET, now: NOW });
  assert.deepEqual(result, { ok: false, reason: "malformed timestamp" });
});
