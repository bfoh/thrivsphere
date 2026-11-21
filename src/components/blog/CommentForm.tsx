"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { submitBlogComment } from "@/app/actions/blog-comments";
import { initialCommentState } from "@/lib/blog-comment-state";
import { COMMENT_LIMITS } from "@/lib/blog-comment-rules";
import { Checkbox, FormAlert, Honeypot, TextField, errorStyle, inputStyle, labelStyle } from "@/components/EnquiryFields";

/** Leave a comment. It waits for approval; the email is never shown. */
export function CommentForm({ slug }: { slug: string }) {
  const [state, dispatch, pending] = useActionState(submitBlogComment, initialCommentState);
  const [key, setKey] = React.useState(0);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    React.startTransition(() => dispatch(fd));
  };

  if (state.status === "ok") {
    return (
      <div role="status" style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(79,168,168,0.1)", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)" }}>
        {state.message}
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={() => setKey((k) => k + 1)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, color: "var(--teal-deep)", textDecoration: "underline", fontSize: 13.5 }}>
            {/* Remounting resets the form. */}
            Write another comment
          </button>
        </div>
      </div>
    );
  }

  const v = state.values;
  const e = state.errors ?? {};
  return (
    <form key={key} onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }} noValidate>
      <input type="hidden" name="slug" value={slug} />
      <Honeypot />
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", padding: "11px 14px", borderRadius: 10, background: "rgba(31,58,95,0.05)" }}>
        Comments aren&apos;t monitored around the clock, so please don&apos;t use them to ask for urgent help. If you need
        support now, call Samaritans free on <a href="tel:116123" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>116 123</a>, or{" "}
        <a href="tel:999" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>999</a> in an emergency.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <TextField label="First name or nickname" name="name" autoComplete="given-name" error={e.name} defaultValue={v?.name} />
        <TextField label="Email (never shown)" name="email" type="email" autoComplete="email" error={e.email} defaultValue={v?.email} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="comment-body" style={labelStyle}>Your comment</label>
        <textarea
          id="comment-body"
          name="body"
          rows={5}
          maxLength={COMMENT_LIMITS.body}
          defaultValue={v?.body}
          aria-invalid={e.body ? true : undefined}
          aria-describedby={e.body ? "comment-body-error" : undefined}
          style={{ ...inputStyle, resize: "vertical", borderColor: e.body ? "#c86b52" : "rgba(31,58,95,0.18)" }}
        />
        {e.body && <p id="comment-body-error" style={errorStyle}>{e.body}</p>}
      </div>
      <Checkbox name="agreed" error={e.agreed}>
        I understand my comment and first name will be public once approved, and I haven&apos;t included details about
        myself or anyone else that I wouldn&apos;t want others to read. My email is used only if ThriveSphere needs to
        contact me about my comment (see the{" "}
        <Link href="/privacy" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>privacy policy</Link>).
      </Checkbox>
      {state.status === "error" && <FormAlert message={state.message} />}
      <div>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "11px 22px", fontSize: 14, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Sending…" : "Send comment"}
        </button>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--navy-soft)" }}>Comments appear once our team has approved them.</p>
      </div>
    </form>
  );
}
