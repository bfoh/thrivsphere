import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { practitionerSettings } from "@/db/schema";
import { can } from "@/lib/authz";
import { requireCapability } from "@/lib/guard";
import { getActiveStaff, getAvailability, getBookableSlots } from "@/lib/queries/availability";
import { Section, Empty } from "@/components/admin/RecordUI";
import { PageHeader, Tabs } from "@/components/admin/ui";
import { blockPosition, DAY_NAMES, hourMarks, shortDate, trackRange, WEEK_ORDER } from "@/lib/availability-view";
import { clock, dayHeading, ukDate } from "@/lib/dashboard";
import {
  AddRuleForm,
  BlockDateForm,
  DefaultRoomForm,
  OpenHoursForm,
  RemoveExceptionButton,
  RemoveRuleButton,
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

  // The next 14 days' slots, one row per day.
  const now = new Date();
  const slotDays: { date: string; times: Date[] }[] = [];
  for (const slot of slots) {
    const date = ukDate(slot.startsAt);
    const last = slotDays.at(-1);
    if (last?.date === date) last.times.push(slot.startsAt);
    else slotDays.push({ date, times: [slot.startsAt] });
  }

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
            <WeekGrid rules={rules} />
          )}
        </div>
      </Section>

      <Section title="Extra hours" subtitle="Add appointment times on a date outside the weekly pattern">
        <OpenHoursForm practitionerId={forOther} />
        <ExceptionList entries={extraHours} empty="No extra hours." />
      </Section>

      <Section id="blocked-time" title="Blocked time" subtitle="Leave, training, or anything else that overrides the weekly pattern">
        <BlockDateForm practitionerId={forOther} />
        <ExceptionList entries={blocked} empty="Nothing blocked." />
      </Section>

      <Section title="Next 14 days" subtitle={`${slots.length} bookable slot${slots.length === 1 ? "" : "s"} — what clients can choose from`}>
        {slots.length === 0 ? (
          <Empty>No bookable slots. Check the weekly pattern, extra hours and blocked time.</Empty>
        ) : (
          <dl className="adm-slotdays">
            {slotDays.map((d) => (
              <div key={d.date}>
                <dt>{dayHeading(d.date, now)}</dt>
                <dd>
                  {d.times.map((t) => (
                    <span key={t.toISOString()} className="adm-slot">
                      {clock(t)}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
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
                <strong style={{ color: "var(--navy)" }}>{shortDate(e.date)}</strong>{" "}
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

/**
 * The weekly pattern as a diary: one row per day, Monday first, with each
 * stretch of hours drawn on a timeline and written out beside it.
 */
function WeekGrid({ rules }: { rules: { id: string; dayOfWeek: number; startTime: string; endTime: string; timezone: string }[] }) {
  const range = trackRange(rules);
  const marks = hourMarks(range);
  const at = (h: number) => ((h - range.from) / (range.to - range.from)) * 100;
  return (
    <div className="adm-weekgrid" style={{ ["--span" as string]: range.to - range.from }}>
      <div className="adm-weekgrid-scale" aria-hidden="true">
        <span />
        <div className="adm-weekgrid-marks">
          {marks.map((h) => (
            <span key={h} style={{ left: `${at(h)}%` }}>
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
      </div>
      {WEEK_ORDER.map((dow) => {
        const day = rules
          .filter((r) => r.dayOfWeek === dow)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <div key={dow} className="adm-weekgrid-row" data-empty={day.length === 0 || undefined}>
            <span className="adm-weekgrid-day">{DAY_NAMES[dow].slice(0, 3)}</span>
            <div className="adm-weekgrid-track" aria-hidden="true">
              {day.map((r) => {
                const p = blockPosition(r.startTime, r.endTime, range);
                return (
                  <span key={r.id} className="adm-weekgrid-block" style={{ left: `${p.left}%`, width: `${p.width}%` }}>
                    {r.startTime.slice(0, 5)}–{r.endTime.slice(0, 5)}
                  </span>
                );
              })}
            </div>
            <ul className="adm-weekgrid-times">
              {day.length === 0 ? (
                <li style={{ color: "var(--navy-soft)" }}>
                  <span className="visually-hidden">{DAY_NAMES[dow]}: </span>Closed
                </li>
              ) : (
                day.map((r) => (
                  <li key={r.id}>
                    <span>
                      <span className="visually-hidden">{DAY_NAMES[dow]} </span>
                      {r.startTime.slice(0, 5)}–{r.endTime.slice(0, 5)}
                      {r.timezone !== "Europe/London" && <small> {r.timezone}</small>}
                    </span>
                    <RemoveRuleButton ruleId={r.id} />
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
