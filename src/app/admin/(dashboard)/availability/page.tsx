import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { practitionerSettings } from "@/db/schema";
import { can } from "@/lib/authz";
import { requireCapability } from "@/lib/guard";
import { getActiveStaff, getAvailability, getBookableSlots } from "@/lib/queries/availability";
import { Section, Empty } from "@/components/admin/RecordUI";
import { PageHeader, Tabs } from "@/components/admin/ui";
import {
  AddRuleForm,
  BlockDateForm,
  DefaultRoomForm,
  OpenHoursForm,
  RemoveExceptionButton,
  RemoveRuleButton,
  DAYS,
} from "@/components/admin/AvailabilityForms";

export const metadata: Metadata = { title: "Availability", robots: { index: false, follow: false } };

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ practitioner?: string }>;
}) {
  const actor = await requireCapability("availability:manage", {
    entity: "availability_rules",
    action: "view",
    detail: "viewed availability",
  });

  // The owner and admins manage everyone's calendar; a practitioner their own.
  const manageAny = can(actor, "availability:manage:any");
  const staff = manageAny ? await getActiveStaff() : [];
  const { practitioner: requested } = await searchParams;
  const subject = staff.find((s) => s.id === requested) ?? null;
  const ownerId = subject?.id ?? actor.userId;
  const forOther = ownerId !== actor.userId ? ownerId : undefined;

  if (forOther) {
    await requireCapability("availability:manage:any", {
      entity: "availability_rules",
      action: "view",
      detail: `viewed availability (for ${forOther})`,
    });
  }

  const [{ rules, exceptions }, slots, [settings]] = await Promise.all([
    getAvailability(ownerId),
    getBookableSlots({ practitionerId: ownerId, days: 14 }),
    getDb().select().from(practitionerSettings).where(eq(practitionerSettings.userId, ownerId)).limit(1),
  ]);
  // Past dates no longer affect anything, so only today onwards is listed.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const current = exceptions.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const extraHours = current.filter((e) => !e.blocked);
  const blocked = current.filter((e) => e.blocked);
  const whose = subject && forOther ? `${subject.name}'s` : "Your";

  return (
    <div className="adm-page adm-page--narrow">
      <PageHeader
        title="Availability"
        description={
          <>
            Times are London time and follow the clocks — 6pm stays 6pm through a BST change. Clients are offered every
            practitioner&apos;s free times together, and each booking goes to whoever is free.
          </>
        }
      />

      {manageAny && staff.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <Tabs
            label="Practitioner"
            items={staff.map((s) => ({
              label: s.id === actor.userId ? "You" : s.name,
              href: s.id === actor.userId ? "/admin/availability" : `/admin/availability?practitioner=${s.id}`,
              active: s.id === ownerId,
            }))}
          />
        </div>
      )}

      <Section
        title={`${whose} default meeting room`}
        subtitle={settings?.defaultMeetingLinkEncrypted ? "Set — added to every new booking" : "Not set — clients will see no joining link until one is added"}
      >
        <DefaultRoomForm practitionerId={forOther} hasLink={!!settings?.defaultMeetingLinkEncrypted} />
      </Section>

      <Section title="Weekly pattern" subtitle="Repeats every week until removed">
        <AddRuleForm practitionerId={forOther} />
        <div style={{ marginTop: 18 }}>
          {rules.length === 0 ? (
            <Empty>No weekly hours set. Clients can only book extra hours opened below.</Empty>
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

      <Section title="Extra hours" subtitle="Add appointment times on a date outside the weekly pattern">
        <OpenHoursForm practitionerId={forOther} />
        <ExceptionList entries={extraHours} empty="No extra hours." />
      </Section>

      <Section title="Blocked time" subtitle="Leave, training, or anything else that overrides the weekly pattern">
        <BlockDateForm practitionerId={forOther} />
        <ExceptionList entries={blocked} empty="Nothing blocked." />
      </Section>

      <Section title="Next 14 days" subtitle={`${slots.length} bookable slot${slots.length === 1 ? "" : "s"} — what clients can choose from`}>
        {slots.length === 0 ? (
          <Empty>No bookable slots. Check the weekly pattern, extra hours and blocked time.</Empty>
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

function ExceptionList({
  entries,
  empty,
}: {
  entries: { id: string; date: string; startTime: string | null; endTime: string | null; reason: string | null }[];
  empty: string;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      {entries.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((e) => (
            <li key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink)" }}>
              <span>
                <strong style={{ color: "var(--navy)" }}>{e.date}</strong>{" "}
                {e.startTime ? `${e.startTime.slice(0, 5)}–${e.endTime?.slice(0, 5)}` : "all day"}
                {e.reason && <span style={{ color: "var(--navy-soft)" }}> — {e.reason}</span>}
              </span>
              <span style={{ marginLeft: "auto" }}><RemoveExceptionButton exceptionId={e.id} /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
