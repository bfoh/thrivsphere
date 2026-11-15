import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalise, prepareIndex, queryTokens, search, snippet, type CollectionLookup } from "./search";
import type { SearchEntry } from "./types";

/** A made-up index: two worksheets and an ACT resource, with a guide each. */
const ENTRIES: SearchEntry[] = [
  { c: "ws-5", m: null, at: null, label: null, text: "Worksheet 5 Understanding the intensity of my emotions" },
  { c: "ws-5", m: "guide", at: null, label: "Practitioner guide", text: "Practitioner guide" },
  { c: "ws-5", m: "guide", at: "s2", label: "Using the scale", text: "Rate the feeling from 0 to 10. Notice breathing and body signals early." },
  { c: "ws-5", m: "deck", at: "slide-3", label: "Slide 3", text: "Early warning signs in the body" },
  { c: "ws-12", m: null, at: null, label: null, text: "Worksheet 12 Maintaining my emotional wellbeing" },
  { c: "ws-12", m: "guide", at: "s1", label: "Aims", text: "Plan 50 minutes for the session and review progress." },
  { c: "ws-12", m: "guide", at: "s2", label: "Noticing", text: "Notice unhelpful thoughts as they arrive." },
  { c: "act-2", m: null, at: null, label: null, text: "ACT resource 2 Unhooking from unhelpful thoughts acceptance and commitment therapy" },
  { c: "act-2", m: "sheet", at: "page-2", label: "Page 2", text: "Write the thought down: “I’m not good enough.” Then notice it as a thought." },
];

const LOOKUP: CollectionLookup = new Map([
  ["ws-5", { series: "worksheets", materials: [{ id: "guide", kind: "practitioner-guide" }, { id: "deck", kind: "presentation" }] }],
  ["ws-12", { series: "worksheets", materials: [{ id: "guide", kind: "practitioner-guide" }] }],
  ["act-2", { series: "act", materials: [{ id: "sheet", kind: "activity-worksheet" }] }],
]);

const INDEX = prepareIndex(ENTRIES);
const slugs = (q: string, filters = {}) => search(INDEX, q, LOOKUP, filters).map((r) => r.slug);

describe("query words", () => {
  it("ignores case, accents, punctuation and apostrophes", () => {
    assert.equal(normalise("  Café — DON’T  stop & go!"), "cafe dont stop and go");
  });

  it("reads resource shorthand as the resource name", () => {
    assert.deepEqual(queryTokens("ws5"), ["worksheet", "5"]);
    assert.deepEqual(queryTokens("ACT2"), ["act", "2"]);
    assert.deepEqual(queryTokens("ws 12"), ["worksheet", "12"]);
  });

  it("drops filler words unless that is all there is", () => {
    assert.deepEqual(queryTokens("the intensity of my emotions"), ["intensity", "emotions"]);
    assert.deepEqual(queryTokens("the"), ["the"]);
  });
});

describe("search", () => {
  it("finds a resource by its number without matching other numbers", () => {
    assert.deepEqual(slugs("worksheet 5"), ["ws-5"]);
    assert.deepEqual(slugs("ws5"), ["ws-5"]);
    assert.deepEqual(slugs("ws12"), ["ws-12"]);
    // "50 minutes" must not answer a search for Worksheet 5.
    assert.ok(!slugs("5").includes("ws-12"));
  });

  it("matches the start of a word, so a stem finds its forms", () => {
    assert.deepEqual(slugs("breath"), ["ws-5"]);
    assert.deepEqual(slugs("unhook"), ["act-2"]);
  });

  it("needs every word typed", () => {
    assert.deepEqual(slugs("breathing thought"), []);
  });

  it("puts a title match above a match in a guide", () => {
    assert.deepEqual(slugs("unhelpful thoughts"), ["act-2", "ws-12"]);
    assert.equal(search(INDEX, "unhelpful thoughts", LOOKUP)[0].hits[0].materialId, null);
  });

  it("finds words written with curly apostrophes", () => {
    assert.deepEqual(slugs("im not good enough"), ["act-2"]);
  });

  it("filters by series and by kind of material", () => {
    assert.deepEqual(slugs("unhooking", { series: "worksheets" }), []);
    assert.deepEqual(slugs("thoughts", { series: "act" }), ["act-2"]);
    assert.deepEqual(slugs("body", { kind: "presentation" }), ["ws-5"]);
    const [r] = search(INDEX, "body", LOOKUP, { kind: "presentation" });
    assert.deepEqual(r.hits.map((h) => h.at), ["slide-3"]);
  });

  it("keeps one hit per material, best first", () => {
    const [r] = search(INDEX, "early", LOOKUP);
    assert.deepEqual(r.hits.map((h) => h.materialId).sort(), ["deck", "guide"]);
  });

  it("returns nothing for an empty query", () => {
    assert.deepEqual(search(INDEX, "   ", LOOKUP), []);
  });
});

describe("snippet", () => {
  it("marks the words matched", () => {
    const parts = snippet("Notice breathing and body signals early.", ["breath", "body"]);
    assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["breathing", "body"]);
    assert.equal(parts.map((p) => p.text).join(""), "Notice breathing and body signals early.");
  });

  it("shows a window around the first match in long text", () => {
    const text = `${"lorem ".repeat(60)}the scale goes here ${"ipsum ".repeat(60)}`;
    const parts = snippet(text, ["scale"], 30);
    assert.equal(parts[0].text, "…");
    assert.equal(parts.at(-1)?.text, "…");
    assert.ok(parts.some((p) => p.hit && p.text === "scale"));
    assert.ok(parts.map((p) => p.text).join("").length < 120);
  });

  it("does not mark a number inside a longer one", () => {
    const parts = snippet("Allow 50 minutes, then try worksheet 5.", ["5"]);
    assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["5"]);
  });
});
