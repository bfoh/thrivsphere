/**
 * Form templates: the shape of the supervision sheet, the worksheets, and
 * anything like them added later.
 *
 * A template is plain data — no functions — for two reasons. It has to cross
 * from a Server Component to the Client Component that renders it, which only
 * serialisable values can. And it has to stay readable long after it was
 * replaced: answers are stored with the template key and version they were
 * given against, so a record made today still reads against the questions
 * that were actually asked, after the owner rewords them.
 *
 * Changing the wording of a live template means adding a new version, not
 * editing the old one. Old versions stay registered so old answers keep their
 * labels.
 */

export type Option = { value: string; label: string };

/**
 * Shown, or required, only when another answer matches.
 *
 * `equals` compares a single answer; `includesAny` matches when a single
 * answer is one of the listed values, or a checkbox answer contains one.
 * Neither set means "has any answer".
 */
export type Condition = { field: string; equals?: string; includesAny?: string[] };

type Common = {
  id: string;
  label: string;
  hint?: string;
  /** Enforced when finalising or submitting, never when saving a draft. */
  required?: boolean;
  requiredWhen?: Condition;
  /** Hidden fields' answers are discarded, so a changed mind leaves no stray text. */
  showWhen?: Condition;
};

export type TextField = Common & { kind: "text"; maxLength?: number; placeholder?: string };
export type TextareaField = Common & {
  kind: "textarea";
  maxLength?: number;
  rows?: number;
  placeholder?: string;
};
/** A whole number from 0 to 10. Personal and subjective, never a clinical score. */
export type RatingField = Common & { kind: "rating"; minLabel?: string; maxLabel?: string };
export type ChoiceField = Common & { kind: "choice"; options: Option[]; display?: "radio" | "select" };
/** `exclusive` names an option that cannot be ticked alongside any other. */
export type CheckboxesField = Common & { kind: "checkboxes"; options: Option[]; exclusive?: string };
/** An active colleague, picked from a list supplied at render time. */
export type StaffField = Common & { kind: "staff" };
/** A calendar date, YYYY-MM-DD. */
export type DateField = Common & { kind: "date" };

export type ScalarField = TextField | TextareaField | RatingField | ChoiceField | StaffField | DateField;

/** Rows of task / person responsible / by when, as on the paper sheet. */
export type TasksField = Common & { kind: "tasks"; maxRows: number };
/** A small group of fields that can be filled in more than once. */
export type RepeatField = Common & {
  kind: "repeat";
  maxItems: number;
  itemLabel: string;
  fields: ScalarField[];
};

export type InputField = ScalarField | CheckboxesField | TasksField | RepeatField;

/** Text that guides the person filling in the form; collects nothing. */
export type InfoBlock = {
  kind: "info";
  id: string;
  title?: string;
  body: string[];
  /** `safety` is the navy crisis style; `note` is a quiet aside. */
  tone?: "plain" | "note" | "safety";
  /** `:clientId` in an href is replaced with the record's client id. */
  links?: { label: string; href: string }[];
  showWhen?: Condition;
};

/** A two-column reference table, such as the intensity guide. */
export type TableBlock = {
  kind: "table";
  id: string;
  columns: [string, string];
  rows: [string, string][];
  caption?: string;
  showWhen?: Condition;
};

export type Block = InfoBlock | TableBlock;
export type Item = InputField | Block;

export type FormSection = { id: string; title: string; intro?: string; items: Item[] };

export type FormTemplate = {
  key: string;
  version: number;
  title: string;
  /** Who fills it in: staff in the back office, or the client in their portal. */
  audience: "staff" | "client";
  /** One line, for lists. */
  summary: string;
  sections: FormSection[];
  /** When submitting, at least this many questions must have an answer. */
  minAnswered?: number;
  /** Shown at the end of the form and on the printed copy. */
  closing?: string;
};

export type TaskRow = { description: string; assigneeId: string | null; dueBy: string | null };
export type RepeatItem = Record<string, string | number>;
export type AnswerValue = string | number | string[] | TaskRow[] | RepeatItem[];
export type Answers = Record<string, AnswerValue>;

export function isInputField(item: Item): item is InputField {
  return item.kind !== "info" && item.kind !== "table";
}
