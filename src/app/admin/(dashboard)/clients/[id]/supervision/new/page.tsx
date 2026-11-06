import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { requireCapabilityForClient } from "@/lib/guard";
import { supervisionTemplate } from "@/lib/forms/registry";
import { findSheetForAppointment, listSessionsForSheet } from "@/lib/queries/supervision";
import { getActiveStaff } from "@/lib/queries/availability";
import { supervisionHeaderFields, SUPERVISION_BUTTONS } from "@/lib/supervision-form";
import { saveSupervisionRecord } from "@/app/actions/supervision";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { BackLink } from "@/components/admin/BackLink";
import { londonToday } from "@/components/forms/format";

export const metadata: Metadata = { title: "New supervision sheet", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewSupervisionSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ appointment?: string }>;
}) {
  const { id } = await params;
  const { appointment } = await searchParams;
  if (!UUID.test(id)) notFound();

  const actor = await requireCapabilityForClient("supervision:write", id, {
    entity: "supervision_records",
    action: "view",
    detail: "opened a new supervision sheet",
  });

  // One sheet per session: starting another for the same session opens the first.
  if (appointment && UUID.test(appointment)) {
    const existing = await findSheetForAppointment(appointment);
    if (existing && existing.clientId === id) redirect(`/admin/clients/${id}/supervision/${existing.id}`);
  }

  const [[client], sessions, staff] = await Promise.all([
    getDb().select({ id: clients.id, preferredName: clients.preferredName }).from(clients).where(eq(clients.id, id)).limit(1),
    listSessionsForSheet(id),
    getActiveStaff(),
  ]);
  if (!client) notFound();

  const chosen = sessions.find((s) => s.id === appointment) ?? null;
  const staffList = staff.map((s) => ({ id: s.id, name: s.name }));
  const practitionerId = chosen?.practitionerId ?? (staff.some((s) => s.id === actor.userId) ? actor.userId : (staff[0]?.id ?? ""));
  const template = supervisionTemplate();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 40px" }}>
      <BackLink href={`/admin/clients/${id}`} label={client.preferredName} />
      <h1 style={{ margin: "16px 0 4px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{template.title}</h1>
      <p style={{ margin: "0 0 20px", fontSize: 14.5, color: "var(--navy-soft)" }}>New sheet for {client.preferredName}</p>

      <FormRenderer
        template={template}
        initialAnswers={{}}
        action={saveSupervisionRecord}
        hidden={{ clientId: id }}
        revision={0}
        staff={staffList}
        clientId={id}
        headerTitle="About this session"
        headerFields={supervisionHeaderFields({
          sessions,
          staff: staffList,
          appointmentId: chosen?.id ?? null,
          practitionerId,
          supervisionDate: londonToday(),
        })}
        buttons={SUPERVISION_BUTTONS}
      />
    </div>
  );
}
