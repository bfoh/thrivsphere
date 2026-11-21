"use client";

import * as React from "react";
import type { TaskKey, TaskOutput } from "@/lib/ai/tasks";
import { callAi } from "./call";
import { REWRITE_STYLES, type RewriteStyle } from "@/lib/ai/styles";

const box: React.CSSProperties = { border: "1px solid rgba(61,138,138,0.35)", background: "rgba(79,168,168,0.06)", borderRadius: 12, padding: "14px 16px" };
const small: React.CSSProperties = { padding: "6px 13px", fontSize: 12.5 };
const useButton: React.CSSProperties = { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, color: "var(--teal-deep)", textDecoration: "underline" };

type Fields = { postId: string; title: string; category: string; excerpt: string; body: string; sources: string };
type Selection = { start: number; end: number; text: string };

type Result =
  | { kind: "blog-titles"; output: TaskOutput<"blog-titles"> }
  | { kind: "blog-summary"; output: TaskOutput<"blog-summary"> }
  | { kind: "blog-review"; output: TaskOutput<"blog-review"> }
  | { kind: "blog-rewrite"; output: TaskOutput<"blog-rewrite">; selection: Selection };

/**
 * AI help in the blog editor: titles, the summary, a check against the
 * rules, and rewriting a selected passage. Anything used is marked on the
 * saved version as AI-assisted, and still needs a reviewer's approval.
 */
export function BlogAssist({
  fields,
  getSelection,
  onUse,
}: {
  fields: Fields;
  getSelection: () => Selection | null;
  onUse: (patch: Partial<Pick<Fields, "title" | "excerpt" | "body">> & { metaDescription?: string }) => void;
}) {
  const [busy, setBusy] = React.useState<TaskKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [style, setStyle] = React.useState<RewriteStyle>("plainer");

  async function run(kind: Exclude<TaskKey, "image-alt" | "blog-rewrite">) {
    setBusy(kind);
    setError(null);
    const r = await callAi(kind, { postId: fields.postId, title: fields.title, category: fields.category, body: fields.body, excerpt: fields.excerpt, sources: fields.sources });
    setBusy(null);
    if ("error" in r) setError(r.error);
    else setResult({ kind, output: r.output } as Result);
  }

  async function rewrite() {
    const selection = getSelection();
    if (!selection || selection.text.trim().length < 20) {
      setError("Select a sentence or paragraph in the post first, then press Rewrite.");
      return;
    }
    setBusy("blog-rewrite");
    setError(null);
    const r = await callAi("blog-rewrite", { postId: fields.postId, title: fields.title, passage: selection.text, style });
    setBusy(null);
    if ("error" in r) setError(r.error);
    else setResult({ kind: "blog-rewrite", output: r.output, selection });
  }

  const stillThere = (s: Selection) => fields.body.slice(s.start, s.end) === s.text;

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "var(--teal-deep)" }}>AI help</p>
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--navy-soft)" }}>Suggestions only. Never include anything about a client.</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="pill pill-ghost" style={small} disabled={!!busy} onClick={() => run("blog-titles")}>{busy === "blog-titles" ? "Thinking…" : "Suggest titles"}</button>
        <button type="button" className="pill pill-ghost" style={small} disabled={!!busy} onClick={() => run("blog-summary")}>{busy === "blog-summary" ? "Thinking…" : "Write the summary"}</button>
        <button type="button" className="pill pill-ghost" style={small} disabled={!!busy} onClick={() => run("blog-review")}>{busy === "blog-review" ? "Checking…" : "Check against our rules"}</button>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <select aria-label="How to rewrite" value={style} onChange={(e) => setStyle(e.target.value as RewriteStyle)} style={{ fontFamily: "inherit", fontSize: 12.5, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(31,58,95,0.18)" }}>
            {(Object.keys(REWRITE_STYLES) as RewriteStyle[]).map((k) => (
              <option key={k} value={k}>{REWRITE_STYLES[k].label}</option>
            ))}
          </select>
          {/* Pressing the button must not take the selection away from the post. */}
          <button type="button" className="pill pill-ghost" style={small} disabled={!!busy} onMouseDown={(e) => e.preventDefault()} onClick={rewrite}>
            {busy === "blog-rewrite" ? "Rewriting…" : "Rewrite selected text"}
          </button>
        </span>
      </div>

      {error && <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: "#a1421c" }}>{error}</p>}

      {result && (
        <div role="status" style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, lineHeight: 1.55 }}>
          {result.kind === "blog-titles" && (
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {result.output.options.map((o) => (
                <li key={o.title}>
                  <strong>{o.title}</strong> <span style={{ color: "var(--navy-soft)" }}>({o.title.length} characters) {o.why}</span>{" "}
                  <button type="button" style={useButton} onClick={() => onUse({ title: o.title })}>Use this</button>
                </li>
              ))}
            </ul>
          )}
          {result.kind === "blog-summary" && (
            <>
              <p style={{ margin: "0 0 6px" }}><strong>Summary:</strong> {result.output.summary}</p>
              <p style={{ margin: "0 0 8px" }}><strong>Search description ({result.output.searchDescription.length}):</strong> {result.output.searchDescription}</p>
              <button type="button" style={useButton} onClick={() => onUse({ excerpt: result.output.summary, metaDescription: result.output.searchDescription })}>Use both</button>
            </>
          )}
          {result.kind === "blog-review" && (
            <>
              <p style={{ margin: "0 0 8px" }}>{result.output.overall}</p>
              {result.output.issues.length === 0 ? (
                <p style={{ margin: 0, color: "var(--teal-deep)", fontWeight: 700 }}>Nothing to change was found. The reviewer still reads it in full.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.output.issues.map((x, n) => (
                    <li key={n}>
                      <strong style={{ color: x.severity === "must_fix" ? "#a1421c" : "#8a6d12" }}>{x.severity === "must_fix" ? "Must fix" : "Consider"}:</strong> {x.problem}
                      {x.quote && <span style={{ display: "block", color: "var(--navy-soft)", fontStyle: "italic" }}>&ldquo;{x.quote}&rdquo;</span>}
                      <span style={{ display: "block" }}>Suggestion: {x.suggestion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {result.kind === "blog-rewrite" && (
            <>
              <p style={{ margin: "0 0 6px", whiteSpace: "pre-wrap" }}>{result.output.rewritten}</p>
              <p style={{ margin: "0 0 8px", color: "var(--navy-soft)", fontSize: 12.5 }}>{result.output.note}</p>
              {stillThere(result.selection) ? (
                <button
                  type="button"
                  style={useButton}
                  onClick={() => {
                    const s = result.selection;
                    onUse({ body: fields.body.slice(0, s.start) + result.output.rewritten + fields.body.slice(s.end) });
                    setResult(null);
                  }}
                >
                  Replace the selected text
                </button>
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>That part of the post has changed since, so copy what you want from above.</span>
              )}
            </>
          )}
          <div style={{ marginTop: 10 }}>
            <button type="button" style={{ ...useButton, color: "var(--navy-soft)" }} onClick={() => setResult(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
