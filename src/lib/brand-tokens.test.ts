import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_COLOURS, BRAND_GRADIENTS, CSS_VARIABLE, contrastRatio, readablePairs, textUse, type BrandColour } from "./brand-tokens";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));

describe("brand tokens", () => {
  it("match the website's CSS variables", () => {
    for (const [key, variable] of Object.entries(CSS_VARIABLE)) {
      const m = new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6});`).exec(root);
      assert.ok(m, `${variable} is defined in globals.css`);
      assert.equal(m[1].toLowerCase(), BRAND_COLOURS[key as BrandColour], variable);
    }
  });

  it("match the website's gradients", () => {
    for (const [name, [from, to]] of Object.entries(BRAND_GRADIENTS)) {
      assert.match(root, new RegExp(`--grad-${name}: linear-gradient\\(135deg, ${from} 0%, ${to} 100%\\)`), name);
    }
  });
});

describe("contrast", () => {
  it("works out WCAG ratios", () => {
    assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
    assert.equal(contrastRatio("#1f3a5f", "#1f3a5f"), 1);
  });

  it("keeps the brand's known pairs where they belong", () => {
    assert.equal(textUse(BRAND_COLOURS.navy, BRAND_COLOURS.warmWhite), "any");
    assert.equal(textUse(BRAND_COLOURS.navy, BRAND_COLOURS.sage), "any");
    assert.equal(textUse(BRAND_COLOURS.gold, BRAND_COLOURS.navy), "any");
    assert.equal(textUse(BRAND_COLOURS.white, BRAND_COLOURS.teal), "never");
    assert.equal(textUse(BRAND_COLOURS.gold, BRAND_COLOURS.warmWhite), "never");
  });

  it("lists only pairs that pass", () => {
    const pairs = readablePairs();
    assert.ok(pairs.length > 10);
    assert.ok(pairs.every((p) => p.ratio >= 3));
    assert.ok(!pairs.some((p) => p.text === "white" && p.background === "teal"));
  });
});
