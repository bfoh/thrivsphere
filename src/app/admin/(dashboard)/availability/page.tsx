import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { getAvailability, getBookableSlots } from "@/lib/queries/availability";
import { Section, Empty } from "@/components/admin/RecordUI";
import { AddRuleForm, BlockDateForm, RemoveRuleButton, DAYS } from "@/components/admin/AvailabilityForms";

export const metadata: Metadata = { title: "Availability", robots: { index: false, follow: false } };

export default async function AvailabilityPage() {
  const actor = await requireCapability("availability:manage", {
    entity: "availability_rules",
    action: "view",
    detail: "viewed availability",
  });

  const { rules, exceptions } = await getAvailability(actor.userId);
  const slots = await getBookableSlots({ practitionerId: actor.userId, days: 14 });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Availability</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--navy-soft)" }}>
        Times are London time and follow the clocks — 6pm stays 6pm through a BST change.
      </p>

      <Section title="Weekly pattern" subtitle="Repeats every week until removed">
        <AddRuleForm />
        <div style={{ marginTop: 18 }}>
          {rules.length === 0 ? (
            <Empty>No availability set. Clients cannot book until you add a window.</Empty>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {rules.map((r) => (
                <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 14.5, color: "var(--ink)" }}>
                  <strong style={{ color: "var(--navy)", minWidth: 96 }}>{DAYS[r.dayOfWeek]}</strong>
                  <span>{r.startTime.slice(0, 5)} – {r.endTime.slice(0, 5)}</span>
                  <span style={{ color: "var(--navy-soft)", fontSize: 12.5 }}>{r.timezone}</span>
                  <span style={{ marginLeft: "auto" }}><RemoveRuleButton ruleId={r.id} /></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Blocked time" subtitle="Leave, training, or anything else that overrides the weekly pattern">
        <BlockDateForm />
        <div style={{ marginTop: 18 }}>
          {exceptions.length === 0 ? (
            <Empty>Nothing blocked.</Empty>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {exceptions.map((e) => (
                <li key={e.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                  <strong style={{ color: "var(--navy)" }}>{e.date}</strong>{" "}
                  {e.startTime ? `${e.startTime.slice(0, 5)}–${e.endTime?.slice(0, 5)}` : "all day"}
                  {e.reason && <span style={{ color: "var(--navy-soft)" }}> — {e.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Next 14 days" subtitle={`${slots.length} bookable slot${slots.length === 1 ? "" : "s"} — this is exactly what clients see`}>
        {slots.length === 0 ? (
          <Empty>No bookable slots. Check your weekly pattern and blocked time.</Empty>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {slots.slice(0, 40).map((s) => (
              <span key={s.startsAt.toISOString()} className="chip" style={{ fontSize: 12.5 }}>
                {s.startsAt.toLocaleString("en-GB", {
                  timeZone: "Europe/London",
                  weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
