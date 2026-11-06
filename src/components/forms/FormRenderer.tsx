"use client";

import * as React from "react";
import { startTransition, useActionState } from "react";
import { answersToRaw, conditionHolds, parseAnswers, type RawInput } from "@/lib/forms/answers";
import {
  isInputField,
  type Answers,
  type FormTemplate,
  type InputField,
  type ScalarField,
} from "@/lib/forms/types";
import { initialResourceState, type ResourceFormState } from "@/lib/resources-state";
import { errorStyle, hintStyle, inputStyle, labelStyle, statusStyle } from "./styles";
import { BlockView } from "./BlockView";

export type HeaderField =
  | {
      kind: "select";
      name: string;
      label: string;
      hint?: string;
      options: { value: string; label: string }[];
      defaultValue: string;
      /** Label for a blank first option; omitted, a choice is required. */
      emptyLabel?: string;
    }
  | { kind: "date"; name: string; label: string; hint?: string; defaultValue: string; max?: string };

export type FormButton = {
  intent: string;
  label: string;
  primary?: boolean;
  /** Asked inline before the action runs, for steps that cannot be undone. */
  confirm?: string;
};

type Props = {
  template: FormTemplate;
  initialAnswers: Answers;
  action: (prev: ResourceFormState, fd: FormData) => Promise<ResourceFormState>;
  /** Ids the action needs, e.g. recordId and clientId. */
  hidden: Record<string, string>;
  revision: number;
  staff?: { id: string; name: string }[];
  /** Replaces `:clientId` in guidance links. */
  clientId?: string;
  headerTitle?: string;
  headerFields?: HeaderField[];
  buttons: FormButton[];
  footerNote?: string;
};

type Setter = (name: string, values: string[]) => void;

/**
 * Renders a form template for filling in.
 *
 * Inputs are controlled, because questions appear and disappear with earlier
 * answers ("What is it now?" only after "Yes"). The form is sent from a submit
 * handler inside a transition rather than through `<form action>`, which
 * would reset every field after each save — fine for a one-line note, not for
 * a half-written sheet.
 *
 * Leaving with unsaved changes asks first.
 */
