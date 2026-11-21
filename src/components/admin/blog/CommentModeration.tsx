"use client";

import * as React from "react";
import { useActionState } from "react";
import { moderateComment } from "@/app/actions/blog-comments";
import { initialBlogState } from "@/lib/blog-state";
import { Result } from "./BlogForms";

/** Approve, hide or delete one comment. Deleting asks once more. */
export function CommentModeration({ commentId, status }: { commentId: string; status: "pending" | "approved" | "hidden" }) {
  const [state, dispatch, pending] = useActionState(moderateComment, initialBlogState);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const run = (decision: string) => {
    const fd = new FormData();
    fd.set("commentId", commentId);
    fd.set("decision", decision);
    React.startTransition(() => dispatch(fd));
  };
  if (state.status === "ok") return <Result state={state} />;
  const btn: React.CSSProperties = { padding: "7px 14px", fontSize: 12.5, opacity: pending ? 0.6 : 1 };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {status !== "approved" && (
          <button type="button" className="pill pill-teal" disabled={pending} style={btn} onClick={() => run("approve")}>
            Approve
          </button>
        )}
        {status !== "hidden" && (
          <button type="button" className="pill pill-ghost" disabled={pending} style={btn} onClick={() => run("hide")}>
            {status === "approved" ? "Hide from the website" : "Don't publish"}
          </button>
        )}
        {confirmDelete ? (
          <>
            <button type="button" className="pill" disabled={pending} style={{ ...btn, background: "#a1421c", color: "#fff", border: "none" }} onClick={() => run("delete")}>
              Yes, delete it and the email
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: "var(--navy-soft)", textDecoration: "underline" }}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#a1421c", textDecoration: "underline" }}>
            Delete
          </button>
        )}
      </div>
      <Result state={state} />
    </div>
  );
}
