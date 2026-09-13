import test from "node:test";
import assert from "node:assert/strict";
import { interpretClerkEvent } from "./clerk-events";

test("session.created is a login", () => {
  const action = interpretClerkEvent({
    type: "session.created",
    data: { id: "sess_1", user_id: "user_1" },
  });
  assert.deepEqual(action, { kind: "login", authId: "user_1", sessionId: "sess_1" });
});

test("all three session endings are a logout", () => {
  for (const type of ["session.ended", "session.removed", "session.revoked"]) {
    const action = interpretClerkEvent({ type, data: { id: "sess_1", user_id: "user_1" } });
    assert.deepEqual(action, { kind: "logout", authId: "user_1", sessionId: "sess_1" });
  }
});

test("user.created carries the invited role", () => {
  const action = interpretClerkEvent({
    type: "user.created",
    data: {
      id: "user_2",
      first_name: "Sam",
      last_name: "Okafor",
      primary_email_address_id: "idn_2",
      email_addresses: [
        { id: "idn_1", email_address: "old@example.com" },
        { id: "idn_2", email_address: "Sam@ThrivSphere.org" },
      ],
      public_metadata: { thrivsphereRole: "supervisor" },
    },
  });
  assert.deepEqual(action, {
    kind: "user_created",
    authId: "user_2",
    email: "sam@thrivsphere.org",
    displayName: "Sam Okafor",
    role: "supervisor",
  });
});

test("an unrecognised role becomes client, never staff", () => {
  for (const claimed of ["superuser", "FOUNDER", "", 7, null]) {
    const action = interpretClerkEvent({
      type: "user.created",
      data: { id: "user_3", public_metadata: { thrivsphereRole: claimed } },
    });
    assert.equal(action.kind, "user_created");
    if (action.kind === "user_created") assert.equal(action.role, "client");
  }
});

test("a sign-up with no metadata is a client", () => {
  const action = interpretClerkEvent({ type: "user.created", data: { id: "user_4" } });
  assert.equal(action.kind === "user_created" && action.role, "client");
});

test("user.deleted names the account", () => {
  const action = interpretClerkEvent({ type: "user.deleted", data: { id: "user_5", deleted: true } });
  assert.deepEqual(action, { kind: "user_deleted", authId: "user_5" });
});

test("unsubscribed event types are ignored rather than failing", () => {
  const action = interpretClerkEvent({ type: "organization.created", data: { id: "org_1" } });
  assert.deepEqual(action, { kind: "ignored", reason: "organization.created" });
});

test("malformed payloads are ignored", () => {
  assert.equal(interpretClerkEvent(null).kind, "ignored");
  assert.equal(interpretClerkEvent({}).kind, "ignored");
  assert.equal(interpretClerkEvent({ type: "session.created", data: {} }).kind, "ignored");
  assert.equal(interpretClerkEvent({ type: "user.created", data: {} }).kind, "ignored");
});

test("falls back to the first address when no primary is marked", () => {
  const action = interpretClerkEvent({
    type: "user.created",
    data: { id: "user_6", email_addresses: [{ id: "idn_1", email_address: "only@example.com" }] },
  });
  assert.equal(action.kind === "user_created" && action.email, "only@example.com");
});
