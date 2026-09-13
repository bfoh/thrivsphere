import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_NAV, navFor } from "./admin-nav";
import { can, type Actor, type Role } from "./authz";

const actor = (role: Role): Actor => ({ userId: "u", role, status: "active" });
const labels = (role: Role) => navFor(actor(role)).map((i) => i.label);

describe("navFor", () => {
  it("never offers a link the guard would refuse", () => {
    // The property that matters: menu and access rules cannot disagree.
    for (const role of ["practitioner", "supervisor", "admin", "founder"] as Role[]) {
      for (const item of navFor(actor(role))) {
        assert.ok(
          can(actor(role), item.capability),
          `${role} was offered ${item.label} without ${item.capability}`
        );
      }
    }
  });

  it("gives a practitioner service pages only", () => {
    const l = labels("practitioner");
    assert.deepEqual(l, ["Dashboard", "Clients", "Appointments", "Availability", "Safeguarding"]);
    for (const forbidden of ["Staff", "Activity", "Revenue", "HR", "Accounting", "Reports"]) {
      assert.ok(!l.includes(forbidden), `practitioner must not see ${forbidden}`);
    }
  });

  it("adds Reports for a supervisor but no organisation pages", () => {
    const l = labels("supervisor");
    assert.ok(l.includes("Reports"));
    assert.equal(l.filter((x) => ["Staff", "Revenue", "HR", "Accounting"].includes(x)).length, 0);
  });

  it("gives an admin the activity log but not staff management or the money pages", () => {
    const l = labels("admin");
    assert.ok(l.includes("Activity"), "admin should see the audit log");
    for (const forbidden of ["Staff", "Revenue", "HR", "Accounting"]) {
      assert.ok(!l.includes(forbidden), `admin must not see ${forbidden}`);
    }
  });

  it("gives a founder everything", () => {
    assert.deepEqual(labels("founder"), ADMIN_NAV.map((i) => i.label));
  });

  it("gives a client nothing at all", () => {
    assert.deepEqual(labels("client"), []);
  });

  it("gives a suspended founder nothing, whatever their role says", () => {
    assert.deepEqual(navFor({ userId: "u", role: "founder", status: "suspended" }), []);
  });

  it("gives an unauthenticated caller nothing", () => {
    assert.deepEqual(navFor(null), []);
  });
});

describe("ADMIN_NAV", () => {
  it("has no duplicate destinations", () => {
    const hrefs = ADMIN_NAV.map((i) => i.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("separates running the organisation from delivering the service", () => {
    const org = ADMIN_NAV.filter((i) => i.group === "organisation").map((i) => i.label);
    assert.deepEqual(org, ["Staff", "Activity", "Revenue", "HR", "Accounting"]);
  });
});
