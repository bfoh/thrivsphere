import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SIZES, TEMPLATES, fitFontSize, parseGraphicInput, scaleFor, themesReadable } from "./spec";

const form = (f: Record<string, string>) => (n: string) => f[n] ?? "";

describe("graphics spec", () => {
  it("uses only readable colour pairs", () => {
    assert.equal(themesReadable(), true);
  });

  it("offers only known sizes, and scales sensibly", () => {
    for (const t of TEMPLATES) for (const s of t.sizes) assert.ok(SIZES[s], `${t.key}: ${s}`);
    assert.equal(scaleFor("square"), 1);
    assert.ok(scaleFor("linkedin") < 1 && scaleFor("linkedin") > 0.8);
  });

  it("checks what the form sent", () => {
    assert.deepEqual(parseGraphicInput(form({ template: "tip", size: "square", theme: "sage", headline: "  Breathe out slowly  ", body: "" })), {
      ok: true,
      input: { template: "tip", size: "square", theme: "sage", values: { headline: "Breathe out slowly" } },
    });
    assert.equal(parseGraphicInput(form({ template: "tip", size: "square" })).ok, false);
    assert.equal(parseGraphicInput(form({ template: "slide", size: "story", number: "1", total: "3", headline: "x" })).ok, false);
    assert.equal(parseGraphicInput(form({ template: "nope", size: "square" })).ok, false);
    const photo = parseGraphicInput(form({ template: "photo", size: "square", photo: "../../etc/passwd", caption: "x" }));
    assert.equal(photo.ok, false);
  });

  it("cuts text to each field's limit", () => {
    const r = parseGraphicInput(form({ template: "tip", size: "square", headline: "x".repeat(500) }));
    assert.ok(r.ok && r.input.values.headline.length === 110);
  });
});

describe("fitFontSize", () => {
  it("shrinks longer text, within limits", () => {
    const box = { width: 900, height: 400, max: 96, min: 40 };
    const short = fitFontSize("Breathe out slowly", box);
    const long = fitFontSize("When everything feels urgent, choose one small thing you can do in the next ten minutes and do only that", box);
    assert.equal(short, 96);
    assert.ok(long < short && long >= 40);
    assert.equal(fitFontSize("x ".repeat(2000), box), 40);
  });
});
