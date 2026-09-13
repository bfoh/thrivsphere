import test from "node:test";
import assert from "node:assert/strict";
import { poundsToPence } from "./money";

test("whole pounds and pence", () => {
  assert.equal(poundsToPence("20"), 2000);
  assert.equal(poundsToPence("24.99"), 2499);
  assert.equal(poundsToPence("0.05"), 5);
  assert.equal(poundsToPence("0"), 0);
});

test("a single decimal place means tens of pence, not pence", () => {
  assert.equal(poundsToPence("12.3"), 1230);
});

test("the classic floating-point case is exact", () => {
  assert.equal(poundsToPence("12.34"), 1234);
  assert.equal(poundsToPence("1.10"), 110);
  assert.equal(poundsToPence("0.29"), 29);
});

test("currency symbols, commas and spaces are tolerated", () => {
  assert.equal(poundsToPence("£1,234.56"), 123456);
  assert.equal(poundsToPence(" 45.00 "), 4500);
});

test("negatives are kept, for a refund or a correction", () => {
  assert.equal(poundsToPence("-12.50"), -1250);
});

test("anything it cannot read exactly is refused rather than guessed", () => {
  for (const bad of ["", "twenty", "1.234", "1.2.3", "£", "--5", "1e3", "NaN", "5%"]) {
    assert.equal(poundsToPence(bad), null, `should refuse: ${bad}`);
  }
});
