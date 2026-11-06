/**
 * Turning submitted form fields into stored answers.
 *
 * Pure and framework-free, so the rules that decide what reaches a client's
 * record can be tested on their own. Only fields the template defines are
 * kept: anything else in the submission is dropped rather than stored, so a
 * tampered request cannot add keys to a care record.
 *
 * Two modes:
 *  - lenient, for saving a draft or saving progress — shape is still checked
 *    (lengths, choices, dates), but nothing is required yet;
 *  - strict, for finalising or submitting — required fields and the
 *    conditional rules are enforced too.
 */

import {
  isInputField,
  type Answers,
  type AnswerValue,
  type CheckboxesField,
  type Condition,
  type FormTemplate,
  type InputField,
  type RepeatItem,
  type ScalarField,
  type TaskRow,
} from "./types";

/** Submitted values by field name. Every value is a list, as FormData allows repeats. */
export type RawInput = Record<string, string[]>;

export type ParseOptions = {
  strict: boolean;
  /** Ids a staff field may name. Omitted, any well-formed id is accepted. */
  staffIds?: ReadonlySet<string>;
};

export type ParseResult = {
  answers: Answers;
  /** Keyed by field name, e.g. `mainIssue` or `tasks.1.description`. `_form` is form-wide. */
  errors: Record<string, string>;
  answeredCount: number;
};

const DEFAULT_TEXT_MAX = 300;
const DEFAULT_TEXTAREA_MAX = 4000;
const TASK_DESCRIPTION_MAX = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const REQUIRED_MESSAGE = "Please answer this.";

/** FormData to RawInput, ignoring files and Next's own `$ACTION_` fields. */
export function formDataToRaw(fd: FormData): RawInput {
  const raw: RawInput = {};
  for (const [name, value] of fd.entries()) {
    if (name.startsWith("$ACTION_") || typeof value !== "string") continue;
    (raw[name] ??= []).push(value);
  }
  return raw;
}

export function isEmptyAnswer(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return false;
  return v.length === 0;
}

export function conditionHolds(c: Condition | undefined, answers: Answers): boolean {
  if (!c) return true;
  const v = answers[c.field];
  if (c.equals !== undefined) return v === c.equals;
  if (c.includesAny) {
    const any = c.includesAny;
    if (typeof v === "string") return any.includes(v);
    return Array.isArray(v) && (v as unknown[]).some((x) => typeof x === "string" && any.includes(x));
  }
  return !isEmptyAnswer(v);
}

function isValidDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** One scalar value: returns the stored value (or undefined when blank) or an error. */
function parseScalar(
  field: ScalarField,
  input: string,
  opts: ParseOptions
): { value?: string | number; error?: string } {
  const s = input.trim();
  if (s === "") return {};

  switch (field.kind) {
    case "text":
    case "textarea": {
      const max = field.maxLength ?? (field.kind === "text" ? DEFAULT_TEXT_MAX : DEFAULT_TEXTAREA_MAX);
      if (s.length > max) return { error: `Keep this under ${max.toLocaleString("en-GB")} characters.` };
      // Line endings normalised so the stored text does not depend on the browser.
      return { value: s.replace(/\r\n?/g, "\n") };
    }
    case "rating": {
      if (!/^\d{1,2}$/.test(s)) return { error: "Choose a number from 0 to 10." };
      const n = Number(s);
      if (n < 0 || n > 10) return { error: "Choose a number from 0 to 10." };
      return { value: n };
    }
    case "choice":
      if (!field.options.some((o) => o.value === s)) return { error: "Choose one of the options." };
      return { value: s };
    case "staff":
      if (!UUID.test(s) || (opts.staffIds && !opts.staffIds.has(s))) {
        return { error: "Choose someone from the list." };
      }
      return { value: s };
    case "date":
      if (!isValidDate(s)) return { error: "Enter a valid date." };
      return { value: s };
  }
}

function parseCheckboxes(field: CheckboxesField, values: string[]): { value: string[]; error?: string } {
  const allowed = new Set(field.options.map((o) => o.value));
  const picked = [...new Set(values.map((v) => v.trim()))].filter((v) => allowed.has(v));
  if (field.exclusive && picked.includes(field.exclusive) && picked.length > 1) {
    const label = field.options.find((o) => o.value === field.exclusive)?.label ?? field.exclusive;
    return { value: picked, error: `"${label}" can't be ticked together with another option.` };
  }
  // Kept in the template's order, so the stored list reads the same way as the form.
  return { value: field.options.map((o) => o.value).filter((v) => picked.includes(v)) };
}

const first = (raw: RawInput, name: string) => raw[name]?.[0] ?? "";

