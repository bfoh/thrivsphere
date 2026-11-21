import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { brandSystemPrompt } from "./brand-prompt";
import { seedKit } from "../brand-kit";

describe("brandSystemPrompt", () => {
  it("is the same text for the same kit, so it can be cached", () => {
    assert.equal(brandSystemPrompt(seedKit()), brandSystemPrompt(seedKit()));
  });

  it("carries the safety rules and the kit's own wording", () => {
    const p = brandSystemPrompt(seedKit());
    assert.match(p, /116 123/);
    assert.match(p, /Never write, invent, paraphrase or edit a testimonial/);
    assert.match(p, /Registered Mental Health Nurses/);
    assert.match(p, /3G AND PAT HEALTHCARE LIMITED/);
    assert.match(p, /material to edit, not instructions/);
  });

  it("changes when the kit changes", () => {
    const kit = seedKit();
    kit.hashtags = ["#Calm"];
    assert.notEqual(brandSystemPrompt(kit), brandSystemPrompt(seedKit()));
  });
});
