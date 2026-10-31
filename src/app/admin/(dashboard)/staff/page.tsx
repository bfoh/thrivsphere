import type { Metadata } from "next";
import { Section, Empty } from "@/components/admin/RecordUI";
import { getCurrentActor } from "@/lib/session";
import { listStaff } from "@/app/actions/staff";
import { listInvitations } from "@/lib/clerk-admin";
import { assignableRoles, canCancelInvitation, canManageStaff, roleLabel } from "@/lib/staff-rules";
import {
  BlockControl,
  CancelInvitationControl,
  InviteStaffForm,
  RemoveStaffControl,
  RoleControl,
} from "@/components/admin/StaffControls";
import type { Role } from "@/lib/authz";

export const metadata: Metadata = { title: "Staff", robots: { index: false, follow: false } };

const d = (v: Date | null) =>
  v ? v.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Staff accounts.
 *
 * Founders and admins, via `staff:read`. Founders invite, change roles and
 * block; admins can also remove a colleague who has left. Until now the only
 * way to add a colleague or change what they can see was a developer running a
 * CLI script — which meant no record of who changed whose access, and no way
 * for the organisation to manage itself. Every action on this page writes an
 * audit row.
 *
 * Each control is offered only where the rules in `staff-rules` would allow
 * it, so nobody is shown a button that would then refuse them.
 */
export default async function StaffPage() {
  const staff = await listStaff();
  const actor = await getCurrentActor();
  const acting = actor ? { userId: actor.userId, role: actor.role } : null;
  const roles = acting ? assignableRoles(acting) : [];
  const pending = await listInvitations();
  const foundersRemaining = staff.filter((s) => s.role === "founder" && s.status === "active").length;
  const canRemove = (s: (typeof staff)[number]) =>
    !!acting &&
    canManageStaff({
      actor: acting,
      target: { userId: s.id, role: s.role as Role, status: s.status },
      action: "remove",
      foundersRemaining,
    }).allowed;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Staff</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--navy-soft)" }}>
        Who has access to the back office, and what they can reach. Every change here is recorded
        in <strong>Activity</strong>.
      </p>

      {roles.length > 0 && (
        <Section title="Invite a colleague" subtitle="They receive an email and choose their own password. The role is applied when the account is created.">
          <InviteStaffForm roles={roles} />
        </Section>
      )}

      <Section title="Accounts" subtitle={`${staff.length} back-office ${staff.length === 1 ? "account" : "accounts"}`}>
        {staff.length === 0 ? (
          <Empty>No staff accounts yet.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
              <thead>
                <tr>
                  {["Person", "Role", "Status", "Last seen", ""].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const isSelf = s.id === actor?.userId;
                  return (
                    <tr key={s.id}>
                      <td style={td}>
                        <strong style={{ color: "var(--navy)" }}>{s.displayName || s.email}</strong>
                        {s.displayName && <div style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>{s.email}</div>}
                        {isSelf && <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--teal-deep)" }}>you</div>}
                      </td>
                      <td style={td}>
                        {/* Nobody edits their own access — the rules refuse it, so the
                            control is not offered either. */}
                        {isSelf || roles.length === 0 ? (
                          roleLabel(s.role as Role)
                        ) : (
                          <RoleControl userId={s.id} email={s.email} currentRole={s.role as Role} roles={roles} />
                        )}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: s.status === "active" ? "var(--teal-deep)" : "#b4553f" }}>
                        {s.status === "active" ? "Active" : s.status === "suspended" ? "Blocked" : s.status}
                      </td>
                      <td style={{ ...td, color: "var(--navy-soft)" }}>{d(s.lastSeenAt)}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                          {!isSelf && roles.length > 0 && (
                            <BlockControl userId={s.id} email={s.email} blocked={s.status === "suspended"} />
                          )}
                          {canRemove(s) && <RemoveStaffControl userId={s.id} email={s.email} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {pending.ok && pending.value.length > 0 && (
        <Section title="Invitations not yet accepted" subtitle="These people have been emailed but have not created an account.">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.value.map((i) => (
              <li key={i.id} style={{ fontSize: 14, color: "var(--ink)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span>
                  <strong style={{ color: "var(--navy)" }}>{i.email}</strong>{" "}
                  <span style={{ color: "var(--navy-soft)" }}>
                    — {roleLabel(i.role as Role)}, invited {d(i.createdAt)}
                  </span>
                </span>
                {acting && canCancelInvitation(acting, i.role as Role) && (
                  <CancelInvitationControl invitationId={i.id} email={i.email} />
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px 10px", fontSize: 12, fontWeight: 800,
  color: "var(--navy-soft)", borderBottom: "1px solid rgba(31,58,95,0.12)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "12px", borderBottom: "1px solid rgba(31,58,95,0.07)", verticalAlign: "top",
};
