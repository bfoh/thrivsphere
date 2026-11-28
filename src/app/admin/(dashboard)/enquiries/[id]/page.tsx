import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { enquiries, enquiryEvents, leadAttributions, users } from "@/db/schema";
import { describeAttribution } from "@/lib/attribution";
import { requireCapability } from "@/lib/guard";
import { Section, Field, Empty } from "@/components/admin/RecordUI";
import { BackLink } from "@/components/admin/BackLink";
import { AssignForm, BookingLinkForm, ContactLogForm, NoteForm, StatusForm } from "@/components/admin/EnquiryForms";
import { categoryLabel, contactMethodLabel, statusLabel } from "@/lib/enquiry-rules";
import { getActiveStaff, getBookablePractitioners } from "@/lib/queries/availability";

export const metadata: Metadata = { title: "Enquiry", robots: { index: false, follow: false } };

const dt = (v: Date) =>
  v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const EVENT_LABEL: Record<string, string> = {
  received: "Received",
  status: "Status",
  assigned: "Assignment",
  note: "Note",
  contact: "Contact",
  booking_link: "Booking link",
  linked: "Client record",
};

/**
 * One enquiry: what they sent, who has it, and everything done about it
 * (IT handover §16.4). Opening it is logged.
 */
export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  await requireCapability("enquiry:manage", { entity: "enquiries", entityId: id, action: "view", detail: "opened an enquiry" });

  const db = getDb();
  const [[enquiry], history, staff, bookable, [attribution]] = await Promise.all([
    db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1),
    db
      .select({
        id: enquiryEvents.id,
        kind: enquiryEvents.kind,
        detail: enquiryEvents.detail,
        createdAt: enquiryEvents.createdAt,
        actorName: users.displayName,
        actorEmail: users.email,
      })
      .from(enquiryEvents)
      .leftJoin(users, eq(users.id, enquiryEvents.actorId))
      .where(eq(enquiryEvents.enquiryId, id))
      .orderBy(asc(enquiryEvents.createdAt)),
    getActiveStaff(),
    getBookablePractitioners(),
    db.select().from(leadAttributions).where(eq(leadAttributions.enquiryId, id)).limit(1),
  ]);
  if (!enquiry) notFound();

  const callback = enquiry.category === "callback";
  const practitioners = bookable.filter((p) => p.displayName).map((p) => ({ id: p.id, name: p.displayName! }));

  return (
    <div className="adm-page adm-page--narrow">
      <BackLink href="/admin/enquiries" label="Enquiries" />
      <h1 className="adm-title" style={{ margin: "12px 0 4px" }}>
        {enquiry.reference} · {enquiry.name}
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--navy-soft)" }}>
        {categoryLabel(enquiry.category)} · received {dt(enquiry.createdAt)} · {statusLabel(enquiry.status)}
        {enquiry.clientId && (
          <>
            {" · "}
            <Link href={`/admin/clients/${enquiry.clientId}`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Open their client record
            </Link>
          </>
        )}
      </p>

      <Section title="What they sent">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
          <Field label="Email" value={enquiry.email} />
          <Field label="Phone" value={enquiry.phone} />
          <Field label="Country" value={enquiry.country} />
          <Field label="Preferred contact" value={contactMethodLabel(enquiry.preferredContact) ?? "No preference"} />
          {callback ? (
            <Field label="Best times to contact" value={enquiry.preferredTimes} />
          ) : (
            <Field label="Subject" value={enquiry.subject} />
          )}
          {callback && <Field label="Confirmed 18 or over" value={enquiry.confirmedAdult ? "Yes" : "No"} />}
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label={callback ? "Accessibility or communication needs" : "Message"} value={enquiry.message} />
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="How they found us" value={describeAttribution(attribution) ?? "Not said"} small />
        </div>
      </Section>

      <Section title="Handling" subtitle="Status changes, assignment and booking links are added to the history below">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="two-col">
          <StatusForm enquiryId={enquiry.id} status={enquiry.status} />
          <AssignForm enquiryId={enquiry.id} assignedTo={enquiry.assignedTo} staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
        {(callback || enquiry.category === "individual") && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--a-line)" }}>
            <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>
              Once you have spoken, send them the link to book and pay for their Initial Wellbeing
              Consultation. It opens the same booking page as the website&apos;s, with the practitioner you
              choose selected.
            </p>
            <BookingLinkForm enquiryId={enquiry.id} practitioners={practitioners} />
          </div>
        )}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="two-col">
        <Section title="Log a contact">
          <ContactLogForm enquiryId={enquiry.id} />
        </Section>
        <Section title="Add a note">
          <NoteForm enquiryId={enquiry.id} />
        </Section>
      </div>

      <Section title="History">
        {history.length === 0 ? (
          <Empty>Nothing recorded yet.</Empty>
        ) : (
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
            {history.map((h) => (
              <li key={h.id} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--navy-soft)" }}>
                  {EVENT_LABEL[h.kind] ?? h.kind}
                </span>{" "}
                <span style={{ whiteSpace: "pre-wrap" }}>{h.detail}</span>
                <div style={{ fontSize: 12, color: "var(--navy-soft)" }}>
                  {dt(h.createdAt)} · {h.actorName || h.actorEmail || "the website"}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
