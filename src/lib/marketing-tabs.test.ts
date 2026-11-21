import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MARKETING_TABS, activeTab, tabsFor } from "./marketing-tabs";

describe("marketing tabs", () => {
  it("each lead to a page that exists", () => {
    for (const t of MARKETING_TABS) {
      const dir = join(process.cwd(), "src/app/admin/(dashboard)", t.href.replace(/^\/admin/, ""));
      assert.ok(existsSync(join(dir, "page.tsx")), `${t.label}: ${dir}/page.tsx`);
    }
  });

  it("show AI spending to the founder only", () => {
    const labels = (role: "practitioner" | "admin" | "founder") => tabsFor({ userId: "u", role, status: "active" }).map((t) => t.label);
    assert.ok(!labels("practitioner").includes("AI usage"));
    assert.ok(!labels("admin").includes("AI usage"));
    assert.ok(labels("founder").includes("AI usage"));
    assert.deepEqual(tabsFor(null), []);
  });

  it("highlight the right tab", () => {
    assert.equal(activeTab("/admin/marketing"), "/admin/marketing");
    assert.equal(activeTab("/admin/marketing/brand/edit"), "/admin/marketing/brand");
    assert.equal(activeTab("/admin/marketingx"), null);
  });
});
