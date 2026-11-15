import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { contentsOf, materialHref, slideFromParam, summaryLine, summaryParts } from "./view";

describe("materialHref", () => {
  it("links a material inside its resource", () => {
    assert.equal(materialHref("worksheet-5", "practitioner-guide"), "/admin/library/worksheet-5/practitioner-guide");
  });

  it("opens a deck at a slide", () => {
    assert.equal(materialHref("worksheet-5", "presentation", "slide-7"), "/admin/library/worksheet-5/presentation?slide=7");
  });

  it("jumps to a page of a PDF", () => {
    assert.equal(materialHref("initial-review", "practitioner-guide", "page-2"), "/admin/library/initial-review/practitioner-guide#page-2");
  });

  it("jumps to a section and carries the search so it can be highlighted", () => {
    assert.equal(materialHref("act-2", "learning-guide", "s4", "  hooked & stuck "), "/admin/library/act-2/learning-guide?q=hooked%20%26%20stuck#s4");
    assert.equal(materialHref("act-2", "learning-guide", "s4"), "/admin/library/act-2/learning-guide#s4");
  });

  it("ignores a place it does not recognise", () => {
    assert.equal(materialHref("act-2", "learning-guide", "javascript:alert(1)"), "/admin/library/act-2/learning-guide");
  });

  it("escapes the path segments", () => {
    assert.equal(materialHref("a/b", "c?d"), "/admin/library/a%2Fb/c%3Fd");
  });
});

describe("contentsOf", () => {
  it("drops the title and starts the contents at level 1", () => {
    const out = contentsOf([
      { id: "s0", title: "Worksheet 5", level: 0 },
      { id: "s1", title: "Aims", level: 2 },
      { id: "s2", title: "Timings", level: 3 },
      { id: "s3", title: "  ", level: 2 },
      { id: "s4", title: "Close", level: 2 },
    ]);
    assert.deepEqual(out.map((s) => [s.id, s.level]), [["s1", 1], ["s2", 2], ["s4", 1]]);
  });

  it("caps the depth at three levels", () => {
    const out = contentsOf([
      { id: "a", title: "A", level: 1 },
      { id: "b", title: "B", level: 5 },
    ]);
    assert.deepEqual(out.map((s) => s.level), [1, 3]);
  });

  it("is empty for a document without headings", () => {
    assert.deepEqual(contentsOf([{ id: "s0", title: "Title", level: 0 }]), []);
  });
});

describe("slideFromParam", () => {
  it("keeps the slide within the deck", () => {
    assert.equal(slideFromParam("4", 12), 4);
    assert.equal(slideFromParam("40", 12), 12);
    assert.equal(slideFromParam("0", 12), 1);
    assert.equal(slideFromParam("-3", 12), 1);
  });

  it("starts at the first slide for anything else", () => {
    assert.equal(slideFromParam(undefined, 12), 1);
    assert.equal(slideFromParam("next", 12), 1);
    assert.equal(slideFromParam(["3", "9"], 12), 3);
    assert.equal(slideFromParam("3", 0), 1);
  });
});

describe("summaries", () => {
  it("reads a list of aims as bullets", () => {
    assert.deepEqual(summaryParts("• Notice the signs\n• Pause\n• Choose a response"), { bullets: ["Notice the signs", "Pause", "Choose a response"] });
  });

  it("reads anything else as text", () => {
    assert.deepEqual(summaryParts("Help clients notice change.\nKeep it practical."), { text: "Help clients notice change. Keep it practical." });
    assert.deepEqual(summaryParts("• One aim only"), { text: "• One aim only" });
  });

  it("has nothing to show for an empty summary", () => {
    assert.equal(summaryParts(null), null);
    assert.equal(summaryParts("  \n "), null);
    assert.equal(summaryLine(null), null);
  });

  it("runs bullets together for a card", () => {
    assert.equal(summaryLine("• Notice\n• Pause"), "Notice · Pause");
  });
});
