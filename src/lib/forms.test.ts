import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { answersToRaw, conditionHolds, formDataToRaw, parseAnswers, REQUIRED_MESSAGE, type RawInput } from "./forms/answers";
import { getTemplate, latestTemplate, supervisionTemplate, TEMPLATES, worksheetLibrary, worksheetTemplate } from "./forms/registry";
import { SUPERVISION_KEY, WORKSHEET_5_KEY, WORKSHEET_LIBRARY } from "./forms/library";
import { isInputField } from "./forms/types";
import { initialsOf, nextWorksheetStatus, sheetNeedsFollowUp, shortRef } from "./resources-rules";

/**
 * The form engine decides what reaches a client's record from a submitted
 * form, so the cases worth asserting are the refusals: keys that are not
 * questions, answers that are not options, and a sheet finalised with its
 * safety section blank.
 */

const sheet = supervisionTemplate();
const worksheet = worksheetTemplate(WORKSHEET_5_KEY)!;
const STAFF = "6f1c2d3e-0000-4000-8000-000000000001";
const OTHER = "6f1c2d3e-0000-4000-8000-000000000002";
const staffIds = new Set([STAFF]);

const raw = (o: Record<string, string | string[]>): RawInput =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v : [v]]));

/** The minimum a sheet needs to be finalised. */
const complete = { mainIssue: "Sleep and routine", safety: "none", keyDecision: "Introduce Worksheet 5" };