export function FormRenderer({
  template,
  initialAnswers,
  action,
  hidden,
  revision,
  staff = [],
  clientId,
  headerTitle,
  headerFields = [],
  buttons,
  footerNote,
}: Props) {
  const [state, dispatch, pending] = useActionState(action, initialResourceState);
  const [raw, setRaw] = React.useState<RawInput>(() => answersToRaw(template, initialAnswers));
  const [confirming, setConfirming] = React.useState<string | null>(null);

  // Unsaved-changes tracking without effects: count edits, remember the count
  // when a save is sent, and adopt it once that save comes back successful.
  const [changes, setChanges] = React.useState(0);
  const [sentAt, setSentAt] = React.useState(0);
  const [savedAt, setSavedAt] = React.useState(0);
  const [seenState, setSeenState] = React.useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "ok") setSavedAt(sentAt);
  }
  const dirty = changes !== savedAt;

  const formRef = React.useRef<HTMLFormElement>(null);
  const uid = React.useId();
  const fe = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const currentRevision = Math.max(state.revision ?? 0, revision);

  const answers = React.useMemo(() => parseAnswers(template, raw, { strict: false }).answers, [template, raw]);

  const set: Setter = React.useCallback((name, values) => {
    setRaw((r) => ({ ...r, [name]: values }));
    setChanges((n) => n + 1);
    // An edit after "Finalise?" was asked means the answer may no longer hold.
    setConfirming(null);
  }, []);

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Take the person to the first problem rather than leaving them to hunt.
  React.useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const el = formRef.current?.querySelector<HTMLElement>('[data-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.querySelector<HTMLElement>("input, textarea, select")?.focus({ preventScroll: true });
  }, [state]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value || buttons[0]?.intent || "save";
    const button = buttons.find((b) => b.intent === intent);
    if (button?.confirm && confirming !== intent) {
      setConfirming(intent);
      return;
    }
    setConfirming(null);
    const fd = new FormData(e.currentTarget);
    fd.set("intent", intent);
    fd.set("revision", String(currentRevision));
    setSentAt(changes);
    startTransition(() => dispatch(fd));
  }

  const ctx: RenderCtx = { raw, set, fe, answers, staff, clientId, uid, pending };
  const confirmButton = buttons.find((b) => b.intent === confirming);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {headerFields.length > 0 && (
        <section className="card" style={sectionStyle}>
          {headerTitle && <h2 style={sectionTitle}>{headerTitle}</h2>}
          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 22px" }}>
            {headerFields.map((h) => (
              <HeaderInput key={h.name} field={h} error={fe[h.name]} uid={uid} onEdit={() => setChanges((n) => n + 1)} />
            ))}
          </div>
        </section>
      )}

      {template.sections.map((section) => {
        const visible = section.items.filter((i) => conditionHolds(i.showWhen, answers));
        if (!visible.length) return null;
        return (
          <section key={section.id} className="card" style={sectionStyle} aria-labelledby={`${uid}-${section.id}`}>
            <h2 id={`${uid}-${section.id}`} style={sectionTitle}>
              {section.title}
            </h2>
            {section.intro && <p style={{ ...hintStyle, fontSize: 14, margin: "-4px 0 14px" }}>{section.intro}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {visible.map((item) =>
                isInputField(item) ? (
                  <FieldInput key={item.id} field={item} ctx={ctx} />
                ) : (
                  <BlockView key={item.id} block={item} clientId={clientId} />
                )
              )}
            </div>
          </section>
        );
      })}

      {template.closing && (
        <p style={{ margin: "4px 0 18px", fontSize: 15, fontWeight: 700, color: "var(--navy)", lineHeight: 1.6 }}>
          {template.closing}
        </p>
      )}

      <div
        className="no-print"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 5,
          background: "rgba(250,249,246,0.97)",
          borderTop: "1px solid rgba(31,58,95,0.12)",
          padding: "14px 4px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {buttons.map((b) => (
            <button
              key={b.intent}
              type="submit"
              value={b.intent}
              disabled={pending}
              className={b.primary ? "pill pill-teal" : "pill pill-ghost"}
              style={{ padding: "11px 22px", fontSize: 14.5, opacity: pending ? 0.6 : 1 }}
            >
              {pending ? "Saving…" : b.label}
            </button>
          ))}
          <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }} aria-live="polite">
            {dirty && !pending ? "Unsaved changes" : ""}
          </span>
        </div>
        {/*
          Below the normal buttons on purpose: pressing Enter in a field submits
          with the first button in the form, which must be the harmless one.
        */}
        {confirmButton && (
          <div
            role="alertdialog"
            aria-label={confirmButton.label}
            style={{
              background: "#fff",
              border: "1px solid rgba(31,58,95,0.18)",
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--ink)", flex: "1 1 260px", lineHeight: 1.5 }}>{confirmButton.confirm}</span>
            <button
              type="submit"
              value={confirmButton.intent}
              className="pill pill-teal"
              disabled={pending}
              style={{ padding: "10px 18px", fontSize: 14 }}
            >
              Yes, {confirmButton.label.toLowerCase()}
            </button>
            <button type="button" className="pill pill-ghost" onClick={() => setConfirming(null)} style={{ padding: "10px 18px", fontSize: 14 }}>
              Not yet
            </button>
          </div>
        )}


        {state.status !== "idle" && (
          <p role="status" style={statusStyle(state.status === "ok")}>
            {state.message}
          </p>
        )}
        {state.status === "ok" && state.concernFlagged && clientId && (
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
            Section 3 flags a concern. If it isn&apos;t on the record yet,{" "}
            <a href={`/admin/clients/${clientId}#safeguarding`} style={{ color: "#a1421c", fontWeight: 700 }}>
              raise a safeguarding concern
            </a>{" "}
            or{" "}
            <a href={`/admin/clients/${clientId}#referrals`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              record a referral
            </a>
            .
          </p>
        )}
        {footerNote && <p style={{ ...hintStyle, margin: 0 }}>{footerNote}</p>}
      </div>
    </form>
  );
}

const sectionStyle: React.CSSProperties = { padding: "22px 24px", marginBottom: 16 };
const sectionTitle: React.CSSProperties = { margin: "0 0 14px", fontSize: 18, fontWeight: 800, color: "var(--navy)" };

