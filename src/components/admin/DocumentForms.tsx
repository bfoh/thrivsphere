"use client";

import * as React from "react";
import { useActionState } from "react";
import { deleteDocument, uploadDocument } from "@/app/actions/documents";
import { initialDocumentState } from "@/lib/document-state";
import { DOCUMENT_CATEGORIES, MAX_UPLOAD_BYTES } from "@/lib/upload-rules";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", boxSizing: "border-box",
};

export function UploadDocumentForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(uploadDocument, initialDocumentState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      style={{
        display: "flex", flexDirection: "column", gap: 11, padding: "16px 18px",
        borderRadius: 12, background: "rgba(79,168,168,0.07)", border: "1px solid rgba(79,168,168,0.25)",
        marginBottom: 16,
      }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" name="file" style={{ ...input, flex: "1 1 240px" }} />
        <select name="category" defaultValue="correspondence" style={input}>
          {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>

      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "var(--ink)" }}>
        <input type="checkbox" name="visibleToClient" style={{ marginTop: 3 }} />
        <span>Share this with the client in their portal.</span>
      </label>

      <p style={{ margin: 0, fontSize: 11.5, color: "var(--navy-soft)", lineHeight: 1.5 }}>
        PDF, Word, JPG, PNG, WEBP, HEIC or TXT, up to {Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.
        Stored privately — never reachable by a public link.
      </p>

      {state.status !== "idle" && (
        <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function DeleteDocumentButton({ documentId, clientId }: { documentId: string; clientId: string }) {
  const [state, action, pending] = useActionState(deleteDocument, initialDocumentState);
  return (
    <form action={action} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="clientId" value={clientId} />
      <button
        disabled={pending}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#a1421c", padding: 0 }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.status === "error" && <span style={{ fontSize: 12, color: "#a1421c" }}>{state.message}</span>}
    </form>
  );
}
