import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignableRoles, canCancelInvitation, canManageStaff, type ActingUser, type TargetUser } from "./staff-rules";

/**
 * These rules decide who can reach every client record in the service, and
 * whether the organisation can be locked out of its own system. The refusals
 * matter far more than the permissions.
 */
const founder: ActingUser = { userId: "f1", role: "founder" };
const admin: ActingUser = { userId: "a1", role: "admin" };
const practitioner: ActingUser = { userId: "p1", role: "practitioner" };

const target = (over: Partial<TargetUser> = {}): TargetUser => ({
  userId: "t1",
  role: "practitioner",
  status: "active",
  ...over,
});

const can = (o: Parameters<typeof canManageStaff>[0]) => canManageStaff(o).allowed;

describe("who may manage staff at all", () => {
  it("allows a founder", () => {
    assert.equal(can({ actor: founder, target: target(), action: "block", foundersRemaining: 2 }), true);
  });

  it("refuses an admin", () => {
    // Admins run the service. They do not decide who else gets into it.
    assert.equal(can({ actor: admin, target: target(), action: "block", foundersRemaining: 2 }), false);
  });

  it("refuses a practitioner", () => {
    assert.equal(can({ actor: practitioner, target: target(), action: "block", foundersRemaining: 2 }), false);
  });
});

describe("nobody edits their own access", () => {
  it("refuses self role change", () => {
    const r = canManageStaff({
      actor: founder,
      target: target({ userId: "f1", role: "founder" }),
      action: "change_role",
      newRole: "admin",
      foundersRemaining: 2,
    });
    assert.equal(r.allowed, false);
    assert.match((r as { reason: string }).reason, /your own/i);
  });

  it("refuses self block", () => {
    // The likelier accident than self-elevation: locking yourself out.
    assert.equal(
      can({ actor: founder, target: target({ userId: "f1", role: "founder" }), action: "block", foundersRemaining: 2 }),
      false
    );
  });
});

describe("the last founder is protected", () => {
  it("refuses demoting the only founder", () => {
    const r = canManageStaff({
      actor: { userId: "f2", role: "founder" },
      target: target({ userId: "f1", role: "founder" }),
      action: "change_role",
      newRole: "admin",
      foundersRemaining: 1,
    });
    assert.equal(r.allowed, false);
    assert.match((r as { reason: string }).reason, /only founder/i);
  });

  it("refuses blocking the only founder", () => {
    assert.equal(
      can({
        actor: { userId: "f2", role: "founder" },
        target: target({ userId: "f1", role: "founder" }),
        action: "block",
        foundersRemaining: 1,
      }),
      false
    );
  });

  it("allows demoting a founder when another remains", () => {
    assert.equal(
      can({
        actor: { userId: "f2", role: "founder" },
        target: target({ userId: "f1", role: "founder" }),
        action: "change_role",
        newRole: "admin",
        foundersRemaining: 2,
      }),
      true
    );
  });

  it("allows promoting someone to founder regardless of count", () => {
    assert.equal(
      can({ actor: founder, target: target(), action: "change_role", newRole: "founder", foundersRemaining: 1 }),
      true
    );
  });
});

describe("change_role validation", () => {
  it("refuses a no-op", () => {
    assert.equal(
      can({ actor: founder, target: target({ role: "admin" }), action: "change_role", newRole: "admin", foundersRemaining: 2 }),
      false
    );
  });

  it("refuses a missing role", () => {
    assert.equal(can({ actor: founder, target: target(), action: "change_role", foundersRemaining: 2 }), false);
  });

  it("allows an ordinary promotion", () => {
    assert.equal(
      can({ actor: founder, target: target({ role: "practitioner" }), action: "change_role", newRole: "supervisor", foundersRemaining: 2 }),
      true
    );
  });
});

describe("block and unblock", () => {
  it("refuses blocking someone already blocked", () => {
    assert.equal(can({ actor: founder, target: target({ status: "suspended" }), action: "block", foundersRemaining: 2 }), false);
  });

  it("refuses unblocking someone who is not blocked", () => {
    assert.equal(can({ actor: founder, target: target({ status: "active" }), action: "unblock", foundersRemaining: 2 }), false);
  });

  it("allows unblocking a suspended account", () => {
    assert.equal(can({ actor: founder, target: target({ status: "suspended" }), action: "unblock", foundersRemaining: 2 }), true);
  });

  it("refuses blocking a client through the staff screen", () => {
    assert.equal(can({ actor: founder, target: target({ role: "client" }), action: "block", foundersRemaining: 2 }), false);
  });
});

describe("assignableRoles", () => {
  it("gives a founder the full set, never client", () => {
    const roles = assignableRoles(founder);
    assert.deepEqual(roles, ["practitioner", "supervisor", "admin", "founder"]);
    assert.ok(!roles.includes("client" as never), "client is not a staff role");
  });

  it("gives everyone else nothing, so the picker cannot offer what the rules refuse", () => {
    assert.deepEqual(assignableRoles(admin), []);
    assert.deepEqual(assignableRoles(practitioner), []);
  });
});

describe("removing a colleague who has left", () => {
  const remove = (actor: ActingUser, over: Partial<TargetUser> = {}, foundersRemaining = 2) =>
    canManageStaff({ actor, target: target(over), action: "remove", foundersRemaining });

  it("lets a founder or an admin remove a practitioner or supervisor", () => {
    for (const actor of [founder, admin]) {
      assert.equal(remove(actor).allowed, true);
      assert.equal(remove(actor, { role: "supervisor" }).allowed, true);
    }
  });

  it("refuses a practitioner", () => {
    assert.equal(remove(practitioner).allowed, false);
  });

  it("lets only a founder remove an admin or founder", () => {
    assert.equal(remove(admin, { role: "admin" }).allowed, false);
    assert.equal(remove(admin, { role: "founder" }).allowed, false);
    assert.equal(remove(founder, { role: "admin" }).allowed, true);
    assert.equal(remove(founder, { role: "founder" }).allowed, true);
  });

  it("refuses removing the only founder", () => {
    assert.equal(remove(founder, { role: "founder" }, 1).allowed, false);
  });

  it("refuses removing yourself, a client, or someone already removed", () => {
    assert.equal(remove(admin, { userId: admin.userId, role: "admin" }).allowed, false);
    assert.equal(remove(admin, { userId: "a2", role: "practitioner", status: "active" }).allowed, true);
    assert.equal(remove(founder, { role: "client" }).allowed, false);
    assert.equal(remove(founder, { status: "deleted" }).allowed, false);
  });

  it("still keeps admins away from every other staff action", () => {
    for (const action of ["block", "unblock", "change_role", "invite"] as const) {
      assert.equal(can({ actor: admin, target: target(), action, newRole: "supervisor", foundersRemaining: 2 }), false);
    }
  });
});

describe("canCancelInvitation", () => {
  it("follows the removal rules", () => {
    assert.equal(canCancelInvitation(founder, "admin"), true);
    assert.equal(canCancelInvitation(admin, "practitioner"), true);
    assert.equal(canCancelInvitation(admin, "admin"), false);
    assert.equal(canCancelInvitation(practitioner, "practitioner"), false);
  });
});
