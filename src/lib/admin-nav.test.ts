import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_NAV, NAV_GROUPS, activeNavHref, navFor, navGroupsFor } from "./admin-nav";
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
    assert.deepEqual(l, ["Dashboard", "Appointments", "Availability", "Enquiries", "Clients", "Safeguarding", "Resources", "Library", "Blog", "Marketing"]);
    for (const forbidden of ["Staff", "Activity", "Services & prices", "Discounts", "Revenue", "HR", "Accounting", "Reports"]) {
      assert.ok(!l.includes(forbidden), `practitioner must not see ${forbidden}`);
    }
  });

  it("adds Reports for a supervisor but no organisation pages", () => {
    const l = labels("supervisor");
    assert.ok(l.includes("Reports"));
    assert.equal(l.filter((x) => ["Staff", "Revenue", "HR", "Accounting"].includes(x)).length, 0);
  });

  it("gives an admin the activity log, catalogue and staff list but not the money pages", () => {
    const l = labels("admin");
    assert.ok(l.includes("Activity"), "admin should see the audit log");
    assert.ok(l.includes("Services & prices"), "admin should be able to update services and prices");
    assert.ok(l.includes("Staff"), "admin should be able to remove a colleague who has left");
    assert.ok(l.includes("Enquiries"), "admin should work the enquiry and callback queue");
    assert.ok(l.includes("Discounts"), "admin should give concessions, codes and free sessions");
    for (const forbidden of ["Revenue", "HR", "Accounting"]) {
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
    const org = ADMIN_NAV.filter((i) => i.group === "business" || i.group === "team").map((i) => i.label);
    assert.deepEqual(org, ["Services & prices", "Discounts", "Revenue", "Accounting", "Reports", "Staff", "HR", "Activity"]);
  });

  it("keeps each section's entries together, in the order the sections are shown", () => {
    // The sidebar renders section by section; an entry out of place would
    // silently move in the menu.
    const order = NAV_GROUPS.map((g) => g.key);
    const seen = ADMIN_NAV.map((i) => order.indexOf(i.group));
    assert.ok(seen.every((n) => n >= 0), "every entry belongs to a known section");
    assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
  });

  it("gives every entry an icon", () => {
    for (const item of ADMIN_NAV) assert.ok(item.icon, `${item.label} has no icon`);
  });

  it("every destination is a page that exists", () => {
    // Staff, Activity, Revenue, HR and Accounting were menu entries before
    // they were pages. A link to a 404 is worse than no link: it reads as the
    // service being broken rather than the feature not being there yet.
    for (const item of ADMIN_NAV) {
      const route = item.href === "/admin" ? "" : item.href.replace("/admin/", "");
      const file = join(process.cwd(), "src/app/admin/(dashboard)", route, "page.tsx");
      assert.ok(existsSync(file), `no page for ${item.href} (looked for ${file})`);
    }
  });
});

describe("navGroupsFor", () => {
  it("leaves out sections the person has nothing in", () => {
    const g = navGroupsFor(actor("practitioner")).map((x) => x.label);
    assert.deepEqual(g, ["Today", "Client care", "Content"]);
  });

  it("shows a founder every section", () => {
    assert.deepEqual(navGroupsFor(actor("founder")).map((x) => x.label), NAV_GROUPS.map((x) => x.label));
  });

  it("gives a client no sections", () => {
    assert.deepEqual(navGroupsFor(actor("client")), []);
  });
});

describe("activeNavHref", () => {
  const hrefs = ADMIN_NAV.map((i) => i.href);

  it("lights up the dashboard only on the dashboard", () => {
    assert.equal(activeNavHref("/admin", hrefs), "/admin");
    assert.equal(activeNavHref("/admin/unknown", hrefs), null);
  });

  it("lights up the section a record page sits under", () => {
    assert.equal(activeNavHref("/admin/clients/8a1b/supervision/new", hrefs), "/admin/clients");
    assert.equal(activeNavHref("/admin/blog/81fc/preview", hrefs), "/admin/blog");
  });

  it("does not confuse a page with another that shares its first letters", () => {
    assert.equal(activeNavHref("/admin/staffing", ["/admin/staff"]), null);
  });
});
