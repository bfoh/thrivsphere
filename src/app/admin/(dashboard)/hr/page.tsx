import type { Metadata } from "next";
import { desc, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { absences, staffProfiles, trainingRecords, users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import {
  absenceDays,
  absenceLabel,
  checkDate,
  contractLabel,
  isAbsentOn,
  worstState,
  type ComplianceState,
} from "@/lib/hr-rules";
import { roleLabel } from "@/lib/staff-rules";
import { AbsenceForm, StaffProfileForm, TrainingForm } from "@/components/admin/HrForms";
import type { Role } from "@/lib/authz";

export const metadata: Metadata = { title: "HR", robots: { index: false, follow: false } };

const d = (v: string | null) =>
  v ? new Date(`${v}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

/**
 * Staff register.
 *
 * A register, not a payroll system: no salary, no bank details, no national
 * insurance numbers. What is here is what a wellbeing service is actually
 * asked to evidence — DBS status, supervision, training — plus enough absence
 * tracking to run a rota. Payroll is done elsewhere, and holding salary data
 * here would raise the stakes of a breach for no operational gain.
 */
export default async function HrPage() {
  await requireCapability("hr:read", {
    entity: "staff_profiles",
    action: "view",
    detail: "viewed the staff register",
  });

  const db = getDb();
  const today = new Date();

  const [staff, profiles, allAbsences, training] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, status: users.status })
      .from(users)
      .where(ne(users.role, "client"))
      .orderBy(users.email),
    db.select().from(staffProfiles),
    db.select().from(absences).orderBy(desc(absences.startsOn)).limit(100),
    db.select().from(trainingRecords).orderBy(desc(trainingRecords.completedOn)).limit(200),
  ]);

  const profileFor = new Map(profiles.map((p) => [p.userId, p]));
  const nameFor = new Map(staff.map((s) => [s.id, s.displayName || s.email]));
  const staffOptions = staff.map((s) => ({ id: s.id, name: s.displayName || s.email }));

  const rows = staff.map((s) => {
    const profile = profileFor.get(s.id) ?? null;
    const dbs = checkDate(profile?.dbsReviewDue, today);
    const supervision = checkDate(profile?.supervisionDue, today);

    // The soonest expiring certificate is what needs chasing; the rest can wait.
    const theirTraining = training.filter((t) => t.userId === s.id);
    const soonest = theirTraining
      .filter((t) => t.expiresOn)
      .map((t) => ({ course: t.course, check: checkDate(t.expiresOn, today) }))
      .sort((a, b) => (a.check.daysRemaining ?? 0) - (b.check.daysRemaining ?? 0))[0];

    return {
      staff: s,
      profile,
      dbs,
      supervision,
      training: theirTraining,
      soonestTraining: soonest ?? null,
      overall: worstState([dbs.state, supervision.state, soonest?.check.state ?? "ok"]),
      absentToday: allAbsences.some((a) => a.userId === s.id && isAbsentOn(a, today)),
    };
  });

  const needsAttention = rows.filter((r) => r.overall === "overdue" || r.overall === "due_soon");

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Staff register</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--navy-soft)", maxWidth: 640, lineHeight: 1.6 }}>
        DBS status, supervision, training and absence. This is a register, not a payroll system —
        no salary or bank details are held here.
      </p>

      {needsAttention.length > 0 && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", marginBottom: 26 }}>
          <strong style={{ fontSize: 13.5, color: "var(--navy)" }}>Needs attention</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: "var(--ink)" }}>
            {needsAttention.map((r) => (
              <li key={r.staff.id}>
                {nameFor.get(r.staff.id)} —{" "}
                {[
                  r.dbs.state !== "ok" ? `DBS review ${r.dbs.label.toLowerCase()}` : null,
                  r.supervision.state !== "ok" ? `supervision ${r.supervision.label.toLowerCase()}` : null,
                  r.soonestTraining && r.soonestTraining.check.state !== "ok"
                    ? `${r.soonestTraining.course} ${r.soonestTraining.check.label.toLowerCase()}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="People" subtitle={`${staff.length} staff ${staff.length === 1 ? "account" : "accounts"}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((r) => (
            <div key={r.staff.id} style={{ border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <StateDot state={r.overall} />
                <strong style={{ fontSize: 14.5, color: "var(--navy)" }}>{nameFor.get(r.staff.id)}</strong>
                <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>
                  {r.profile?.jobTitle ? `${r.profile.jobTitle} · ` : ""}
                  {roleLabel(r.staff.role as Role)}
                  {r.profile ? ` · ${contractLabel(r.profile.contract)}` : ""}
                </span>
                {r.staff.status !== "active" && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#b4553f" }}>blocked</span>
                )}
                {r.absentToday && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--teal-deep)" }}>away today</span>
                )}
                <span style={{ marginLeft: "auto" }}>
                  <StaffProfileForm
                    userId={r.staff.id}
                    name={nameFor.get(r.staff.id) ?? r.staff.email}
                    values={
                      r.profile
                        ? {
                            jobTitle: r.profile.jobTitle,
                            contract: r.profile.contract,
                            startedOn: r.profile.startedOn,
                            dbsNumber: r.profile.dbsNumber,
                            dbsCheckedOn: r.profile.dbsCheckedOn,
                            dbsReviewDue: r.profile.dbsReviewDue,
                            supervisionDue: r.profile.supervisionDue,
                            supervisorName: r.profile.supervisorName,
                            emergencyContactName: r.profile.emergencyContactName,
                            emergencyContactPhone: r.profile.emergencyContactPhone,
                            notes: r.profile.notes,
                          }
                        : null
                    }
                  />
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 12 }}>
                <Detail label="Started" value={d(r.profile?.startedOn ?? null)} />
                <Detail
                  label="DBS review"
                  value={d(r.profile?.dbsReviewDue ?? null)}
                  note={r.dbs.label}
                  state={r.dbs.state}
                />
                <Detail
                  label="Next supervision"
                  value={d(r.profile?.supervisionDue ?? null)}
                  note={r.supervision.label}
                  state={r.supervision.state}
                />
                <Detail
                  label="Training expiring"
                  value={r.soonestTraining ? r.soonestTraining.course : "—"}
                  note={r.soonestTraining?.check.label}
                  state={r.soonestTraining?.check.state}
                />
              </div>

              {r.training.length > 0 && (
                <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {r.training.map((t) => (
                    <li key={t.id} style={{ fontSize: 12, padding: "5px 11px", borderRadius: 999, background: "rgba(31,58,95,0.05)", color: "var(--navy)" }}>
                      {t.course} · {d(t.completedOn)}
                      {t.expiresOn ? ` → ${d(t.expiresOn)}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Record training" subtitle="Safeguarding and first aid lapse — record the expiry where there is one.">
        <TrainingForm staff={staffOptions} />
      </Section>

      <Section title="Absence" subtitle="Dates are inclusive: a single day is the same date twice.">
        <AbsenceForm staff={staffOptions} />
        <div style={{ marginTop: 18 }}>
          {allAbsences.length === 0 ? (
            <Empty>No absence recorded.</Empty>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr>{["Person", "Type", "From", "To", "Days", "Notes"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {allAbsences.map((a) => (
                  <tr key={a.id}>
                    <td style={{ ...td, color: "var(--navy)", fontWeight: 700 }}>{nameFor.get(a.userId) ?? "former colleague"}</td>
                    <td style={td}>{absenceLabel(a.type)}</td>
                    <td style={td}>{d(a.startsOn)}</td>
                    <td style={td}>{d(a.endsOn)}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{absenceDays(a.startsOn, a.endsOn)}</td>
                    <td style={{ ...td, color: "var(--navy-soft)" }}>{a.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Section>
    </div>
  );
}

const STATE_COLOUR: Record<ComplianceState, string> = {
  ok: "var(--teal-deep)",
  due_soon: "#a97c1e",
  overdue: "#b4553f",
  missing: "#7a879b",
};

function StateDot({ state }: { state: ComplianceState }) {
  const words: Record<ComplianceState, string> = {
    ok: "up to date",
    due_soon: "due soon",
    overdue: "overdue",
    missing: "not recorded",
  };
  return (
    <span
      title={words[state]}
      aria-label={words[state]}
      style={{ width: 10, height: 10, borderRadius: "50%", background: STATE_COLOUR[state], flexShrink: 0 }}
    />
  );
}

function Detail({
  label, value, note, state,
}: { label: string; value: string; note?: string; state?: ComplianceState }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--navy-soft)", letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--navy)", marginTop: 3 }}>{value}</div>
      {note && (
        <div style={{ fontSize: 12, marginTop: 2, color: state ? STATE_COLOUR[state] : "var(--navy-soft)", fontWeight: state && state !== "ok" ? 700 : 400 }}>
          {note}
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px 10px", fontSize: 11.5, fontWeight: 800,
  color: "var(--navy-soft)", borderBottom: "1px solid rgba(31,58,95,0.12)",
};
const td: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid rgba(31,58,95,0.07)",
};
