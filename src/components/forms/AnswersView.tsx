import * as React from "react";
import { conditionHolds, isEmptyAnswer } from "@/lib/forms/answers";
import {
  isInputField,
  type AnswerValue,
  type Answers,
  type FormTemplate,
  type InputField,
  type RepeatItem,
  type ScalarField,
  type TaskRow,
} from "@/lib/forms/types";
import { BlockView } from "./BlockView";

type Props = {
  template: FormTemplate;
  answers: Answers;
  /** User id to name, for staff fields and task rows. */
  names?: Map<string, string>;
  /**
   * `answers` shows what was given (unanswered questions are marked, so a gap
   * reads as a gap, not as a missing question). `blank` is the printable
   * paper copy: every question with space to write.
   */
  mode?: "answers" | "blank";
};

/**
 * A completed form, read-only, against the questions it was answered against.
 *
 * Used for finalised supervision sheets, sent worksheets, and the blank paper
 * copies. Rendered on the server; no client code.
 */
export function AnswersView({ template, answers, names = new Map(), mode = "answers" }: Props) {
  const blank = mode === "blank";
  return (
    <div className="answers-view">
      {template.sections.map((section) => {
        // A paper copy shows every question, including ones that only appear
        // on screen after an earlier answer.
        const items = section.items.filter((i) => blank || conditionHolds(i.showWhen, answers));
        // Guidance is for whoever is filling it in; a completed record shows answers only.
        const shown = blank ? items : items.filter(isInputField);
        if (!shown.length) return null;
        return (
          <section key={section.id} className="card answers-section" style={{ padding: "20px 24px", marginBottom: 14 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>{section.title}</h2>
            {blank && section.intro && <p style={{ margin: "-4px 0 12px", fontSize: 14, color: "var(--navy-soft)", lineHeight: 1.5 }}>{section.intro}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {shown.map((item) =>
                isInputField(item) ? (
                  <FieldAnswer key={item.id} field={item} value={answers[item.id]} names={names} blank={blank} />
                ) : (
                  <BlockView key={item.id} block={item} />
                )
              )}
            </div>
          </section>
        );
      })}
      {template.closing && (
        <p style={{ margin: "6px 0 0", fontSize: 15, fontWeight: 700, color: "var(--navy)", lineHeight: 1.6 }}>{template.closing}</p>
      )}
    </div>
  );
}

const qStyle: React.CSSProperties = {
  fontSize: 12.5,
  letterSpacing: "0.02em",
  color: "var(--navy-soft)",
  fontWeight: 800,
  marginBottom: 4,
  lineHeight: 1.4,
};
const aStyle: React.CSSProperties = { fontSize: 15, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-wrap", margin: 0 };
const noneStyle: React.CSSProperties = { ...aStyle, color: "var(--navy-soft)", fontStyle: "italic" };

/** Ruled lines to write on, for the paper copy. */
function Lines({ n }: { n: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ borderBottom: "1px solid rgba(31,58,95,0.35)", height: 26 }} />
      ))}
    </div>
  );
}

function Boxes({ labels }: { labels: string[] }) {
  // A long list of short options (the emotion words) goes into columns, so a
  // paper copy is not a page of one-word lines.
  const grid = labels.length > 6 && labels.every((l) => l.length <= 24);
  return (
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: "none",
        display: grid ? "grid" : "flex",
        gridTemplateColumns: grid ? "repeat(auto-fill, minmax(140px, 1fr))" : undefined,
        flexDirection: grid ? undefined : "column",
        gap: 6,
      }}
    >
      {labels.map((l) => (
        <li key={l} style={{ fontSize: 14.5, color: "var(--ink)" }}>
          ☐ {l}
        </li>
      ))}
    </ul>
  );
}

