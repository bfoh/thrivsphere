import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toService } from "./service-content";
import { services } from "@/data/site";

describe("toService", () => {
  it("round-trips every seeded service exactly", () => {
    // The migration writes these rows from src/data/site.ts; reading them back
    // must give the pages what they showed before the move to the database.
    for (const s of services) {
      const row = { slug: s.slug, name: s.title, summary: s.summary, description: s.desc, points: s.points, note: s.note ?? null };
      assert.deepEqual(toService(row), s);
    }
  });

  it("gives a new service a neutral icon and copes with empty fields", () => {
    const s = toService({ slug: "new-service", name: "New", summary: null, description: "D", points: null, note: null });
    assert.equal(s.icon, "heart");
    assert.equal(s.summary, "");
    assert.deepEqual(s.points, []);
    assert.equal("note" in s, false);
  });
});