describe("parseAnswers", () => {
  it("keeps only the template's questions", () => {
    const r = parseAnswers(sheet, raw({ mainIssue: "Routine", isAdmin: "true", "tasks.9.description": "x" }), {
      strict: false,
    });
    assert.deepEqual(Object.keys(r.answers), ["mainIssue"]);
  });

  it("trims text and normalises line endings", () => {
    const r = parseAnswers(sheet, raw({ mainIssue: "  line one\r\nline two  " }), { strict: false });
    assert.equal(r.answers.mainIssue, "line one\nline two");
  });

  it("refuses text over the field's limit rather than cutting it off", () => {
    const r = parseAnswers(sheet, raw({ present: "x".repeat(201) }), { strict: false });
    assert.match(r.errors.present, /under 200/);
    assert.equal(r.answers.present, undefined);
  });

  it("drops a blank answer instead of storing an empty string", () => {
    const r = parseAnswers(sheet, raw({ mainIssue: "   " }), { strict: false });
    assert.equal("mainIssue" in r.answers, false);
  });

  it("accepts ratings from 0 to 10 only", () => {
    assert.equal(parseAnswers(sheet, raw({ goalRating: "0" }), { strict: false }).answers.goalRating, 0);
    assert.equal(parseAnswers(sheet, raw({ goalRating: "10" }), { strict: false }).answers.goalRating, 10);
    for (const bad of ["11", "-1", "3.5", "five"]) {
      const r = parseAnswers(sheet, raw({ goalRating: bad }), { strict: false });
      assert.ok(r.errors.goalRating, `accepted ${bad}`);
    }
  });

  it("refuses a choice that is not one of the options", () => {
    const r = parseAnswers(sheet, raw({ goalChanged: "maybe" }), { strict: false });
    assert.ok(r.errors.goalChanged);
  });

  it("keeps ticked boxes in the form's order and ignores unknown ones", () => {
    const r = parseAnswers(sheet, raw({ safety: ["scope", "made-up", "risk"] }), { strict: false });
    assert.deepEqual(r.answers.safety, ["risk", "scope"]);
  });

  it("refuses 'No new concern' ticked alongside a concern", () => {
    const r = parseAnswers(sheet, raw({ safety: ["none", "risk"] }), { strict: false });
    assert.match(r.errors.safety, /can't be ticked together/);
  });

  it("accepts only colleagues from the list for a staff field", () => {
    const base = { ...complete, safety: "risk", safetyDetails: "Discuss with DSL", safetyBy: "2026-11-10" };
    assert.equal(parseAnswers(sheet, raw({ ...base, safetyOwner: STAFF }), { strict: true, staffIds }).errors.safetyOwner, undefined);
    assert.ok(parseAnswers(sheet, raw({ ...base, safetyOwner: OTHER }), { strict: true, staffIds }).errors.safetyOwner);
    assert.ok(parseAnswers(sheet, raw({ ...base, safetyOwner: "drop table" }), { strict: false }).errors.safetyOwner);
  });

  it("refuses an impossible date", () => {
    const r = parseAnswers(sheet, raw({ safety: "risk", safetyBy: "2026-02-30" }), { strict: false });
    assert.ok(r.errors.safetyBy);
  });

  it("requires nothing for a draft", () => {
    const r = parseAnswers(sheet, raw({}), { strict: false });
    assert.deepEqual(r.errors, {});
  });

  it("requires the main issue, the safety section and the plan to finalise", () => {
    const r = parseAnswers(sheet, raw({}), { strict: true });
    for (const id of ["mainIssue", "safety", "keyDecision"]) assert.equal(r.errors[id], REQUIRED_MESSAGE, id);
    assert.deepEqual(parseAnswers(sheet, raw(complete), { strict: true, staffIds }).errors, {});
  });

  it("requires details, an owner and a date once any concern is ticked", () => {
    const r = parseAnswers(sheet, raw({ ...complete, safety: "signposting" }), { strict: true, staffIds });
    for (const id of ["safetyDetails", "safetyOwner", "safetyBy"]) assert.equal(r.errors[id], REQUIRED_MESSAGE, id);
  });

  it("discards answers to questions that are hidden", () => {
    // Said yes, wrote the new goal, then changed the answer to no.
    const r = parseAnswers(sheet, raw({ goalChanged: "no", goalNow: "Find work" }), { strict: false });
    assert.equal(r.answers.goalNow, undefined);
    const owner = parseAnswers(sheet, raw({ safety: "none", safetyOwner: STAFF }), { strict: false });
    assert.equal(owner.answers.safetyOwner, undefined);
  });

  it("asks for the new goal only when the goal changed", () => {
    const yes = parseAnswers(sheet, raw({ ...complete, goalChanged: "yes" }), { strict: true });
    assert.equal(yes.errors.goalNow, REQUIRED_MESSAGE);
    const no = parseAnswers(sheet, raw({ ...complete, goalChanged: "no" }), { strict: true });
    assert.equal(no.errors.goalNow, undefined);
  });

  it("reads task rows, skipping blank ones", () => {
    const r = parseAnswers(
      sheet,
      raw({
        "tasks.0.description": "Print Worksheet 5",
        "tasks.0.assigneeId": STAFF,
        "tasks.0.dueBy": "2026-11-12",
        "tasks.1.description": "",
        "tasks.2.description": "Find a grounding script",
        "tasks.2.assigneeId": STAFF,
      }),
      { strict: false, staffIds }
    );
    assert.deepEqual(r.answers.tasks, [
      { description: "Print Worksheet 5", assigneeId: STAFF, dueBy: "2026-11-12" },
      { description: "Find a grounding script", assigneeId: STAFF, dueBy: null },
    ]);
  });

  it("needs a description and a person for each task when finalising", () => {
    const r = parseAnswers(sheet, raw({ ...complete, "tasks.0.assigneeId": STAFF, "tasks.1.description": "Call GP practice" }), {
      strict: true,
      staffIds,
    });
    assert.equal(r.errors["tasks.0.description"], "Describe the task.");
    assert.equal(r.errors["tasks.1.assigneeId"], "Who is responsible?");
  });

  it("reads repeated practice entries up to the limit", () => {
    const r = parseAnswers(
      worksheet,
      raw({
        "practice.0.situation": "Work meeting",
        "practice.0.before": "8",
        "practice.0.after": "5",
        "practice.2.emotion": "Anxious",
        "practice.3.emotion": "beyond the limit",
      }),
      { strict: false }
    );
    assert.deepEqual(r.answers.practice, [{ situation: "Work meeting", before: 8, after: 5 }, { emotion: "Anxious" }]);
  });

  it("lets a client skip any question but not send a blank worksheet", () => {
    assert.match(parseAnswers(worksheet, raw({}), { strict: true }).errors._form, /at least one/);
    assert.deepEqual(parseAnswers(worksheet, raw({ intensity: "6" }), { strict: true }).errors, {});
  });
});

describe("answersToRaw", () => {
  it("reopens a draft exactly as it was saved", () => {
    const input = raw({
      ...complete,
      safety: ["signposting", "scope"],
      safetyDetails: "Discuss GP letter",
      safetyOwner: STAFF,
      safetyBy: "2026-11-20",
      goalRating: "4",
      "tasks.0.description": "Print Worksheet 5",
      "tasks.0.assigneeId": STAFF,
    });
    const first = parseAnswers(sheet, input, { strict: false, staffIds });
    const again = parseAnswers(sheet, answersToRaw(sheet, first.answers), { strict: false, staffIds });
    assert.deepEqual(again.answers, first.answers);
  });

  it("round-trips repeated practice entries", () => {
    const first = parseAnswers(worksheet, raw({ "practice.0.before": "7", "practice.1.learned": "Breathing helped" }), {
      strict: false,
    });
    assert.deepEqual(parseAnswers(worksheet, answersToRaw(worksheet, first.answers), { strict: false }).answers, first.answers);
  });
});

describe("conditionHolds", () => {
  it("matches a single answer against a list as well as ticked boxes", () => {
    assert.equal(conditionHolds({ field: "a", includesAny: ["x"] }, { a: "x" }), true);
    assert.equal(conditionHolds({ field: "a", includesAny: ["x"] }, { a: ["y", "x"] }), true);
    assert.equal(conditionHolds({ field: "a", includesAny: ["x"] }, { a: "y" }), false);
    assert.equal(conditionHolds({ field: "a" }, {}), false);
  });
});

describe("formDataToRaw", () => {
  it("keeps repeated names and skips Next's own fields", () => {
    const fd = new FormData();
    fd.append("safety", "risk");
    fd.append("safety", "scope");
    fd.append("$ACTION_ID_abc", "");
    assert.deepEqual(formDataToRaw(fd), { safety: ["risk", "scope"] });
  });
});

describe("registry", () => {
  it("finds each template by key and version, and the latest by key", () => {
    assert.equal(getTemplate(SUPERVISION_KEY, 1)?.title, "Supervision & Next Session Planning Sheet");
    assert.equal(getTemplate(SUPERVISION_KEY, 99), null);
    assert.equal(latestTemplate("not-a-form"), null);
  });

  it("never registers the same key and version twice", () => {
    const ids = TEMPLATES.map((t) => `${t.key}@${t.version}`);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("lists every library worksheet as a client template", () => {
    assert.deepEqual(
      worksheetLibrary().map((w) => w.key),
      WORKSHEET_LIBRARY.map((w) => w.key)
    );
    assert.equal(worksheetTemplate(SUPERVISION_KEY), null, "staff sheet must not be assignable to a client");
  });

  it("gives every field a unique id within its template", () => {
    for (const t of TEMPLATES) {
      const ids = t.sections.flatMap((s) => s.items.map((i) => i.id));
      assert.equal(new Set(ids).size, ids.length, `${t.key} has a duplicate id`);
    }
  });

  it("points every condition at a field that exists", () => {
    for (const t of TEMPLATES) {
      const inputs = new Set(t.sections.flatMap((s) => s.items.filter(isInputField).map((f) => f.id)));
      for (const item of t.sections.flatMap((s) => s.items)) {
        for (const c of ["showWhen", "requiredWhen"] as const) {
          const cond = (item as { [k: string]: unknown })[c] as { field: string } | undefined;
          if (cond) assert.ok(inputs.has(cond.field), `${t.key}.${item.id}.${c} names ${cond.field}`);
        }
      }
    }
  });

  it("keeps the owner's closing reminder on Worksheet 5 word for word", () => {
    assert.equal(
      worksheet.closing,
      "Remember: The aim is not to eliminate emotions, but to recognise them and respond in ways that support your wellbeing."
    );
  });

  it("puts the current crisis routes in the Overwhelming row", () => {
    const table = worksheet.sections.flatMap((s) => s.items).find((i) => i.id === "responses");
    const text = JSON.stringify(table);
    for (const route of ["999", "111, option 2", "116 123", "SHOUT to 85258"]) assert.ok(text.includes(route), route);
  });
});

describe("nextWorksheetStatus", () => {
  it("lets the client save and send until it has been sent", () => {
    assert.equal(nextWorksheetStatus("assigned", "save", "client"), "in_progress");
    assert.equal(nextWorksheetStatus("in_progress", "submit", "client"), "submitted");
    assert.equal(nextWorksheetStatus("submitted", "save", "client"), null);
    assert.equal(nextWorksheetStatus("reviewed", "submit", "staff"), null);
  });

  it("leaves reviewing and withdrawing to staff", () => {
    assert.equal(nextWorksheetStatus("submitted", "review", "client"), null);
    assert.equal(nextWorksheetStatus("submitted", "review", "staff"), "reviewed");
    assert.equal(nextWorksheetStatus("in_progress", "withdraw", "client"), null);
    assert.equal(nextWorksheetStatus("assigned", "withdraw", "staff"), "withdrawn");
    assert.equal(nextWorksheetStatus("submitted", "withdraw", "staff"), null);
  });

  it("does nothing more with a withdrawn worksheet", () => {
    for (const intent of ["save", "submit", "review", "withdraw"] as const) {
      assert.equal(nextWorksheetStatus("withdrawn", intent, "staff"), null);
    }
  });
});

describe("sheetNeedsFollowUp", () => {
  it("is true when any concern is ticked and false otherwise", () => {
    assert.equal(sheetNeedsFollowUp({ safety: ["none"] }), false);
    assert.equal(sheetNeedsFollowUp({}), false);
    assert.equal(sheetNeedsFollowUp({ safety: ["scope"] }), true);
  });
});

describe("initialsOf and shortRef", () => {
  it("gives initials rather than a name for print", () => {
    assert.equal(initialsOf("Amara Okafor"), "A.O.");
    assert.equal(initialsOf("jean-luc"), "J.L.");
    assert.equal(initialsOf("Sam"), "S.");
    assert.equal(initialsOf("  "), "—");
  });

  it("makes a short uppercase reference from an id", () => {
    assert.equal(shortRef("0b1c2d3e-0000-4000-8000-000000000000"), "0B1C2D3E");
  });
});
