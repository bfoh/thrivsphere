import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summariseRisk } from "./risk-summary";

/**
 * Regression tests for the client-list risk summary.
 *
 * A previous implementation used a correlated SQL subquery that never matched,
 * so every client appeared to have no risk flags and no open concerns. Nothing
 * errored — the screen simply lied. These assertions exist so that cannot
 * happen again unnoticed.
 */
describe("summariseRisk", () => {
  it("takes the highest active level, not the most recent", () => {
    const out = summariseRisk(
      ["a"],
      [
        { clientId: "a", level: "medium" },
        { clientId: "a", level: "high" },
        { clientId: "a", level: "low" },
      ],
      []
    );
    assert.equal(out.get("a")!.highestRisk, "high");
  });

  it("ranks immediate above high", () => {
    const out = summariseRisk(
      ["a"],
      [
        { clientId: "a", level: "high" },
        { clientId: "a", level: "immediate" },
      ],
      []
    );
    assert.equal(out.get("a")!.highestRisk, "immediate");
  });

  it("reports null when a client has no active flags", () => {
    const out = summariseRisk(["a", "b"], [{ clientId: "a", level: "high" }], []);
    assert.equal(out.get("b")!.highestRisk, null);
  });

  it("counts only concerns that are not closed", () => {
    const out = summariseRisk(
      ["a"],
      [],
      [
        { clientId: "a", status: "open" },
        { clientId: "a", status: "escalated" },
        { clientId: "a", status: "closed" },
      ]
    );
    assert.equal(out.get("a")!.openConcerns, 2);
  });

  it("does not leak one client's risk onto another", () => {
    const out = summariseRisk(
      ["a", "b"],
      [{ clientId: "a", level: "immediate" }],
      [{ clientId: "a", status: "open" }]
    );
    assert.equal(out.get("b")!.highestRisk, null);
    assert.equal(out.get("b")!.openConcerns, 0);
  });

  it("returns an entry for every client asked about", () => {
    const out = summariseRisk(["a", "b", "c"], [], []);
    assert.deepEqual([...out.keys()], ["a", "b", "c"]);
  });

  it("ignores an unknown level rather than ranking it highest", () => {
    const out = summariseRisk(
      ["a"],
      [
        { clientId: "a", level: "medium" },
        { clientId: "a", level: "not-a-level" },
      ],
      []
    );
    assert.equal(out.get("a")!.highestRisk, "medium");
  });
});
