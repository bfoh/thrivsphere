"use client";

import * as React from "react";
import { useActionState } from "react";
import { changeStaffRole, inviteStaffMember, setStaffBlocked } from "@/app/actions/staff";
import { initialStaffState } from "@/lib/staff-state";
import type { Role } from "@/lib/authz";
import { roleLabel } from "@/lib/staff-rules";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "9px 12px", borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", boxSizing: "border-box",
};

/** Shows the outcome of a staff action. Refusals are the common case here. */
function Result({ state }: { state: { status: string; message: string } }) {
  if (state.status === "idle" || !state.message) return null;
  const bad = state.status === "error";
  return (
    <p
      role="status"
      style={{
        margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5,
        color: bad ? "#b4553f" : "var(--teal-deep)",
      }}
    >
      {state.message}
    </p>
  );
}

export function InviteStaffForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState(inviteStaffMember, initialStaffState);

  return (
    <form action={action} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={{ flex: "1 1 260px" }}>
        <label htmlFor="invite-email" style={label}>Email address</label>
        <input id="invite-email" name="email" type="email" required placeholder="colleague@thrivsphere.org" style={{ ...input, width: "100%" }} />
      </div>
      <div>
        <label htmlFor="invite-role" style={label}>Role</label>
        <select id="invite-role" name="role" defaultValue="practitioner" style={input}>
          {roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
      </div>
      <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Sending…" : "Send invitation"}
      </button>
      <div style={{ flexBasis: "100%" }}><Result state={state} /></div>
    </form>
  );
}

/**
 * Role picker for one person.
 *
 * Submits on change rather than behind a save button — but only after a
 * confirmation, because this is the control that grants access to every client
 * record and a mis-click should not be enough.
 */
export function RoleControl({
  userId, email, currentRole, roles,
}: { userId: string; email: string; currentRole: Role; roles: Role[] }) {
  const [state, action, pending] = useActionState(changeStaffRole, initialStaffState);
  const formRef = React.useRef<HTMLFormElement>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Role;
    if (next === currentRole) return;
    const ok = window.confirm(`Change ${email} from ${roleLabel(currentRole)} to ${roleLabel(next)}?`);
    if (!ok) {
      e.target.value = currentRole;
      return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <input type="hidden" name="userId" value={userId} />
      <select name="role" defaultValue={currentRole} onChange={onChange} disabled={pending} style={{ ...input, fontSize: 13 }} aria-label={`Role for ${email}`}>
        {roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
      </select>
      <Result state={state} />
    </form>
  );
}

export function BlockControl({
  userId, email, blocked,
}: { userId: string; email: string; blocked: boolean }) {
  const [state, action, pending] = useActionState(setStaffBlocked, initialStaffState);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const verb = blocked ? "Restore access for" : "Block";
        if (!window.confirm(`${verb} ${email}?${blocked ? "" : " They will be signed out immediately."}`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="blocked" value={blocked ? "false" : "true"} />
      <button
        className="pill pill-ghost"
        disabled={pending}
        style={{ padding: "8px 16px", fontSize: 12.5, opacity: pending ? 0.6 : 1, color: blocked ? "var(--teal-deep)" : "#b4553f" }}
      >
        {pending ? "Working…" : blocked ? "Unblock" : "Block"}
      </button>
      <Result state={state} />
    </form>
  );
}

const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5,
};
