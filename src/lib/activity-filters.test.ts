import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RANGE,
  MAX_PAGE,
  parseActivityFilters,
  withFilter,
  actionLabel,
} from "./activity-filters";

const NOW = new Date("2026-06-01T12:00:00Z");
const UUID_A = "3f1b0c2e-9d4a-4c11-a1b2-0e5f6a7b8c9d";

test("no parameters gives the default window and no narrowing", () => {
  const f = parseActivityFilters({}, NOW);
  assert.equal(f.action, null);
  assert.equal(f.actorId, null);
  assert.equal(f.clientId, null);
  assert.equal(f.days, DEFAULT_RANGE);
  assert.equal(f.page, 1);
  assert.equal(f.since.toISOString(), "2026-05-02T12:00:00.000Z");
});

test("recognised filters are kept", () => {
  const f = parseActivityFilters(
    { action: "permission_denied", actor: UUID_A, client: UUID_A, days: "7", page: "3" },
    NOW
  );
  assert.equal(f.action, "permission_denied");
  assert.equal(f.actorId, UUID_A);
  assert.equal(f.clientId, UUID_A);
  assert.equal(f.days, 7);
  assert.equal(f.page, 3);
});

test("an unrecognised action narrows nothing rather than reaching the query", () => {
  const f = parseActivityFilters({ action: "drop table" }, NOW);
  assert.equal(f.action, null);
});

test("an id that is not a uuid is discarded", () => {
  for (const bad of ["1 OR 1=1", "abc", "", "3f1b0c2e-9d4a-4c11-a1b2"]) {
    const f = parseActivityFilters({ actor: bad, client: bad }, NOW);
    assert.equal(f.actorId, null);
    assert.equal(f.clientId, null);
  }
});

test("an arbitrary range falls back to the default", () => {
  assert.equal(parseActivityFilters({ days: "9999" }, NOW).days, DEFAULT_RANGE);
  assert.equal(parseActivityFilters({ days: "-1" }, NOW).days, DEFAULT_RANGE);
  assert.equal(parseActivityFilters({ days: "abc" }, NOW).days, DEFAULT_RANGE);
});

test("page is bounded, so a hand-typed URL cannot ask for an unbounded offset", () => {
  assert.equal(parseActivityFilters({ page: "100000" }, NOW).page, MAX_PAGE);
  assert.equal(parseActivityFilters({ page: "0" }, NOW).page, 1);
  assert.equal(parseActivityFilters({ page: "-4" }, NOW).page, 1);
  assert.equal(parseActivityFilters({ page: "2.5" }, NOW).page, 1);
});

test("repeated parameters take the first value", () => {
  const f = parseActivityFilters({ action: ["view", "delete"] }, NOW);
  assert.equal(f.action, "view");
});

test("changing a filter keeps the others and returns to page one", () => {
  const f = parseActivityFilters({ action: "view", actor: UUID_A, days: "7", page: "4" }, NOW);
  const qs = withFilter(f, { action: "delete" });
  const params = new URLSearchParams(qs.slice(1));
  assert.equal(params.get("action"), "delete");
  assert.equal(params.get("actor"), UUID_A);
  assert.equal(params.get("days"), "7");
  assert.equal(params.get("page"), null);
});

test("paging keeps every filter", () => {
  const f = parseActivityFilters({ action: "view", days: "90" }, NOW);
  const params = new URLSearchParams(withFilter(f, { page: "2" }).slice(1));
  assert.equal(params.get("page"), "2");
  assert.equal(params.get("action"), "view");
  assert.equal(params.get("days"), "90");
});

test("clearing a filter removes it from the query string", () => {
  const f = parseActivityFilters({ action: "view", actor: UUID_A }, NOW);
  const params = new URLSearchParams(withFilter(f, { actor: null }).slice(1));
  assert.equal(params.get("actor"), null);
  assert.equal(params.get("action"), "view");
});

test("every action has a plain-English label", () => {
  assert.equal(actionLabel("permission_denied"), "Refused");
  assert.equal(actionLabel("login"), "Signed in");
  assert.equal(actionLabel("logout"), "Signed out");
});
