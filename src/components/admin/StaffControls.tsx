"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  cancelStaffInvitation,
  changeStaffRole,
  copyInvitationLink,
  resendStaffInvitation,
  inviteStaffMember,
  removeStaffMember,
  setBlogReviewer,
  setSafeguardingDeputy,
  setStaffBlocked,
} from "@/app/actions/staff";
import { initialStaffState } from "@/lib/staff-state";
import type { Role } from "@/lib/authz";
import { roleLabel } from "@/lib/staff-rules";

const input: React.CSSProperties = { fontFamily: "inherit", boxSizing: "border-box" };

/** Shows the outcome of a staff action. Refusals are the common case here. */
function Result({ state }: { state: { status: string; message: string } }) {
  if (state.status === "idle" || !state.message) return null;
  const bad = state.status === "error";
  return (
    <p
      role="status"
      style={{
        margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5,
        color: bad ? "var(--a-danger)" : "var(--teal-deep)",
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
        style={{ padding: "8px 16px", fontSize: 12.5, opacity: pending ? 0.6 : 1, color: blocked ? "var(--teal-deep)" : "var(--a-danger)" }}
      >
        {pending ? "Working…" : blocked ? "Unblock" : "Block"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Remove a colleague who has left. Confirmed first: their sign-in goes for good. */
export function RemoveStaffControl({ userId, email }: { userId: string; email: string }) {
  const [state, action, pending] = useActionState(removeStaffMember, initialStaffState);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Remove ${email} from the staff? Their sign-in is deleted for good and they are signed out. Their name stays on past sessions and notes.`
        );
        if (!ok) e.preventDefault();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        className="pill pill-ghost"
        disabled={pending}
        style={{ padding: "8px 16px", fontSize: 12.5, opacity: pending ? 0.6 : 1, color: "var(--a-danger)" }}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Cancel an invitation that has not been accepted, so its link stops working. */
export function CancelInvitationControl({ invitationId, email }: { invitationId: string; email: string }) {
  const [state, action, pending] = useActionState(cancelStaffInvitation, initialStaffState);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Cancel the invitation for ${email}? The link in their email will stop working.`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
    >
      <input type="hidden" name="invitationId" value={invitationId} />
      <button
        className="pill pill-ghost"
        disabled={pending}
        style={{ padding: "5px 13px", fontSize: 12, opacity: pending ? 0.6 : 1, color: "var(--a-danger)" }}
      >
        {pending ? "Cancelling…" : "Cancel invitation"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Email an invitation again. The link in the earlier email stops working. */
function ResendInvitationControl({ invitationId, email }: { invitationId: string; email: string }) {
  const [state, action, pending] = useActionState(resendStaffInvitation, initialStaffState);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Send ${email} a new invitation email? The link in the earlier email will stop working.`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
    >
      <input type="hidden" name="invitationId" value={invitationId} />
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "5px 13px", fontSize: 12, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Sending…" : "Resend email"}
      </button>
      <Result state={state} />
    </form>
  );
}

type LinkState =
  | { status: "idle" }
  | { status: "busy"; for: string }
  | { status: "ready"; for: string; url: string; copied: boolean }
  | { status: "error"; for: string; message: string };

/**
 * Copy an invitation's link, to send by text or WhatsApp when the email has
 * not arrived. The link also appears in a box, for copying by hand where the
 * browser will not write to the clipboard.
 */
function useInvitationLink(invitationId: string) {
  const [state, setState] = React.useState<LinkState>({ status: "idle" });

  async function copy() {
    setState({ status: "busy", for: invitationId });
    try {
      const request = copyInvitationLink(invitationId);
      let copied = false;

      // Safari only lets a page use the clipboard during the click itself, so
      // the write starts now and receives the link when it arrives.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = request.then((r) => {
          if (r.status !== "ok") throw new Error(r.message);
          return new Blob([r.url], { type: "text/plain" });
        });
        blob.catch(() => {});
        try {
          await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
          copied = true;
        } catch {
          /* tried again below */
        }
      }

      const result = await request;
      if (result.status !== "ok") {
        setState({ status: "error", for: invitationId, message: result.message });
        return;
      }
      if (!copied) {
        try {
          await navigator.clipboard.writeText(result.url);
          copied = true;
        } catch {
          /* the box below is there to copy from */
        }
      }
      setState({ status: "ready", for: invitationId, url: result.url, copied });
    } catch {
      setState({ status: "error", for: invitationId, message: "The link could not be fetched. Try again." });
    }
  }

  // Sending the invitation again gives it a new id; anything shown for the old one is stale.
  return { state: state.status !== "idle" && state.for !== invitationId ? ({ status: "idle" } as LinkState) : state, copy };
}

/**
 * What can be done with an invitation that has not been accepted: copy its
 * link, email it again, or cancel it. Shown to the people who could cancel it.
 */
export function PendingInvitationActions({ invitationId, email }: { invitationId: string; email: string }) {
  const { state, copy } = useInvitationLink(invitationId);
  const busy = state.status === "busy";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="pill pill-ghost"
          onClick={copy}
          disabled={busy}
          style={{ padding: "5px 13px", fontSize: 12, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Getting the link…" : "Copy invitation link"}
        </button>
        <ResendInvitationControl invitationId={invitationId} email={email} />
        <CancelInvitationControl invitationId={invitationId} email={email} />
      </div>

      {state.status === "error" && (
        <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--a-danger)" }}>
          {state.message}
        </p>
      )}
      {state.status === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 620 }}>
          <p role="status" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--a-text)" }}>
            <strong style={{ color: "var(--a-accent)" }}>{state.copied ? "Link copied." : "Copy the link below."}</strong>{" "}
            Send it to {email} yourself, by text or WhatsApp. It can be used once, and only to create the account for this email address.
          </p>
          <input
            readOnly
            value={state.url}
            aria-label={`Invitation link for ${email}`}
            onFocus={(e) => e.currentTarget.select()}
            style={{ ...input, width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: 8, border: "1px solid var(--a-line-strong)", background: "var(--a-subtle)", color: "var(--a-muted)" }}
          />
        </div>
      )}
    </div>
  );
}

const label: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--navy)" };

/** Founder only: let a colleague approve other people's blog posts. */
export function BlogReviewerControl({ userId, reviewer }: { userId: string; reviewer: boolean }) {
  const [state, action, pending] = useActionState(setBlogReviewer, initialStaffState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="reviewer" value={reviewer ? "false" : "true"} />
      <span style={{ fontSize: 13, fontWeight: 700, color: reviewer ? "var(--teal-deep)" : "var(--navy-soft)" }}>{reviewer ? "Yes" : "No"}</span>
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "6px 12px", fontSize: 12, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : reviewer ? "Stop" : "Make reviewer"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function SafeguardingDeputyControl({ userId, deputy }: { userId: string; deputy: boolean }) {
  const [state, action, pending] = useActionState(setSafeguardingDeputy, initialStaffState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="deputy" value={deputy ? "false" : "true"} />
      <span style={{ fontSize: 13, fontWeight: 700, color: deputy ? "var(--teal-deep)" : "var(--navy-soft)" }}>{deputy ? "Yes" : "No"}</span>
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "6px 12px", fontSize: 12, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : deputy ? "Stop" : "Make deputy"}
      </button>
      <Result state={state} />
    </form>
  );
}
