import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COLLECTIONS, IGNORED_FILES, MATERIAL_KINDS, SERIES, collectionLabel, materialTitle } from "./catalogue";

/**
 * The catalogue decides how the owner's files are grouped. Slugs and
 * material ids become URLs that staff bookmark, so they must be unique and
 * URL-safe; every file must be used once.
 */

const URL_SAFE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("library catalogue", () => {
  it("gives every resource a unique, URL-safe slug in a known series", () => {
    const slugs = COLLECTIONS.map((c) => c.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    const series = new Set(SERIES.map((s) => s.key));
    for (const c of COLLECTIONS) {
      assert.match(c.slug, URL_SAFE, c.slug);
      assert.ok(series.has(c.series), `${c.slug}: unknown series ${c.series}`);
      assert.ok(c.title.trim(), `${c.slug}: no title`);
    }
  });

  it("numbers resources in a numbered series once each", () => {
    for (const s of SERIES) {
      const numbers = COLLECTIONS.filter((c) => c.series === s.key).map((c) => c.number);
      if (s.unit) {
        assert.ok(numbers.every((n) => typeof n === "number" && n > 0), `${s.key}: a resource has no number`);
        assert.equal(new Set(numbers).size, numbers.length, `${s.key}: a number is used twice`);
      } else {
        assert.ok(numbers.every((n) => n === null), `${s.key}: an unnumbered series has a number`);
      }
    }
  });

  it("covers worksheets 1 to 12", () => {
    const numbers = COLLECTIONS.filter((c) => c.series === "worksheets").map((c) => c.number);
    assert.deepEqual(numbers, Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it("gives every material a unique id and a known kind", () => {
    const kinds = new Set(MATERIAL_KINDS.map((k) => k.kind));
    for (const c of COLLECTIONS) {
      assert.ok(c.materials.length > 0, `${c.slug}: no materials`);
      const ids = c.materials.map((m) => m.id);
      assert.equal(new Set(ids).size, ids.length, `${c.slug}: duplicate material id`);
      for (const m of c.materials) {
        assert.match(m.id, URL_SAFE, `${c.slug}/${m.id}`);
        assert.ok(kinds.has(m.kind), `${c.slug}/${m.id}: unknown kind`);
      }
    }
  });

  it("uses each file once, and never one it ignores", () => {
    const files = COLLECTIONS.flatMap((c) => c.materials.map((m) => m.file));
    assert.equal(new Set(files).size, files.length);
    for (const f of files) {
      assert.match(f, /\.(docx|pptx|pdf)$/, f);
      assert.ok(!(f in IGNORED_FILES), `${f} is both used and ignored`);
    }
  });

  it("names two materials of the same kind apart", () => {
    for (const c of COLLECTIONS) {
      const titles = c.materials.map(materialTitle);
      assert.equal(new Set(titles).size, titles.length, `${c.slug}: two materials share a title`);
    }
  });

  it("labels numbered resources with their unit", () => {
    assert.equal(collectionLabel({ series: "worksheets", number: 5 }), "Worksheet 5");
    assert.equal(collectionLabel({ series: "act", number: 2 }), "ACT resource 2");
    assert.equal(collectionLabel({ series: "getting-started", number: null }), null);
  });
});
