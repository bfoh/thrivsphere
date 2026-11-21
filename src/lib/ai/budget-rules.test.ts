import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { monthlyBudgetUsd, usd } from "./budget-rules";

describe("AI monthly limit", () => {
  it("defaults to $50 and ignores nonsense", () => {
    assert.equal(monthlyBudgetUsd(undefined), 50);
    assert.equal(monthlyBudgetUsd("abc"), 50);
    assert.equal(monthlyBudgetUsd("-5"), 50);
    assert.equal(monthlyBudgetUsd("100000"), 50);
    assert.equal(monthlyBudgetUsd("25"), 25);
  });

  it("shows dollars plainly", () => {
    assert.equal(usd(0.0234), "$0.02");
    assert.equal(usd(42.4), "$42");
  });
});
