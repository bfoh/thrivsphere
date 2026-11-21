"use client";

import * as React from "react";
import { useActionState } from "react";
import { createPost, reviewPost, saveVersion, schedulePost } from "@/app/actions/blog";
import { initialBlogState, type BlogFormState } from "@/lib/blog-state";
import { BlogBody } from "@/components/BlogBody";
import {
  AUDIENCES,
  BLOG_CATEGORIES,
  LENGTHS,
  LIMITS,
  REVIEW_CHECKS,
  contentFindings,
  formatSources,
  parseSources,
  readingTime,
  wordCount,
  type BlogContent,
} from "@/lib/blog-rules";

type Action = (prev: BlogFormState, fd: FormData) => Promise<BlogFormState>;

export const input: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14.5,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  color: "var(--ink)",
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 };
const hint: React.CSSProperties = { margin: "5px 0 0", fontSize: 12, color: "var(--navy-soft)", lineHeight: 1.45 };
const linkButton: React.CSSProperties = { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, textDecoration: "underline" };

/**
 * Submit through a transition rather than the form's `action`, so what was
 * typed stays in the form when the server says no. The button pressed is
 * passed on, for forms with more than one.
 */
function useBlogAction(fn: Action) {
  const [state, dispatch, pending] = useActionState(fn, initialBlogState);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    React.startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}

export function Result({ state }: { state: BlogFormState }) {
  if (state.status === "idle") return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: state.status === "error" ? "#a1421c" : "var(--teal-deep)" }}>
      {state.message}
    </p>
  );
}

function Count({ value, limit }: { value: string; limit: number }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, color: value.length > limit ? "#a1421c" : "var(--navy-soft)" }}>
      {value.length}/{limit}
    </span>
  );
}

/* ---------------------------------------------------------------- new post */

