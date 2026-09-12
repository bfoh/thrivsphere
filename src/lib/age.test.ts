import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAdult } from "./age";

/**
 * Tests for the 18+ gate.
 *
 * ThrivSphere is an adults-only service, so the boundary cases are the point:
 * the day before an eighteenth birthday must be refused, and the birthday
 * itself must be allowed. An off-by-one here admits a child.
 */
const on = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("isAdult", () => {
  it("allows someone on their eighteenth birthday", () => {
    assert.equal(isAdult(on("2008-06-15"), on("2026-06-15")), true);
  });

  it("refuses the day before their eighteenth birthday", () => {
    assert.equal(isAdult(on("2008-06-15"), on("2026-06-14")), false);
  });

  it("allows the day after", () => {
    assert.equal(isAdult(on("2008-06-15"), on("2026-06-16")), true);
  });

  it("refuses a clear child", () => {
    assert.equal(isAdult(on("2015-01-01"), on("2026-09-12")), false);
  });

  it("refuses someone who turns 18 later this year", () => {
    assert.equal(isAdult(on("2008-12-31"), on("2026-09-12")), false);
  });

  it("allows a comfortable adult", () => {
    assert.equal(isAdult(on("1980-03-02"), on("2026-09-12")), true);
  });

  it("refuses a date of birth in the future", () => {
    assert.equal(isAdult(on("2030-01-01"), on("2026-09-12")), false);
  });

  it("refuses an invalid date rather than defaulting to allow", () => {
    assert.equal(isAdult(new Date("not-a-date"), on("2026-09-12")), false);
  });

  it("handles a 29 February birthday without admitting them early", () => {
    // 2008-02-29 + 18 years. 2026 is not a leap year, so the anniversary
    // rolls to 1 March — they must still be refused on 28 February.
    assert.equal(isAdult(on("2008-02-29"), on("2026-02-28")), false);
    assert.equal(isAdult(on("2008-02-29"), on("2026-03-01")), true);
  });

  it("is not fooled by a birthday early in the year", () => {
    assert.equal(isAdult(on("2009-01-01"), on("2026-12-31")), false);
    assert.equal(isAdult(on("2008-01-01"), on("2026-01-01")), true);
  });
});
