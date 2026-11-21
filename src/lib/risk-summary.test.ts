import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summariseRisk } from "./risk-summary";

/**
 * Regression tests for the client-list safeguarding summary.
 *
 * A previous implementation used a correlated SQL subquery that never matched,
 * so every client appeared to have no flags and no open concerns. Nothing
 * errored — the screen simply lied. These assertions exist so that cannot
 * happen again unnoticed.
 */
describe("summariseRisk", () => {
  it("marks a client with any active flag", () => {
    const out = summariseRisk(["a"], [{ clientId: "a" }, { clientId: "a" }], []);
    assert.equal(out.get("a")!.flagged, true);
  });

  it("does not mark a client with no active flags", () => {
    const out = summariseRisk(["a", "b"], [{ clientId: "a" }], []);
    assert.equal(out.get("b")!.flagged, false);
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

  it("does not leak one client's flag onto another", () => {
    const out = summariseRisk(["a", "b"], [{ clientId: "a" }], [{ clientId: "a", status: "open" }]);
    assert.equal(out.get("b")!.flagged, false);
    assert.equal(out.get("b")!.openConcerns, 0);
  });

  it("returns an entry for every client asked about", () => {
    const out = summariseRisk(["a", "b", "c"], [], []);
    assert.deepEqual([...out.keys()], ["a", "b", "c"]);
  });
});
