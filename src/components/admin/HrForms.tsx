"use client";

import * as React from "react";
import { useActionState } from "react";
import { recordAbsence, recordTraining, saveStaffProfile } from "@/app/actions/hr";
import { initialHrState } from "@/lib/hr-state";
import { absenceLabel, contractLabel } from "@/lib/hr-rules";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "9px 12px", borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", width: "100%", boxSizing: "border-box",
};
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5,
};

function Result({ state }: { state: { status: string; message: string } }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: state.status === "error" ? "#b4553f" : "var(--teal-deep)" }}>
      {state.message}
    </p>
  );
}

function Labelled({ id, text, children }: { id: string; text: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={label}>{text}</label>
      {children}
    </div>
  );
}

const CONTRACTS = ["employee", "self_employed", "sessional", "volunteer", "director"];
const ABSENCE_TYPES = ["annual_leave", "sick", "training", "parental", "compassionate", "unpaid", "other"];

export type ProfileValues = {
  jobTitle: string | null;
  contract: string;
  startedOn: string | null;
  dbsNumber: string | null;
  dbsCheckedOn: string | null;
  dbsReviewDue: string | null;
  supervisionDue: string | null;
  supervisorName: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
};

/**
 * One person's employment record.
 *
 * Collapsed by default. Opening every staff record at once turns the page into
 * a wall of DBS numbers, which is more of that data on screen than anyone
 * needs at a glance.
 */
export function StaffProfileForm({
  userId, name, values,
}: { userId: string; name: string; values: ProfileValues | null }) {
  const [state, action, pending] = useActionState(saveStaffProfile, initialHrState);
  const [open, setOpen] = React.useState(false);
  const v = values;
  const p = (suffix: string) => `${userId}-${suffix}`;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="pill pill-ghost" style={{ padding: "7px 15px", fontSize: 12.5 }}>
        {v ? "Edit record" : "Add record"}
      </button>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 18px", borderRadius: 12, background: "rgba(31,58,95,0.03)", border: "1px solid rgba(31,58,95,0.12)", marginTop: 10 }}>
      <input type="hidden" name="userId" value={userId} />
      <strong style={{ fontSize: 13.5, color: "var(--navy)" }}>{name}</strong>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Labelled id={p("jobTitle")} text="Job title">
          <input id={p("jobTitle")} name="jobTitle" defaultValue={v?.jobTitle ?? ""} style={input} />
        </Labelled>
        <Labelled id={p("contract")} text="Contract">
          <select id={p("contract")} name="contract" defaultValue={v?.contract ?? "self_employed"} style={input}>
            {CONTRACTS.map((c) => <option key={c} value={c}>{contractLabel(c)}</option>)}
          </select>
        </Labelled>
        <Labelled id={p("startedOn")} text="Start date">
          <input id={p("startedOn")} name="startedOn" type="date" defaultValue={v?.startedOn ?? ""} style={input} />
        </Labelled>
      </div>

      <fieldset style={{ border: "1px solid rgba(31,58,95,0.12)", borderRadius: 10, padding: "12px 14px", margin: 0 }}>
        <legend style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", padding: "0 6px" }}>
          DBS and supervision
        </legend>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--navy-soft)", lineHeight: 1.5 }}>
          Safeguarding evidence. A DBS certificate carries no expiry of its own, so the review
          date is the service&apos;s own policy — commonly three years.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Labelled id={p("dbsNumber")} text="DBS certificate number">
            <input id={p("dbsNumber")} name="dbsNumber" defaultValue={v?.dbsNumber ?? ""} style={input} />
          </Labelled>
          <Labelled id={p("dbsCheckedOn")} text="Checked on">
            <input id={p("dbsCheckedOn")} name="dbsCheckedOn" type="date" defaultValue={v?.dbsCheckedOn ?? ""} style={input} />
          </Labelled>
          <Labelled id={p("dbsReviewDue")} text="Review due">
            <input id={p("dbsReviewDue")} name="dbsReviewDue" type="date" defaultValue={v?.dbsReviewDue ?? ""} style={input} />
          </Labelled>
          <Labelled id={p("supervisorName")} text="Supervisor">
            <input id={p("supervisorName")} name="supervisorName" defaultValue={v?.supervisorName ?? ""} style={input} />
          </Labelled>
          <Labelled id={p("supervisionDue")} text="Next supervision">
            <input id={p("supervisionDue")} name="supervisionDue" type="date" defaultValue={v?.supervisionDue ?? ""} style={input} />
          </Labelled>
        </div>
      </fieldset>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Labelled id={p("ecName")} text="Emergency contact">
          <input id={p("ecName")} name="emergencyContactName" defaultValue={v?.emergencyContactName ?? ""} style={input} />
        </Labelled>
        <Labelled id={p("ecPhone")} text="Emergency contact phone">
          <input id={p("ecPhone")} name="emergencyContactPhone" defaultValue={v?.emergencyContactPhone ?? ""} style={input} />
        </Labelled>
      </div>

      <Labelled id={p("notes")} text="Notes">
        <textarea id={p("notes")} name="notes" rows={2} defaultValue={v?.notes ?? ""} style={{ ...input, resize: "vertical" }} />
      </Labelled>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : "Save record"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="pill pill-ghost" style={{ padding: "9px 18px", fontSize: 13 }}>
          Close
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function AbsenceForm({ staff }: { staff: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(recordAbsence, initialHrState);

  return (
    <form action={action} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <Labelled id="abs-user" text="Person">
        <select id="abs-user" name="userId" style={input}>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Labelled>
      <Labelled id="abs-type" text="Type">
        <select id="abs-type" name="type" defaultValue="annual_leave" style={input}>
          {ABSENCE_TYPES.map((t) => <option key={t} value={t}>{absenceLabel(t)}</option>)}
        </select>
      </Labelled>
      <Labelled id="abs-from" text="From">
        <input id="abs-from" name="startsOn" type="date" required style={input} />
      </Labelled>
      <Labelled id="abs-to" text="To (inclusive)">
        <input id="abs-to" name="endsOn" type="date" required style={input} />
      </Labelled>
      <Labelled id="abs-notes" text="Notes">
        <input id="abs-notes" name="notes" style={input} />
      </Labelled>
      <button className="pill pill-teal" disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : "Record"}
      </button>
      <div style={{ flexBasis: "100%" }}><Result state={state} /></div>
    </form>
  );
}

export function TrainingForm({ staff }: { staff: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(recordTraining, initialHrState);

  return (
    <form action={action} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <Labelled id="tr-user" text="Person">
        <select id="tr-user" name="userId" style={input}>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Labelled>
      <Labelled id="tr-course" text="Course">
        <input id="tr-course" name="course" required placeholder="Safeguarding adults, level 2" style={input} />
      </Labelled>
      <Labelled id="tr-provider" text="Provider">
        <input id="tr-provider" name="provider" style={input} />
      </Labelled>
      <Labelled id="tr-completed" text="Completed">
        <input id="tr-completed" name="completedOn" type="date" required style={input} />
      </Labelled>
      <Labelled id="tr-expires" text="Expires">
        <input id="tr-expires" name="expiresOn" type="date" style={input} />
      </Labelled>
      <button className="pill pill-teal" disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : "Record"}
      </button>
      <div style={{ flexBasis: "100%" }}><Result state={state} /></div>
    </form>
  );
}
