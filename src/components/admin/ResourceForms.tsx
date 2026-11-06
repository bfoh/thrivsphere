"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  amendSupervisionRecord,
  deleteSupervisionDraft,
  setPreparationTaskDone,
} from "@/app/actions/supervision";
import { assignWorksheet, markWorksheetReviewed, withdrawWorksheet } from "@/app/actions/worksheets";
import { initialResourceState, type ResourceFormState } from "@/lib/resources-state";
import { errorStyle, hintStyle, inputStyle, labelStyle, statusStyle } from "@/components/forms/styles";

function Status({ state }: { state: ResourceFormState }) {
  if (state.status === "idle") return null;
  return (
    <p role="status" style={{ ...statusStyle(state.status === "ok"), marginTop: 8 }}>
      {state.message}
    </p>
  );
}

const panel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "16px 18px",
  borderRadius: 12,
  background: "rgba(79,168,168,0.07)",
  border: "1px solid rgba(79,168,168,0.25)",
};

/** Set a worksheet from the library for this client. */
export function AssignWorksheetForm({
  clientId,
  library,
  sessions,
}: {
  clientId: string;
  library: { key: string; label: string }[];
  sessions: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(assignWorksheet, initialResourceState);
  const [open, setOpen] = React.useState(false);
  const fe = state.fieldErrors ?? {};
  // Close once it has been set; the new worksheet appears in the list below.
  const [seen, setSeen] = React.useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "ok") setOpen(false);
  }

  if (!open) {
    return (
      <div>
        <button type="button" className="pill pill-teal" onClick={() => setOpen(true)} style={{ padding: "10px 20px", fontSize: 13.5 }}>
          Set a worksheet
        </button>
        <Status state={state} />
      </div>
    );
  }

  return (
    <form action={action} style={panel}>
      <input type="hidden" name="clientId" value={clientId} />
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="ws-template" style={labelStyle}>
            Worksheet
          </label>
          <select id="ws-template" name="templateKey" defaultValue={library[0]?.key} style={inputStyle}>
            {library.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
          {fe.templateKey && <p style={errorStyle}>{fe.templateKey}</p>}
        </div>
        <div>
          <label htmlFor="ws-session" style={labelStyle}>
            Linked to a session (optional)
          </label>
          <select id="ws-session" name="appointmentId" defaultValue="" style={inputStyle}>
            <option value="">—</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ws-note" style={labelStyle}>
          A note for the client (optional)
        </label>
        <p style={hintStyle}>They see this above the worksheet. Keep it short and encouraging.</p>
        <textarea
          id="ws-note"
          name="note"
          rows={2}
          maxLength={500}
          placeholder="e.g. Have a go at sections 1–3 before we meet; we'll do the rest together."
          style={{ ...inputStyle, resize: "vertical" }}
        />
        {fe.note && <p style={errorStyle}>{fe.note}</p>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Setting…" : "Set worksheet"}
        </button>
        <button type="button" className="pill pill-ghost" onClick={() => setOpen(false)} style={{ padding: "10px 18px", fontSize: 13.5 }}>
          Cancel
        </button>
        <span style={{ fontSize: 12.5, color: "var(--navy-soft)", lineHeight: 1.5 }}>
          The client is emailed that something is waiting in their account, unless they have turned emails off.
        </span>
      </div>
      <Status state={state} />
    </form>
  );
}

/** Correct a finalised supervision sheet. Supervisors and above. */
export function AmendSupervisionForm({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(amendSupervisionRecord, initialResourceState);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};

  React.useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <div className="no-print">
        <button type="button" className="pill pill-ghost" onClick={() => setOpen(true)} style={{ padding: "9px 18px", fontSize: 13.5 }}>
          Add an amendment
        </button>
        <Status state={state} />
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="no-print" style={panel}>
      <input type="hidden" name="recordId" value={recordId} />
      <div>
        <label htmlFor="am-body" style={labelStyle}>
          Correction
        </label>
        <textarea id="am-body" name="body" rows={3} maxLength={4000} style={{ ...inputStyle, resize: "vertical" }} />
        {fe.body && <p style={errorStyle}>{fe.body}</p>}
      </div>
      <div>
        <label htmlFor="am-reason" style={labelStyle}>
          Why it was needed
        </label>
        <input id="am-reason" name="reason" maxLength={500} style={inputStyle} />
        {fe.reason && <p style={errorStyle}>{fe.reason}</p>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5 }}>
          {pending ? "Saving…" : "Add amendment"}
        </button>
        <button type="button" className="pill pill-ghost" onClick={() => setOpen(false)} style={{ padding: "10px 18px", fontSize: 13.5 }}>
          Cancel
        </button>
        <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>The sheet itself stays exactly as finalised.</span>
      </div>
      <Status state={state} />
    </form>
  );
}

