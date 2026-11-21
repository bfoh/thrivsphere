import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { costMicroUsd } from "./cost";

describe("costMicroUsd", () => {
  it("prices Opus 5.5 per published rates", () => {
    // 10,000 in at $4/M = 40,000µ; 2,000 out at $20/M = 40,000µ; 5,000 cache reads at $0.20/M = 1,000µ.
    assert.equal(costMicroUsd("claude-opus-5-5", { input: 10_000, output: 2_000, cacheRead: 5_000, cacheWrite: 0 }), 81_000);
  });

  it("never treats an unknown model as free", () => {
    assert.ok(costMicroUsd("some-new-model", { input: 1000, output: 1000, cacheRead: 0, cacheWrite: 0 }) >= 24_000);
  });
});