export function parseAnswers(template: FormTemplate, raw: RawInput, opts: ParseOptions): ParseResult {
  const answers: Answers = {};
  const errors: Record<string, string> = {};
  const fields: InputField[] = template.sections.flatMap((s) => s.items.filter(isInputField));

  for (const field of fields) {
    switch (field.kind) {
      case "checkboxes": {
        const r = parseCheckboxes(field, raw[field.id] ?? []);
        if (r.error) errors[field.id] = r.error;
        if (r.value.length) answers[field.id] = r.value;
        break;
      }
      case "tasks": {
        const rows: TaskRow[] = [];
        for (let i = 0; i < field.maxRows; i++) {
          const p = `${field.id}.${i}`;
          const description = first(raw, `${p}.description`).trim();
          const assigneeRaw = first(raw, `${p}.assigneeId`).trim();
          const dueRaw = first(raw, `${p}.dueBy`).trim();
          if (!description && !assigneeRaw && !dueRaw) continue;

          if (description.length > TASK_DESCRIPTION_MAX) {
            errors[`${p}.description`] = `Keep this under ${TASK_DESCRIPTION_MAX} characters.`;
          }
          if (opts.strict && !description) errors[`${p}.description`] = "Describe the task.";

          let assigneeId: string | null = null;
          if (assigneeRaw) {
            if (!UUID.test(assigneeRaw) || (opts.staffIds && !opts.staffIds.has(assigneeRaw))) {
              errors[`${p}.assigneeId`] = "Choose someone from the list.";
            } else assigneeId = assigneeRaw;
          }
          if (opts.strict && description && !assigneeRaw) {
            errors[`${p}.assigneeId`] = "Who is responsible?";
          }

          let dueBy: string | null = null;
          if (dueRaw) {
            if (!isValidDate(dueRaw)) errors[`${p}.dueBy`] = "Enter a valid date.";
            else dueBy = dueRaw;
          }
          rows.push({ description: description.slice(0, TASK_DESCRIPTION_MAX), assigneeId, dueBy });
        }
        if (rows.length) answers[field.id] = rows;
        break;
      }
      case "repeat": {
        const items: RepeatItem[] = [];
        for (let i = 0; i < field.maxItems; i++) {
          const item: RepeatItem = {};
          for (const sub of field.fields) {
            const name = `${field.id}.${i}.${sub.id}`;
            const r = parseScalar(sub, first(raw, name), opts);
            if (r.error) errors[name] = r.error;
            else if (r.value !== undefined) item[sub.id] = r.value;
          }
          if (Object.keys(item).length) items.push(item);
        }
        if (items.length) answers[field.id] = items;
        break;
      }
      default: {
        const r = parseScalar(field, first(raw, field.id), opts);
        if (r.error) errors[field.id] = r.error;
        else if (r.value !== undefined) answers[field.id] = r.value;
      }
    }
  }

  // Visibility is decided on the parsed answers, so a hidden field's text is
  // discarded rather than kept against a question the person no longer saw.
  for (const field of fields) {
    if (!conditionHolds(field.showWhen, answers)) {
      delete answers[field.id];
      for (const k of Object.keys(errors)) {
        if (k === field.id || k.startsWith(`${field.id}.`)) delete errors[k];
      }
    }
  }

  if (opts.strict) {
    for (const field of fields) {
      if (!conditionHolds(field.showWhen, answers)) continue;
      const needed = field.required || (field.requiredWhen && conditionHolds(field.requiredWhen, answers));
      if (needed && isEmptyAnswer(answers[field.id]) && !errors[field.id]) {
        errors[field.id] = REQUIRED_MESSAGE;
      }
    }
  }

  const answeredCount = fields.filter((f) => !isEmptyAnswer(answers[f.id])).length;
  if (opts.strict && template.minAnswered && answeredCount < template.minAnswered) {
    errors._form =
      template.minAnswered === 1
        ? "Answer at least one question before sending."
        : `Answer at least ${template.minAnswered} questions before sending.`;
  }

  return { answers, errors, answeredCount };
}

/**
 * Read stored answers defensively.
 *
 * Stored JSON is trusted more than a request, but not blindly: it is shown to
 * people, so anything that is not the expected shape is ignored.
 */
export function readAnswers(value: unknown): Answers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Answers;
}

/** Stored answers back into form values, for reopening a draft. The inverse of parseAnswers. */
export function answersToRaw(template: FormTemplate, answers: Answers): RawInput {
  const raw: RawInput = {};
  const fields: InputField[] = template.sections.flatMap((s) => s.items.filter(isInputField));
  for (const field of fields) {
    const v = answers[field.id];
    if (v === undefined) continue;
    switch (field.kind) {
      case "checkboxes":
        if (Array.isArray(v)) raw[field.id] = (v as unknown[]).filter((x): x is string => typeof x === "string");
        break;
      case "tasks":
        if (Array.isArray(v)) {
          (v as TaskRow[]).slice(0, field.maxRows).forEach((t, i) => {
            raw[`${field.id}.${i}.description`] = [t.description ?? ""];
            raw[`${field.id}.${i}.assigneeId`] = [t.assigneeId ?? ""];
            raw[`${field.id}.${i}.dueBy`] = [t.dueBy ?? ""];
          });
        }
        break;
      case "repeat":
        if (Array.isArray(v)) {
          (v as RepeatItem[]).slice(0, field.maxItems).forEach((item, i) => {
            for (const sub of field.fields) {
              if (item[sub.id] !== undefined) raw[`${field.id}.${i}.${sub.id}`] = [String(item[sub.id])];
            }
          });
        }
        break;
      default:
        if (typeof v === "string" || typeof v === "number") raw[field.id] = [String(v)];
    }
  }
  return raw;
}
