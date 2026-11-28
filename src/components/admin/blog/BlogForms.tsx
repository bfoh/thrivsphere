"use client";

import * as React from "react";
import { useActionState } from "react";
import { createPost, editorAction, reviewPost, schedulePost } from "@/app/actions/blog";
import { initialBlogState, type BlogFormState } from "@/lib/blog-state";
import { BlogBody } from "@/components/BlogBody";
import { BlogAssist } from "@/components/admin/ai/BlogAssist";
import {
  AUDIENCES,
  BLOG_CATEGORIES,
  LENGTHS,
  LIMITS,
  REVIEW_CHECKS,
  autoExcerpt,
  contentFindings,
  formatSources,
  parseSources,
  readingTime,
  reviewProblems,
  tidyPastedText,
  wordCount,
  type BlogContent,
  type BlogStatus,
} from "@/lib/blog-rules";

type Action = (prev: BlogFormState, fd: FormData) => Promise<BlogFormState>;

export const input: React.CSSProperties = { fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
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
    <span style={{ fontSize: 12, fontWeight: 700, color: value.length > limit ? "#a1421c" : "var(--navy-soft)" }}>
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

      <details style={{ border: "1px solid rgba(31,58,95,0.12)", borderRadius: 12, padding: "12px 16px" }}>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 800, color: "var(--navy)" }}>Plan the post (optional)</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
        <p style={{ ...hint, margin: 0 }}>
          A short brief helps whoever writes it, and the AI writing assistant. Never include anything about a real client.
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
        </div>
      </details>

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
  status,
  selfApprove,
  onWebsiteAsIs,
  minSchedule,
  aiOn = false,
}: {
  postId: string;
  versionId: string | null;
  slug: string;
  slugEditable: boolean;
  initial: BlogContent;
  status: BlogStatus;
  /** This person may approve the post themselves (the founder), so the editor offers Publish. */
  selfApprove: boolean;
  /** The saved version is the one on the website, so until something changes there's nothing to publish or review. */
  onWebsiteAsIs: boolean;
  /** The earliest date a post can be scheduled for, as YYYY-MM-DDTHH:MM. */
  minSchedule: string;
  /** AI help is shown once the business's AI key is set. */
  aiOn?: boolean;
}) {
  const { state, pending, onSubmit } = useBlogAction(editorAction);
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
  // Whether an AI suggestion was used since the last save; the version is marked so.
  const [aiUsed, setAiUsed] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [checks, setChecks] = React.useState<Record<string, boolean>>({});
  const [when, setWhen] = React.useState<"now" | "later">("now");
  const [tidied, setTidied] = React.useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  // After a successful save, what was sent is what's saved.
  const sent = React.useRef(start);
  const lastState = React.useRef(state);
  React.useEffect(() => {
    if (state !== lastState.current && (state.status === "ok" || state.saved)) {
      setSaved(sent.current);
      setAiUsed(false);
      if (state.status === "ok") {
        setPublishing(false);
        setChecks({});
      }
    }
    lastState.current = state;
  }, [state]);

  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Everything below is worked out from what's on screen, not from the last save.
  const parsedSources = parseSources(f.sources);
  const summaryFromBody = autoExcerpt(f.body);
  const content: BlogContent = {
    title: f.title,
    category: f.category,
    excerpt: f.excerpt.trim() || summaryFromBody,
    metaDescription: f.metaDescription || null,
    body: f.body,
    sources: parsedSources.ok ? parsedSources.sources : [],
    coverImage: f.coverImage || null,
    coverAlt: f.coverAlt || null,
  };
  const findings = contentFindings(content);
  const problems = reviewProblems(content);
  const words = wordCount(f.body);
  const tooLong =
    f.title.length > LIMITS.title ||
    f.excerpt.trim().length > LIMITS.excerpt ||
    f.metaDescription.trim().length > LIMITS.metaDescriptionMax ||
    f.coverAlt.trim().length > LIMITS.coverAlt ||
    !parsedSources.ok;
  const allTicked = REVIEW_CHECKS.every((c) => checks[c.key]);
  const waiting = status === "in_review" && !dirty;
  const archived = status === "archived";
  const nothingNew = onWebsiteAsIs && !dirty;

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

  // Text pasted from Word or Google Docs keeps its paragraphs and bullet points.
  function onBodyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const tidy = tidyPastedText(e.clipboardData.getData("text/plain"));
    if (tidy === null) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.focus();
    // insertText keeps the browser's undo working; the fallback sets the value directly.
    if (!document.execCommand("insertText", false, tidy)) {
      const { selectionStart: a, selectionEnd: b } = el;
      const next = el.value.slice(0, a) + tidy + el.value.slice(b);
      setF((prev) => ({ ...prev, body: next }));
      requestAnimationFrame(() => el.setSelectionRange(a + tidy.length, a + tidy.length));
    }
    setTidied(true);
  }

  const over = (len: number, max: number) => len > max && (
    <p role="alert" style={{ ...hint, color: "#a1421c", fontWeight: 700 }}>
      {len - max} character{len - max === 1 ? "" : "s"} too long. Shorten it to {max} or fewer.
    </p>
  );

  return (
    <form
      onSubmit={(e) => {
        sent.current = f;
        onSubmit(e);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* Pressing Enter in a box saves, and never publishes: the first submit button is the one Enter uses. */}
      <button type="submit" name="intent" value="save" hidden aria-hidden tabIndex={-1} />
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="expectedVersionId" value={versionId ?? ""} />
      <input type="hidden" name="coverImage" value={f.coverImage} />
      <input type="hidden" name="aiAssisted" value={aiUsed ? "1" : ""} />

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="e-title" style={lbl}>Title</label>
          <Count value={f.title} limit={LIMITS.title} />
        </div>
        <input id="e-title" name="title" value={f.title} onChange={set("title")} style={{ ...input, fontSize: 17, fontWeight: 700 }} />
        {f.title.length > LIMITS.title
          ? over(f.title.length, LIMITS.title)
          : f.title.length > LIMITS.titleSearch && (
              <p style={hint}>Fine to save. Search engines show about the first {LIMITS.titleSearch} characters, so put the key words first.</p>
            )}
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
            {words} words · {readingTime(f.body)}
          </span>
        </div>
        <textarea
          ref={bodyRef}
          id="e-body"
          name="body"
          aria-label="Post body"
          aria-describedby="e-body-hint"
          value={f.body}
          onChange={set("body")}
          onPaste={onBodyPaste}
          rows={26}
          placeholder="Write here, or paste the article from Word or Google Docs."
          style={{ ...input, marginTop: 8, resize: "vertical", lineHeight: 1.65, display: tab === "write" ? "block" : "none" }}
        />
        {tab === "preview" && (
          <div style={{ marginTop: 8, border: "1px solid rgba(31,58,95,0.12)", borderRadius: 12, padding: "20px 24px", background: "#fff", minHeight: 300 }}>
            {f.body.trim() ? <BlogBody markdown={f.body} /> : <p style={{ color: "var(--navy-soft)" }}>Nothing written yet.</p>}
          </div>
        )}
        <p id="e-body-hint" style={hint}>
          {tidied
            ? "Pasted text was spaced into paragraphs and its bullet points kept. Check it under Preview."
            : "Pasting from Word or Google Docs keeps your paragraphs and bullet points. Check how it looks under Preview."}
          {f.body.length > LIMITS.body && (
            <strong style={{ color: "#a1421c" }}> The post is longer than a post can hold ({f.body.length.toLocaleString("en-GB")} of {LIMITS.body.toLocaleString("en-GB")} characters). Split it into two.</strong>
          )}
        </p>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="e-excerpt" style={lbl}>Summary (optional)</label>
          {f.excerpt.trim() && <Count value={f.excerpt.trim()} limit={LIMITS.excerpt} />}
        </div>
        <textarea
          id="e-excerpt"
          name="excerpt"
          value={f.excerpt}
          onChange={set("excerpt")}
          rows={2}
          placeholder={summaryFromBody || "Leave empty to use the opening of the post."}
          style={{ ...input, resize: "vertical" }}
        />
        {over(f.excerpt.trim().length, LIMITS.excerpt) || (
          <p style={hint}>
            Shown on the blog page under the title, up to {LIMITS.excerpt} characters.
            {f.excerpt.trim() ? "" : " Left empty, the opening of the post is used, as shown in the box."}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="e-sources" style={lbl}>Sources and references (optional)</label>
        <textarea
          id="e-sources"
          name="sources"
          value={f.sources}
          onChange={set("sources")}
          rows={4}
          placeholder={"NHS (2025) Breathing exercises for stress. Available at: https://www.nhs.uk/…\nClance, P. R. and Imes, S. A. (1978) The impostor phenomenon in high achieving women."}
          style={{ ...input, resize: "vertical", fontSize: 13 }}
        />
        <p style={hint}>
          One per line, written however you usually write references. A web address in a line becomes a link. Listed under the post;
          any figure or fact in the post should come from one of these.
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
          <textarea id="e-alt" name="coverAlt" value={f.coverAlt} onChange={set("coverAlt")} rows={3} disabled={!f.coverImage} style={{ ...input, resize: "vertical" }} />
          {over(f.coverAlt.trim().length, LIMITS.coverAlt) || (
            <p style={hint}>Read aloud to people using screen readers, e.g. &quot;A cup of tea on a windowsill in the rain&quot;.</p>
          )}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="e-meta" style={lbl}>Search engine description (optional)</label>
          {f.metaDescription.trim() && <Count value={f.metaDescription.trim()} limit={LIMITS.metaDescriptionMax} />}
        </div>
        <textarea id="e-meta" name="metaDescription" value={f.metaDescription} onChange={set("metaDescription")} rows={2} placeholder="Uses the summary if left empty" style={{ ...input, resize: "vertical" }} />
        {over(f.metaDescription.trim().length, LIMITS.metaDescriptionMax) || (
          <p style={hint}>Search engines show about the first {LIMITS.metaDescription} characters.</p>
        )}
      </div>

      {aiOn && (
        <BlogAssist
          fields={{ postId, title: f.title, category: f.category, excerpt: f.excerpt, body: f.body, sources: f.sources }}
          getSelection={() => {
            const el = bodyRef.current;
            if (!el || el.selectionStart === el.selectionEnd) return null;
            return { start: el.selectionStart, end: el.selectionEnd, text: f.body.slice(el.selectionStart, el.selectionEnd) };
          }}
          onUse={(patch) => {
            setF((prev) => ({ ...prev, ...patch }));
            setAiUsed(true);
          }}
        />
      )}

      {findings.length > 0 && (
        <div style={{ border: "1px solid rgba(138,109,18,0.35)", background: "rgba(212,175,55,0.08)", borderRadius: 12, padding: "12px 16px" }}>
          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: "#8a6d12" }}>Things to check</p>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--navy-soft)" }}>Suggestions only. None of these stop you saving.</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>
            {findings.map((x) => (
              <li key={x.message}>{x.message}</li>
            ))}
          </ul>
        </div>
      )}

      {publishing && selfApprove && (
        <fieldset style={{ border: "2px solid rgba(212,175,55,0.55)", borderRadius: 14, padding: "16px 18px 18px", margin: 0, display: "flex", flexDirection: "column", gap: 12, background: "#fffdf6" }}>
          <legend style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)", padding: "0 6px" }}>Publish this post</legend>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>
            This saves what&apos;s on screen and approves it as you. First{" "}
            <button type="button" style={{ ...linkButton, color: "var(--teal-deep)", fontSize: 13.5 }} onClick={() => { setTab("preview"); bodyRef.current?.closest("form")?.scrollIntoView({ behavior: "smooth" }); }}>
              read it under Preview
            </button>
            , then confirm that:
          </p>
          {REVIEW_CHECKS.map((c) => (
            <label key={c.key} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, lineHeight: 1.45, color: "var(--ink)", cursor: "pointer" }}>
              <input type="checkbox" name={`check_${c.key}`} checked={!!checks[c.key]} onChange={(e) => setChecks((p) => ({ ...p, [c.key]: e.target.checked }))} style={{ marginTop: 3 }} />
              {c.label}
            </label>
          ))}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", fontSize: 14, color: "var(--ink)" }}>
            <label style={{ display: "flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
              <input type="radio" name="publishWhen" value="now" checked={when === "now"} onChange={() => setWhen("now")} /> Now
            </label>
            <label style={{ display: "flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
              <input type="radio" name="publishWhen" value="later" checked={when === "later"} onChange={() => setWhen("later")} /> On a date (UK time)
            </label>
            {when === "later" && <input type="datetime-local" name="when" min={minSchedule} required aria-label="Publish on" style={{ ...input, width: "auto" }} />}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              name="intent"
              value="publish"
              className="pill pill-gold"
              disabled={pending || !allTicked || problems.length > 0 || tooLong}
              style={{ padding: "10px 22px", fontSize: 14, opacity: pending || !allTicked || problems.length > 0 || tooLong ? 0.55 : 1 }}
            >
              {pending ? "Working…" : when === "now" ? "Save and publish now" : "Save and schedule"}
            </button>
            <button type="button" style={{ ...linkButton, fontSize: 13, color: "var(--navy-soft)" }} onClick={() => setPublishing(false)}>
              Cancel
            </button>
            {!allTicked && <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>Tick all four to publish.</span>}
          </div>
        </fieldset>
      )}

      <div style={{ position: "sticky", bottom: 0, background: "rgba(255,255,255,0.97)", padding: "12px 0", borderTop: "1px solid rgba(31,58,95,0.08)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button name="intent" value="save" className={`pill ${archived ? "pill-teal" : "pill-ghost"}`} disabled={pending || tooLong} style={{ padding: "10px 20px", fontSize: 14, opacity: pending || tooLong ? 0.6 : 1 }}>
            {pending ? "Saving…" : "Save draft"}
          </button>
          {!archived && !nothingNew && selfApprove && !publishing && (
            <button type="button" className="pill pill-gold" disabled={pending || problems.length > 0 || tooLong} onClick={() => setPublishing(true)} style={{ padding: "10px 22px", fontSize: 14, opacity: pending || problems.length > 0 || tooLong ? 0.55 : 1 }}>
              Publish…
            </button>
          )}
          {!archived && !nothingNew && !selfApprove && !waiting && (
            <button name="intent" value="review" className="pill pill-teal" disabled={pending || problems.length > 0 || tooLong} style={{ padding: "10px 22px", fontSize: 14, opacity: pending || problems.length > 0 || tooLong ? 0.55 : 1 }}>
              {pending ? "Sending…" : "Save and send for review"}
            </button>
          )}
          <span style={{ fontSize: 12.5, fontWeight: 700, color: dirty ? "#8a6d12" : "var(--navy-soft)" }}>
            {dirty ? "Unsaved changes" : waiting ? "Saved · waiting for review" : nothingNew ? "Saved · this is what's on the website" : "All changes saved"}
          </span>
        </div>
        {!archived && !nothingNew && problems.length > 0 && (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--navy-soft)" }}>
            To {selfApprove ? "publish" : "send it for review"}: {problems.join(" ")}
            {words > 0 && words < LIMITS.minWordsForReview ? ` (${words} so far.)` : ""} You can save a draft at any time.
          </p>
        )}
        {tooLong && <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#a1421c" }}>Something above is too long; it&apos;s marked in red.</p>}
        <Result state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ review */

export function ReviewForm({ postId, versionId, offerPublish = false }: { postId: string; versionId: string; offerPublish?: boolean }) {
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
        {offerPublish && (
          <button name="decision" value="approve_publish" className="pill pill-gold" disabled={pending || !all} style={{ padding: "10px 22px", fontSize: 14, opacity: pending || !all ? 0.55 : 1 }}>
            Approve and publish now
          </button>
        )}
        <button name="decision" value="approved" className={offerPublish ? "pill pill-ghost" : "pill pill-gold"} disabled={pending || !all} style={{ padding: "10px 22px", fontSize: 14, opacity: pending || !all ? 0.55 : 1 }}>
          {offerPublish ? "Approve only" : "Approve this version"}
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