function scalarText(field: ScalarField, v: string | number | undefined, names: Map<string, string>): string | null {
  if (v === undefined || v === "") return null;
  switch (field.kind) {
    case "rating":
      return `${v} / 10`;
    case "choice":
      return field.options.find((o) => o.value === v)?.label ?? String(v);
    case "staff":
      return names.get(String(v)) ?? "A former colleague";
    case "date":
      return new Date(`${v}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    default:
      return String(v);
  }
}

function BlankScalar({ field }: { field: ScalarField }) {
  switch (field.kind) {
    case "textarea":
      return <Lines n={Math.max(2, field.rows ?? 3)} />;
    case "rating":
      return (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Array.from({ length: 11 }, (_, n) => (
              <span
                key={n}
                style={{ width: 28, height: 28, border: "1px solid rgba(31,58,95,0.45)", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
              >
                {n}
              </span>
            ))}
          </div>
          {(field.minLabel || field.maxLabel) && (
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--navy-soft)" }}>
              {[field.minLabel, field.maxLabel].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      );
    case "choice":
      return <Boxes labels={field.options.map((o) => o.label)} />;
    default:
      return <Lines n={1} />;
  }
}

function FieldAnswer({
  field,
  value,
  names,
  blank,
}: {
  field: InputField;
  value: AnswerValue | undefined;
  names: Map<string, string>;
  blank: boolean;
}) {
  const label = (
    <div style={qStyle}>
      {field.label}
      {blank && field.hint && <span style={{ fontWeight: 400, display: "block", marginTop: 2 }}>{field.hint}</span>}
    </div>
  );

  if (field.kind === "checkboxes") {
    const picked = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        {label}
        {blank ? (
          <Boxes labels={field.options.map((o) => o.label)} />
        ) : picked.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {field.options
              .filter((o) => picked.includes(o.value))
              .map((o) => (
                <li key={o.value} style={aStyle}>
                  {o.label}
                </li>
              ))}
          </ul>
        ) : (
          <p style={noneStyle}>Not answered</p>
        )}
      </div>
    );
  }

  if (field.kind === "tasks") {
    const rows = Array.isArray(value) ? (value as TaskRow[]) : [];
    const shown = blank ? Array.from({ length: 4 }, () => null) : rows;
    return (
      <div>
        {label}
        {!blank && !rows.length ? (
          <p style={noneStyle}>No tasks</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                {["Preparation task", "Person responsible", "By"].map((h) => (
                  <th key={h} scope="col" style={{ textAlign: "left", padding: "6px 8px", background: "rgba(31,58,95,0.06)", color: "var(--navy)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((t, i) => (
                <tr key={i}>
                  <td style={cell}>{t?.description ?? " "}</td>
                  <td style={cell}>{t ? (t.assigneeId ? (names.get(t.assigneeId) ?? "A former colleague") : "—") : " "}</td>
                  <td style={cell}>{t?.dueBy ? new Date(`${t.dueBy}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : blank ? " " : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (field.kind === "repeat") {
    const items = Array.isArray(value) ? (value as RepeatItem[]) : [];
    const shown = blank ? Array.from({ length: 1 }, () => ({}) as RepeatItem) : items;
    if (!blank && !items.length) {
      return (
        <div>
          {label}
          <p style={noneStyle}>Not answered</p>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.map((item, i) => (
          <div key={i} style={{ border: "1px solid rgba(31,58,95,0.12)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ ...qStyle, color: "var(--navy)" }}>
              {field.itemLabel} {i + 1}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {field.fields.map((sub) => (
                <div key={sub.id}>
                  <div style={qStyle}>{sub.label}</div>
                  {blank ? <BlankScalar field={sub} /> : <Scalar text={scalarText(sub, item[sub.id], names)} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {label}
      {blank ? (
        <BlankScalar field={field} />
      ) : (
        <Scalar text={isEmptyAnswer(value) ? null : scalarText(field, value as string | number, names)} />
      )}
    </div>
  );
}

function Scalar({ text }: { text: string | null }) {
  return text ? <p style={aStyle}>{text}</p> : <p style={noneStyle}>Not answered</p>;
}

const cell: React.CSSProperties = {
  padding: "7px 8px",
  borderTop: "1px solid rgba(31,58,95,0.12)",
  verticalAlign: "top",
  color: "var(--ink)",
  height: 22,
};
