import test from "node:test";
import assert from "node:assert/strict";
import { toPricingCard } from "./pricing";
import { plans } from "../data/site";

const row = {
  slug: "package-4",
  name: "Four-session package",
  blurb: "Four 50-minute sessions, paid together.",
  amountPence: 15000,
  sessions: 4,
  featured: false,
};

test("the price always comes from the database row", () => {
  const copy = plans.find((p) => p.slug === "package-4");
  const card = toPricingCard({ ...row, amountPence: 16000, name: "Renamed" }, copy);
  assert.equal(card.amountPence, 16000);
  assert.equal(card.name, "Renamed");
  assert.equal(card.cta, copy?.cta);
});

test("a plan with no site copy still gets a usable card", () => {
  const card = toPricingCard({ ...row, slug: "package-8", sessions: 8, blurb: null }, undefined);
  assert.equal(card.unit, "8 × 50-minute sessions");
  assert.equal(card.cta, "Buy sessions");
  assert.deepEqual(card.features, []);
});

test("the launch copy matches the checklist prices", () => {
  const bySlug = Object.fromEntries(plans.map((p) => [p.slug, p.amountPence]));
  assert.deepEqual(bySlug, {
    "initial-consultation": 3000,
    "individual-session": 4000,
    "package-4": 15000,
    "package-6": 22500,
  });
});
