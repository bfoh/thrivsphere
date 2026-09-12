"use client";

import * as React from "react";
import { useActionState } from "react";
import { addSessionNote } from "@/app/actions/notes";
import { initialNoteState } from "@/lib/note-state";

const input: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)",
  background: "#fff",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  resize: "vertical",
};

/**
 * Add a session note.
 *
 * The reminder about append-only is shown to the author before they write,
 * not after — it changes how carefully people word things.
 */
export function NoteForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(addSessionNote, initialNoteState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "16px 18px",
        borderRadius: 12,
        background: "rgba(79,168,168,0.07)",
        border: "1px solid rgba(79,168,168,0.25)",
      }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <label htmlFor="body" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--navy)" }}>
        Add a session note
      </label>
      <textarea id="body" name="body" rows={4} placeholder="What happened, what was discussed, how the person presented." style={input} />
      <input name="agreedActions" placeholder="Agreed actions (optional)" style={input} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          className="pill pill-teal"
          disabled={pending}
          style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Saving…" : "Save note"}
        </button>
        <span style={{ fontSize: 12, color: "var(--navy-soft)", lineHeight: 1.5 }}>
          Notes cannot be edited or deleted once saved — corrections are added as amendments.
        </span>
      </div>

      {state.status !== "idle" && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c",
          }}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