/** Done / not done for a preparation task. */
export function TaskDoneButton({ taskId, done }: { taskId: string; done: boolean }) {
  const [state, action, pending] = useActionState(setPreparationTaskDone, initialResourceState);
  return (
    <form action={action} className="no-print" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="done" value={done ? "false" : "true"} />
      <button
        disabled={pending}
        aria-pressed={done}
        style={{
          padding: "6px 12px",
          fontSize: 12.5,
          fontWeight: 800,
          borderRadius: 999,
          cursor: "pointer",
          border: `1px solid ${done ? "var(--teal-deep)" : "rgba(31,58,95,0.25)"}`,
          background: done ? "var(--teal-deep)" : "#fff",
          color: done ? "#fff" : "var(--navy)",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {done ? "✓ Done" : "Mark done"}
      </button>
      {state.status === "error" && <span style={{ ...errorStyle, margin: 0 }}>{state.message}</span>}
    </form>
  );
}

/** Delete a draft sheet, with an inline second step rather than a browser dialog. */
export function DeleteDraftButton({ recordId }: { recordId: string }) {
  const [state, action, pending] = useActionState(deleteSupervisionDraft, initialResourceState);
  const [asking, setAsking] = React.useState(false);
  if (!asking) {
    return (
      <div className="no-print">
        <button
          type="button"
          onClick={() => setAsking(true)}
          style={{ background: "none", border: 0, padding: 0, fontSize: 13, fontWeight: 700, color: "#a1421c", cursor: "pointer" }}
        >
          Delete this draft
        </button>
        <Status state={state} />
      </div>
    );
  }
  return (
    <form action={action} className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="recordId" value={recordId} />
      <span style={{ fontSize: 13.5, color: "var(--ink)" }}>Delete this draft for good?</span>
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "8px 16px", fontSize: 13, borderColor: "#c86b52", color: "#a1421c" }}>
        {pending ? "Deleting…" : "Yes, delete it"}
      </button>
      <button type="button" className="pill pill-ghost" onClick={() => setAsking(false)} style={{ padding: "8px 16px", fontSize: 13 }}>
        Keep it
      </button>
      <Status state={state} />
    </form>
  );
}

/** Review or withdraw a worksheet. */
export function WorksheetStaffActions({ assignmentId, status }: { assignmentId: string; status: string }) {
  const [reviewState, review, reviewing] = useActionState(markWorksheetReviewed, initialResourceState);
  const [withdrawState, withdraw, withdrawing] = useActionState(withdrawWorksheet, initialResourceState);
  const [asking, setAsking] = React.useState(false);

  return (
    <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {status === "submitted" && (
          <form action={review}>
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <button className="pill pill-teal" disabled={reviewing} style={{ padding: "10px 20px", fontSize: 13.5 }}>
              {reviewing ? "Saving…" : "Mark as reviewed"}
            </button>
          </form>
        )}
        {(status === "assigned" || status === "in_progress") &&
          (asking ? (
            <form action={withdraw} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="assignmentId" value={assignmentId} />
              <span style={{ fontSize: 13.5 }}>Withdraw it? The client will no longer see it.</span>
              <button className="pill pill-ghost" disabled={withdrawing} style={{ padding: "8px 16px", fontSize: 13, borderColor: "#c86b52", color: "#a1421c" }}>
                Yes, withdraw
              </button>
              <button type="button" className="pill pill-ghost" onClick={() => setAsking(false)} style={{ padding: "8px 16px", fontSize: 13 }}>
                Keep it
              </button>
            </form>
          ) : (
            <button type="button" className="pill pill-ghost" onClick={() => setAsking(true)} style={{ padding: "9px 18px", fontSize: 13.5 }}>
              Withdraw
            </button>
          ))}
      </div>
      <Status state={reviewState} />
      <Status state={withdrawState} />
    </div>
  );
}

/** Pick a client and open a new supervision sheet for them. */
export function StartSheetPicker({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [clientId, setClientId] = React.useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId) router.push(`/admin/clients/${clientId}/supervision/new`);
      }}
      style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
    >
      <div style={{ flex: "1 1 260px" }}>
        <label htmlFor="start-client" style={labelStyle}>
          Client
        </label>
        <select id="start-client" value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
          <option value="">Choose a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button className="pill pill-teal" disabled={!clientId} style={{ padding: "11px 20px", fontSize: 14, opacity: clientId ? 1 : 0.55 }}>
        Start a sheet
      </button>
    </form>
  );
}
