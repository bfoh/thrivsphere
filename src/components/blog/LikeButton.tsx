"use client";

import * as React from "react";
import { likesLabel } from "@/lib/blog-comment-rules";

/**
 * Like a post. The count is read when the page opens, so the article itself
 * can stay cached; pressing again takes the like back.
 */
export function LikeButton({ slug }: { slug: string }) {
  const [state, setState] = React.useState<{ count: number; liked: boolean } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let live = true;
    fetch(`/api/blog/${slug}/like`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && j && setState({ count: j.count, liked: j.liked }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");
    const before = state;
    if (state) setState({ count: state.count + (state.liked ? -1 : 1), liked: !state.liked });
    try {
      const r = await fetch(`/api/blog/${slug}/like`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "That didn't work. Please try again.");
      setState({ count: j.count, liked: j.liked });
    } catch (err) {
      setState(before);
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  const liked = state?.liked ?? false;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !state}
        aria-pressed={liked}
        className={`pill ${liked ? "pill-teal" : "pill-ghost"}`}
        style={{ padding: "9px 18px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8, opacity: state ? 1 : 0.6 }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
          <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" />
        </svg>
        {liked ? "Liked" : "Like"}
      </button>
      <span style={{ fontSize: 13.5, color: "var(--navy-soft)" }} aria-live="polite">
        {state ? likesLabel(state.count) : ""}
      </span>
      {error && (
        <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: "#a1421c" }}>
          {error}
        </span>
      )}
    </div>
  );
}
