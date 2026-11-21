import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TASKS, isTaskKey, parseTaskInput, taskPrompt, textOf, tidyOutput } from "./tasks";
import { can } from "../authz";

const body = "Breathing slowly can help you feel steadier when things feel busy. ".repeat(3);

describe("AI tasks", () => {
  it("are open only to people who write", () => {
    for (const t of Object.values(TASKS)) {
      assert.equal(can({ userId: "u", role: "client", status: "active" }, t.capability), false);
      assert.equal(can({ userId: "u", role: "practitioner", status: "active" }, t.capability), true);
    }
    assert.equal(isTaskKey("blog-titles"), true);
    assert.equal(isTaskKey("delete-everything"), false);
  });

  it("check what is sent", () => {
    assert.equal(parseTaskInput("blog-titles", { title: "x", body: "too short" }).ok, false);
    assert.equal(parseTaskInput("blog-titles", { title: "x", body }).ok, true);
    assert.equal(parseTaskInput("blog-rewrite", { passage: body, style: "louder" }).ok, false);
    assert.equal(parseTaskInput("image-alt", { assetId: "../x" }).ok, false);
    assert.equal(parseTaskInput("blog-titles", { title: "x", body: "y".repeat(60_001) }).ok, false);
  });

  it("wrap the writer's text so it isn't taken as instructions", () => {
    const r = parseTaskInput("blog-review", { title: "Calm", body });
    assert.ok(r.ok);
    const p = taskPrompt("blog-review", r.input);
    assert.match(p, /<post>\n/);
    assert.match(p, /must_fix/);
  });

  it("send ids nowhere near the personal-details check, and tidy replies", () => {
    assert.equal(textOf({ postId: "0000", body: "hello" }), "hello");
    const t = tidyOutput("blog-summary", { summary: "  A short summary.  ", searchDescription: "x".repeat(300) });
    assert.equal(t.summary, "A short summary.");
    assert.equal(t.searchDescription.length, 155);
  });
});