export function NewPostForm() {
  const { state, pending, onSubmit } = useBlogAction(createPost);
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label htmlFor="n-title" style={lbl}>Working title</label>
        <input id="n-title" name="title" required maxLength={LIMITS.title} style={input} placeholder="e.g. Five gentle ways to steady a racing mind" />
        <p style={hint}>You can change it, and everything else, before it goes for review.</p>
      </div>
      <div>
        <label htmlFor="n-category" style={lbl}>Category</label>
        <select id="n-category" name="category" style={input} defaultValue={BLOG_CATEGORIES[0]}>
          {BLOG_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <fieldset style={{ border: "1px solid rgba(31,58,95,0.12)", borderRadius: 12, padding: "14px 16px 16px", margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <legend style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", padding: "0 6px" }}>Plan the post (optional)</legend>
        <p style={{ ...hint, margin: 0 }}>
          A short brief helps whoever writes it, and the AI writing assistant when it arrives. Never include anything about a real client.
        </p>
        <div>
          <label htmlFor="n-topic" style={lbl}>What is it about?</label>
          <input id="n-topic" name="topic" maxLength={200} style={input} placeholder="e.g. Coping with the winter months" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
          <div>
            <label htmlFor="n-audience" style={lbl}>Who is it for?</label>
            <select id="n-audience" name="audience" style={input} defaultValue="general">
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="n-length" style={lbl}>Length</label>
            <select id="n-length" name="length" style={input} defaultValue="standard">
              {LENGTHS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="n-takeaway" style={lbl}>The one thing a reader should take away</label>
          <input id="n-takeaway" name="takeaway" maxLength={300} style={input} />
        </div>
        <div>
          <label htmlFor="n-notes" style={lbl}>Notes</label>
          <textarea id="n-notes" name="notes" maxLength={1500} rows={3} style={{ ...input, resize: "vertical" }} />
        </div>
      </fieldset>

      <div>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 22px", fontSize: 14, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Creating…" : "Create the draft"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ editor */

const MARKDOWN_HELP: [string, string][] = [
  ["## A heading", "Section heading"],
  ["### A smaller heading", "Sub-heading"],
  ["**bold** and *italic*", "Emphasis"],
  ["- a point", "Bulleted list (one per line)"],
  ["1. a step", "Numbered list"],
  ["[NHS advice](https://www.nhs.uk/…)", "Link"],
  ["> a quotation", "Quote"],
];

export function PostEditor({
  postId,
  versionId,
  slug,
  slugEditable,
  initial,
}: {
  postId: string;
  versionId: string | null;
  slug: string;
  slugEditable: boolean;
  initial: BlogContent;
}) {
  const { state, pending, onSubmit } = useBlogAction(saveVersion);
  const start = React.useMemo(
    () => ({
      title: initial.title,
      slug,
      category: initial.category,
      excerpt: initial.excerpt,
      metaDescription: initial.metaDescription ?? "",
      body: initial.body,
      sources: formatSources(initial.sources),
      coverImage: initial.coverImage ?? "",
      coverAlt: initial.coverAlt ?? "",
    }),
    [initial, slug]
  );
  const [f, setF] = React.useState(start);
  const [saved, setSaved] = React.useState(start);
  const [tab, setTab] = React.useState<"write" | "preview">("write");
  const [upload, setUpload] = React.useState<{ busy: boolean; error: string }>({ busy: false, error: "" });
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  // After a successful save, what was sent is what's saved.
  const sent = React.useRef(start);
  const lastState = React.useRef(state);
  React.useEffect(() => {
    if (state !== lastState.current && state.status === "ok") setSaved(sent.current);
    lastState.current = state;
  }, [state]);

  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const parsedSources = parseSources(f.sources);
  const findings = contentFindings({
    title: f.title,
    category: f.category,
    excerpt: f.excerpt,
    metaDescription: f.metaDescription || null,
    body: f.body,
    sources: parsedSources.ok ? parsedSources.sources : [],
    coverImage: f.coverImage || null,
    coverAlt: f.coverAlt || null,
  });

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUpload({ busy: true, error: "" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/cover", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { name?: string; error?: string };
      if (!res.ok || !json.name) throw new Error(json.error || "The upload failed. Please try again.");
      setF((prev) => ({ ...prev, coverImage: json.name! }));
      setUpload({ busy: false, error: "" });
    } catch (err) {
      setUpload({ busy: false, error: err instanceof Error ? err.message : "The upload failed." });
    }
  }

  return (
    <form
      onSubmit={(e) => {
        sent.current = f;
        onSubmit(e);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="expectedVersionId" value={versionId ?? ""} />
      <input type="hidden" name="coverImage" value={f.coverImage} />

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="e-title" style={lbl}>Title</label>
          <Count value={f.title} limit={LIMITS.titleSearch} />
        </div>
        <input id="e-title" name="title" value={f.title} onChange={set("title")} maxLength={LIMITS.title} style={{ ...input, fontSize: 17, fontWeight: 700 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <div>
          <label htmlFor="e-category" style={lbl}>Category</label>
          <select id="e-category" name="category" value={f.category} onChange={set("category")} style={input}>
            {BLOG_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="e-slug" style={lbl}>Web address</label>
          {slugEditable ? (
            <input id="e-slug" name="slug" value={f.slug} onChange={set("slug")} maxLength={80} style={input} />
          ) : (
            <input id="e-slug" value={f.slug} readOnly style={{ ...input, background: "#f4f6f7", color: "var(--navy-soft)" }} />
          )}
          <p style={hint}>thrivsphere.org/blog/{f.slug}{slugEditable ? "" : " (fixed once a post has been on the website)"}</p>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="e-excerpt" style={lbl}>Summary</label>
          <Count value={f.excerpt} limit={LIMITS.excerpt} />
        </div>
        <textarea id="e-excerpt" name="excerpt" value={f.excerpt} onChange={set("excerpt")} rows={2} maxLength={LIMITS.excerpt} style={{ ...input, resize: "vertical" }} />
        <p style={hint}>One or two sentences, shown on the blog page under the title.</p>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6 }} role="tablist" aria-label="Body">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`pill ${tab === t ? "pill-teal" : "pill-ghost"}`}
                style={{ padding: "6px 14px", fontSize: 12.5 }}
              >
                {t === "write" ? "Write" : "Preview"}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--navy-soft)", fontWeight: 700 }}>
            {wordCount(f.body)} words · {readingTime(f.body)}
          </span>
        </div>
        <textarea
          ref={bodyRef}
          id="e-body"
          name="body"
          aria-label="Post body"
          value={f.body}
          onChange={set("body")}
          rows={26}
          style={{ ...input, marginTop: 8, resize: "vertical", lineHeight: 1.65, display: tab === "write" ? "block" : "none" }}
        />
        {tab === "preview" && (
          <div style={{ marginTop: 8, border: "1px solid rgba(31,58,95,0.12)", borderRadius: 12, padding: "20px 24px", background: "#fff", minHeight: 300 }}>
            {f.body.trim() ? <BlogBody markdown={f.body} /> : <p style={{ color: "var(--navy-soft)" }}>Nothing written yet.</p>}
          </div>
        )}
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--teal-deep)" }}>How to format the text</summary>
          <table style={{ marginTop: 8, fontSize: 12.5, borderCollapse: "collapse" }}>
            <tbody>
              {MARKDOWN_HELP.map(([code, what]) => (
                <tr key={code}>
                  <td style={{ padding: "3px 14px 3px 0" }}>
                    <code style={{ background: "rgba(31,58,95,0.06)", padding: "1px 6px", borderRadius: 5 }}>{code}</code>
                  </td>
                  <td style={{ color: "var(--navy-soft)" }}>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={hint}>Leave an empty line between paragraphs. The crisis information and the booking box are added under every post automatically.</p>
        </details>
      </div>

      <div>
        <label htmlFor="e-sources" style={lbl}>Sources</label>
        <textarea
          id="e-sources"
          name="sources"
          value={f.sources}
          onChange={set("sources")}
          rows={4}
          placeholder={"Breathing exercises for stress | NHS | https://www.nhs.uk/… | 2026-11-21"}
          style={{ ...input, resize: "vertical", fontSize: 13 }}
        />
        <p style={hint}>
          One per line: title | publisher | web address | date read (optional). Listed under the post. Any figure or fact in the
          post should come from one of these.
        </p>
        {!parsedSources.ok && <p role="alert" style={{ ...hint, color: "#a1421c", fontWeight: 700 }}>{parsedSources.message}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <div>
          <span style={lbl}>Cover photo</span>
          {f.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/admin/blog/images/${f.coverImage}`} alt={f.coverAlt} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, display: "block" }} />
          ) : (
            <p style={{ ...hint, marginTop: 0 }}>Optional. Use a photo you have the right to use, and never one of a client.</p>
          )}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <label className="pill pill-ghost" style={{ padding: "7px 14px", fontSize: 12.5, cursor: "pointer" }}>
              {upload.busy ? "Uploading…" : f.coverImage ? "Replace photo" : "Upload a photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onCover} disabled={upload.busy} style={{ display: "none" }} />
            </label>
            {f.coverImage && (
              <button type="button" style={{ ...linkButton, color: "#a1421c", fontSize: 12.5 }} onClick={() => setF((p) => ({ ...p, coverImage: "", coverAlt: "" }))}>
                Remove
              </button>
            )}
          </div>
          {upload.error && <p role="alert" style={{ ...hint, color: "#a1421c", fontWeight: 700 }}>{upload.error}</p>}
          <p style={hint}>JPEG, PNG or WebP, under 4 MB. Save the post to keep it.</p>
        </div>
        <div>
          <label htmlFor="e-alt" style={lbl}>Describe the photo</label>
          <textarea id="e-alt" name="coverAlt" value={f.coverAlt} onChange={set("coverAlt")} rows={3} maxLength={LIMITS.coverAlt} disabled={!f.coverImage} style={{ ...input, resize: "vertical" }} />
          <p style={hint}>Read aloud to people using screen readers, e.g. &quot;A cup of tea on a windowsill in the rain&quot;.</p>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="e-meta" style={lbl}>Search engine description (optional)</label>
          <Count value={f.metaDescription || f.excerpt} limit={LIMITS.metaDescription} />
        </div>
        <textarea id="e-meta" name="metaDescription" value={f.metaDescription} onChange={set("metaDescription")} rows={2} maxLength={200} placeholder="Uses the summary if left empty" style={{ ...input, resize: "vertical" }} />
      </div>

      {findings.length > 0 && (
        <div style={{ border: "1px solid rgba(138,109,18,0.35)", background: "rgba(212,175,55,0.08)", borderRadius: 12, padding: "12px 16px" }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "#8a6d12" }}>Things to check</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>
            {findings.map((x) => (
              <li key={x.message}>{x.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ position: "sticky", bottom: 0, background: "rgba(255,255,255,0.96)", padding: "12px 0", borderTop: "1px solid rgba(31,58,95,0.08)", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill pill-teal" disabled={pending || !parsedSources.ok} style={{ padding: "10px 22px", fontSize: 14, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : "Save"}
        </button>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: dirty ? "#8a6d12" : "var(--navy-soft)" }}>
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <Result state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ review */

export function ReviewForm({ postId, versionId }: { postId: string; versionId: string }) {
  const { state, pending, onSubmit } = useBlogAction(reviewPost);
  const [checks, setChecks] = React.useState<Record<string, boolean>>({});
  const all = REVIEW_CHECKS.every((c) => checks[c.key]);
  if (state.status === "ok") return <Result state={state} />;
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="versionId" value={versionId} />
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ ...lbl, marginBottom: 8 }}>To approve, confirm that:</legend>
        {REVIEW_CHECKS.map((c) => (
          <label key={c.key} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45, color: "var(--ink)", cursor: "pointer" }}>
            <input
              type="checkbox"
              name={`check_${c.key}`}
              checked={!!checks[c.key]}
              onChange={(e) => setChecks((p) => ({ ...p, [c.key]: e.target.checked }))}
              style={{ marginTop: 3 }}
            />
            {c.label}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="r-comment" style={lbl}>Comment (needed to request changes)</label>
        <textarea id="r-comment" name="comment" rows={3} maxLength={LIMITS.comment} style={{ ...input, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button name="decision" value="approved" className="pill pill-gold" disabled={pending || !all} style={{ padding: "10px 22px", fontSize: 14, opacity: pending || !all ? 0.55 : 1 }}>
          Approve this version
        </button>
        <button name="decision" value="changes_requested" className="pill pill-ghost" disabled={pending} style={{ padding: "10px 22px", fontSize: 14, color: "#a1421c" }}>
          Request changes
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

/* ----------------------------------------------------------------- actions */

/** One button that runs an action on the post, asking once more first if `confirm` is given. */
export function PostActionButton({
  action,
  postId,
  label,
  confirm,
  tone = "teal",
}: {
  action: Action;
  postId: string;
  label: string;
  confirm?: string;
  tone?: "teal" | "gold" | "ghost" | "danger";
}) {
  const { state, pending, onSubmit } = useBlogAction(action);
  const [armed, setArmed] = React.useState(false);
  const cls = tone === "gold" ? "pill pill-gold" : tone === "teal" ? "pill pill-teal" : "pill pill-ghost";
  const color = tone === "danger" ? "#a1421c" : undefined;
  return (
    <form onSubmit={onSubmit} style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <input type="hidden" name="postId" value={postId} />
      {confirm && !armed ? (
        <button type="button" className={cls} onClick={() => setArmed(true)} style={{ padding: "9px 18px", fontSize: 13, color }}>
          {label}
        </button>
      ) : (
        <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {confirm && <span style={{ fontSize: 13, color: "var(--ink)" }}>{confirm}</span>}
          <button className={cls} disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1, color }}>
            {pending ? "Working…" : confirm ? `Yes, ${label.toLowerCase()}` : label}
          </button>
          {confirm && (
            <button type="button" style={{ ...linkButton, fontSize: 12.5, color: "var(--navy-soft)" }} onClick={() => setArmed(false)}>
              Cancel
            </button>
          )}
        </span>
      )}
      <Result state={state} />
    </form>
  );
}

export function ScheduleForm({ postId, min }: { postId: string; min: string }) {
  const { state, pending, onSubmit } = useBlogAction(schedulePost);
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <input type="hidden" name="postId" value={postId} />
      <div>
        <label htmlFor="s-when" style={lbl}>Or publish on (UK time)</label>
        <input id="s-when" type="datetime-local" name="when" min={min} required style={{ ...input, width: "auto" }} />
      </div>
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Scheduling…" : "Schedule"}
      </button>
      <div style={{ flexBasis: "100%" }}>
        <Result state={state} />
      </div>
    </form>
  );
}
