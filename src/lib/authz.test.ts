import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { can, canAccessClient, isStaff, type Actor } from "./authz";

/**
 * Tests for the authorisation policy.
 *
 * These are the rules that decide who can open a confidential record, so they
 * are worth asserting rather than assuming. The negative cases matter more
 * than the positive ones: it is easy to write a policy that lets the right
 * people in and quietly lets the wrong people in too.
 *
 * Run with: npm test
 */

const clientA: Actor = { userId: "u1", role: "client", status: "active", clientId: "c-A" };
const clientB: Actor = { userId: "u2", role: "client", status: "active", clientId: "c-B" };
const practitioner: Actor = { userId: "u3", role: "practitioner", status: "active" };
const supervisor: Actor = { userId: "u4", role: "supervisor", status: "active" };
const admin: Actor = { userId: "u5", role: "admin", status: "active" };
const suspendedAdmin: Actor = { userId: "u6", role: "admin", status: "suspended" };

describe("canAccessClient", () => {
  it("lets a client reach their own record", () => {
    assert.equal(canAccessClient(clientA, "c-A"), true);
  });

  it("refuses a client reaching another client's record", () => {
    assert.equal(canAccessClient(clientA, "c-B"), false);
    assert.equal(canAccessClient(clientB, "c-A"), false);
  });

  it("refuses a client with no linked record", () => {
    const orphan: Actor = { userId: "u7", role: "client", status: "active", clientId: null };
    assert.equal(canAccessClient(orphan, "c-A"), false);
  });

  it("lets staff reach any client record", () => {
    assert.equal(canAccessClient(practitioner, "c-A"), true);
    assert.equal(canAccessClient(admin, "c-B"), true);
  });

  it("refuses an unauthenticated caller", () => {
    assert.equal(canAccessClient(null, "c-A"), false);
  });

  it("refuses a suspended account regardless of role", () => {
    assert.equal(canAccessClient(suspendedAdmin, "c-A"), false);
  });
});

describe("can", () => {
  it("keeps clients away from staff capabilities", () => {
    for (const cap of ["notes:read", "notes:write", "audit:read", "catalogue:manage"] as const) {
      assert.equal(can(clientA, cap), false, `client should not hold ${cap}`);
    }
  });

  it("gives clients only their own-scope capabilities", () => {
    assert.equal(can(clientA, "client:read:own"), true);
    assert.equal(can(clientA, "appointment:book:own"), true);
    assert.equal(can(clientA, "client:read:any"), false);
  });

  it("lets practitioners do record work but not administration", () => {
    assert.equal(can(practitioner, "notes:write"), true);
    assert.equal(can(practitioner, "safeguarding:escalate"), true);
    // Amending someone else's note, editing prices and reading the access log
    // are deliberately above a practitioner.
    assert.equal(can(practitioner, "notes:amend"), false);
    assert.equal(can(practitioner, "catalogue:manage"), false);
    assert.equal(can(practitioner, "audit:read"), false);
  });

  it("lets supervisors amend notes and read reports", () => {
    assert.equal(can(supervisor, "notes:amend"), true);
    assert.equal(can(supervisor, "report:read"), true);
    assert.equal(can(supervisor, "audit:read"), false);
  });

  it("gives admins the administrative capabilities", () => {
    assert.equal(can(admin, "audit:read"), true);
    assert.equal(can(admin, "catalogue:manage"), true);
    assert.equal(can(admin, "payment:read:any"), true);
  });

  it("strips every capability from a suspended account", () => {
    assert.equal(can(suspendedAdmin, "audit:read"), false);
    assert.equal(can(suspendedAdmin, "client:read:any"), false);
  });

  it("refuses an unauthenticated caller", () => {
    assert.equal(can(null, "client:read:own"), false);
  });
});

describe("isStaff", () => {
  it("is false for clients and true for staff roles", () => {
    assert.equal(isStaff(clientA), false);
    assert.equal(isStaff(practitioner), true);
    assert.equal(isStaff(supervisor), true);
    assert.equal(isStaff(admin), true);
  });

  it("is false for a suspended staff account", () => {
    assert.equal(isStaff(suspendedAdmin), false);
  });
});
