import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { policies } from "./policies";
import { brand } from "./site";

/**
 * The published policies must state the rules the site enforces and the
 * contact address the owner approved (IT handover, 15 November 2026).
 */

const text = (slug: string) => {
  const p = policies[slug];
  assert.ok(p, `no policy ${slug}`);
  return [p.intro, ...p.sections.flatMap((s) => [...(s.body ?? []), ...(s.bullets ?? [])])].join("\n");
};

describe("policies", () => {
  it("state the 72-hour notice wherever they mention notice", () => {
    for (const slug of ["payments", "terms"]) {
      assert.match(text(slug), /72 hours' notice/, slug);
    }
    for (const slug of Object.keys(policies)) {
      assert.doesNotMatch(text(slug), /24 hours/, slug);
    }
  });

  it("give the approved contact address, never the unused hello@ mailbox", () => {
    assert.equal(brand.email, "patbarning@yahoo.co.uk");
    for (const slug of Object.keys(policies)) {
      assert.doesNotMatch(text(slug), /hello@thrivsphere\.org/, slug);
    }
    assert.match(text("privacy"), new RegExp(brand.email.replace(/\./g, "\\.")));
  });
});