type RenderCtx = {
  raw: RawInput;
  set: Setter;
  fe: Record<string, string>;
  answers: Answers;
  staff: { id: string; name: string }[];
  clientId?: string;
  uid: string;
  pending: boolean;
};

function HeaderInput({
  field,
  error,
  uid,
  onEdit,
}: {
  field: HeaderField;
  error?: string;
  uid: string;
  onEdit: () => void;
}) {
  const id = `${uid}-h-${field.name}`;
  return (
    <div data-invalid={error ? "true" : undefined}>
      <label htmlFor={id} style={labelStyle}>
        {field.label}
      </label>
      {field.hint && <p style={hintStyle}>{field.hint}</p>}
      {field.kind === "select" ? (
        <select id={id} name={field.name} defaultValue={field.defaultValue} onChange={onEdit} style={inputStyle} aria-invalid={!!error}>
          {field.emptyLabel !== undefined && <option value="">{field.emptyLabel}</option>}
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="date"
          name={field.name}
          defaultValue={field.defaultValue}
          max={field.max}
          onChange={onEdit}
          style={inputStyle}
          aria-invalid={!!error}
        />
      )}
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

/** Label, hint and error around a control, wired up for screen readers. */
function Wrap({
  id,
  label,
  hint,
  error,
  required,
  legend,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Groups (radios, checkboxes, ratings) use a fieldset and legend. */
  legend?: boolean;
  children: React.ReactNode;
}) {
  const mark = required ? <span style={{ color: "#a1421c" }}> *</span> : null;
  const inner = (
    <>
      {hint && (
        <p id={`${id}-hint`} style={hintStyle}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} style={errorStyle}>
          {error}
        </p>
      )}
    </>
  );
  if (legend) {
    return (
      <fieldset data-invalid={error ? "true" : undefined} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <legend style={{ ...labelStyle, padding: 0 }}>
          {label}
          {mark}
        </legend>
        {inner}
      </fieldset>
    );
  }
  return (
    <div data-invalid={error ? "true" : undefined}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {mark}
      </label>
      {inner}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

function FieldInput({ field, ctx }: { field: InputField; ctx: RenderCtx }) {
  const id = `${ctx.uid}-${field.id}`;
  const required = !!(field.required || (field.requiredWhen && conditionHolds(field.requiredWhen, ctx.answers)));

  if (field.kind === "checkboxes") {
    const picked = ctx.raw[field.id] ?? [];
    const toggle = (value: string, on: boolean) => {
      let next = on ? [...picked, value] : picked.filter((v) => v !== value);
      // "No new concern" and a concern cannot both be ticked: choosing one clears the other.
      if (on && field.exclusive) {
        next = value === field.exclusive ? [value] : next.filter((v) => v !== field.exclusive);
      }
      ctx.set(field.id, next);
    };
    const error = ctx.fe[field.id];
    return (
      <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required} legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-describedby={describedBy(id, field.hint, error)}>
          {field.options.map((o) => (
            <label key={o.value} style={choiceRow(picked.includes(o.value))}>
              <input
                type="checkbox"
                name={field.id}
                value={o.value}
                checked={picked.includes(o.value)}
                onChange={(e) => toggle(o.value, e.target.checked)}
                style={{ marginTop: 3, accentColor: "var(--teal-deep)", width: 17, height: 17, flex: "0 0 auto" }}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </Wrap>
    );
  }

  if (field.kind === "tasks") return <TasksInput field={field} ctx={ctx} />;
  if (field.kind === "repeat") return <RepeatInput field={field} ctx={ctx} />;

  return (
    <ScalarInput
      field={field}
      name={field.id}
      id={id}
      ctx={ctx}
      required={required}
      error={ctx.fe[field.id]}
    />
  );
}

function ScalarInput({
  field,
  name,
  id,
  ctx,
  required,
  error,
}: {
  field: ScalarField;
  name: string;
  id: string;
  ctx: RenderCtx;
  required?: boolean;
  error?: string;
}) {
  const value = ctx.raw[name]?.[0] ?? "";
  const onValue = (v: string) => ctx.set(name, [v]);
  const aria = { "aria-invalid": !!error, "aria-describedby": describedBy(id, field.hint, error) };

  switch (field.kind) {
    case "text":
      return (
        <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required}>
          <input
            id={id}
            name={name}
            value={value}
            maxLength={field.maxLength ?? 300}
            placeholder={field.placeholder}
            onChange={(e) => onValue(e.target.value)}
            style={inputStyle}
            {...aria}
          />
        </Wrap>
      );
    case "textarea": {
      const max = field.maxLength ?? 4000;
      return (
        <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required}>
          <textarea
            id={id}
            name={name}
            value={value}
            rows={field.rows ?? 3}
            maxLength={max}
            placeholder={field.placeholder}
            onChange={(e) => onValue(e.target.value)}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
            {...aria}
          />
          {value.length > max * 0.8 && (
            <p style={{ ...hintStyle, margin: "4px 0 0", textAlign: "right" }}>
              {value.length.toLocaleString("en-GB")} / {max.toLocaleString("en-GB")}
            </p>
          )}
        </Wrap>
      );
    }
    case "rating":
      return (
        <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required} legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} {...aria}>
            {Array.from({ length: 11 }, (_, n) => String(n)).map((n) => (
              <label key={n} className={`rating-pill${value === n ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name={name}
                  value={n}
                  checked={value === n}
                  onChange={() => onValue(n)}
                  className="visually-hidden"
                />
                {n}
              </label>
            ))}
          </div>
          {(field.minLabel || field.maxLabel) && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6, fontSize: 12.5, color: "var(--navy-soft)" }}>
              <span>{field.minLabel}</span>
              <span>{field.maxLabel}</span>
            </div>
          )}
          {value !== "" && (
            <button
              type="button"
              onClick={() => onValue("")}
              style={{ marginTop: 6, background: "none", border: 0, padding: 0, fontSize: 13, color: "var(--teal-deep)", fontWeight: 700, cursor: "pointer" }}
            >
              Clear rating
            </button>
          )}
        </Wrap>
      );
    case "choice":
      if (field.display === "select") {
        return (
          <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required}>
            <select id={id} name={name} value={value} onChange={(e) => onValue(e.target.value)} style={inputStyle} {...aria}>
              <option value="">—</option>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Wrap>
        );
      }
      return (
        <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required} legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} {...aria}>
            {field.options.map((o) => (
              <label key={o.value} style={choiceRow(value === o.value)}>
                <input
                  type="radio"
                  name={name}
                  value={o.value}
                  checked={value === o.value}
                  onChange={() => onValue(o.value)}
                  style={{ marginTop: 3, accentColor: "var(--teal-deep)", width: 16, height: 16, flex: "0 0 auto" }}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </Wrap>
      );
    case "staff":
      return (
        <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required}>
          <StaffSelect id={id} name={name} value={value} staff={ctx.staff} onChange={onValue} aria={aria} />
        </Wrap>
      );
    case "date":
      return (
        <Wrap id={id} label={field.label} hint={field.hint} error={error} required={required}>
          <input id={id} type="date" name={name} value={value} onChange={(e) => onValue(e.target.value)} style={inputStyle} {...aria} />
        </Wrap>
      );
  }
}

function StaffSelect({
  id,
  name,
  value,
  staff,
  onChange,
  aria,
}: {
  id: string;
  name: string;
  value: string;
  staff: { id: string; name: string }[];
  onChange: (v: string) => void;
  aria?: Record<string, unknown>;
}) {
  // Someone who has since left stays visible on a draft rather than vanishing.
  const known = !value || staff.some((s) => s.id === value);
  return (
    <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} {...aria}>
      <option value="">Choose a colleague…</option>
      {!known && <option value={value}>A former colleague — please choose again</option>}
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

function TasksInput({ field, ctx }: { field: Extract<InputField, { kind: "tasks" }>; ctx: RenderCtx }) {
  const filled = Array.from({ length: field.maxRows }, (_, i) =>
    ["description", "assigneeId", "dueBy"].some((k) => (ctx.raw[`${field.id}.${i}.${k}`]?.[0] ?? "") !== "")
  );
  const lastFilled = filled.lastIndexOf(true);
  const [rows, setRows] = React.useState(Math.min(field.maxRows, Math.max(lastFilled + 2, 2)));
  const id = `${ctx.uid}-${field.id}`;

  return (
    <Wrap id={id} label={field.label} hint={field.hint} legend>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: rows }, (_, i) => {
          const p = `${field.id}.${i}`;
          const errs = ["description", "assigneeId", "dueBy"].map((k) => ctx.fe[`${p}.${k}`]).filter(Boolean);
          return (
            <div
              key={i}
              data-invalid={errs.length ? "true" : undefined}
              style={{ border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "12px 14px", background: "rgba(79,168,168,0.04)" }}
            >
              <div className="two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) minmax(0,1fr)", gap: 10 }}>
                <div>
                  <label htmlFor={`${id}-${i}-d`} style={{ ...labelStyle, fontSize: 12.5 }}>
                    Preparation task {i + 1}
                  </label>
                  <input
                    id={`${id}-${i}-d`}
                    name={`${p}.description`}
                    value={ctx.raw[`${p}.description`]?.[0] ?? ""}
                    maxLength={300}
                    onChange={(e) => ctx.set(`${p}.description`, [e.target.value])}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-${i}-a`} style={{ ...labelStyle, fontSize: 12.5 }}>
                    Person responsible
                  </label>
                  <StaffSelect
                    id={`${id}-${i}-a`}
                    name={`${p}.assigneeId`}
                    value={ctx.raw[`${p}.assigneeId`]?.[0] ?? ""}
                    staff={ctx.staff}
                    onChange={(v) => ctx.set(`${p}.assigneeId`, [v])}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-${i}-b`} style={{ ...labelStyle, fontSize: 12.5 }}>
                    By (optional)
                  </label>
                  <input
                    id={`${id}-${i}-b`}
                    type="date"
                    name={`${p}.dueBy`}
                    value={ctx.raw[`${p}.dueBy`]?.[0] ?? ""}
                    onChange={(e) => ctx.set(`${p}.dueBy`, [e.target.value])}
                    style={inputStyle}
                  />
                </div>
              </div>
              {errs.map((e) => (
                <p key={e} style={errorStyle}>
                  {e}
                </p>
              ))}
            </div>
          );
        })}
      </div>
      {rows < field.maxRows && (
        <button type="button" className="pill pill-ghost" onClick={() => setRows((n) => n + 1)} style={{ marginTop: 10, padding: "8px 16px", fontSize: 13.5 }}>
          Add a task
        </button>
      )}
    </Wrap>
  );
}

function RepeatInput({ field, ctx }: { field: Extract<InputField, { kind: "repeat" }>; ctx: RenderCtx }) {
  const filled = Array.from({ length: field.maxItems }, (_, i) =>
    field.fields.some((f) => (ctx.raw[`${field.id}.${i}.${f.id}`]?.[0] ?? "") !== "")
  );
  const [items, setItems] = React.useState(Math.max(1, filled.lastIndexOf(true) + 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: items }, (_, i) => (
        <fieldset
          key={i}
          style={{ border: "1px solid rgba(31,58,95,0.12)", borderRadius: 12, padding: "14px 16px", margin: 0, minWidth: 0 }}
        >
          <legend style={{ ...labelStyle, padding: "0 6px", marginBottom: 0 }}>
            {field.itemLabel} {i + 1}
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {field.fields.map((sub) => {
              const name = `${field.id}.${i}.${sub.id}`;
              return (
                <ScalarInput key={sub.id} field={sub} name={name} id={`${ctx.uid}-${name}`} ctx={ctx} error={ctx.fe[name]} />
              );
            })}
          </div>
        </fieldset>
      ))}
      {items < field.maxItems && (
        <button type="button" className="pill pill-ghost" onClick={() => setItems((n) => n + 1)} style={{ alignSelf: "flex-start", padding: "8px 16px", fontSize: 13.5 }}>
          Add another {field.itemLabel.toLowerCase()}
        </button>
      )}
    </div>
  );
}

const choiceRow = (on: boolean): React.CSSProperties => ({
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  fontSize: 14.5,
  lineHeight: 1.45,
  color: "var(--ink)",
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${on ? "rgba(61,138,138,0.55)" : "rgba(31,58,95,0.14)"}`,
  background: on ? "rgba(79,168,168,0.08)" : "#fff",
  cursor: "pointer",
});
