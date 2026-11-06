import "server-only";

import type { FormButton, HeaderField } from "@/components/forms/FormRenderer";
import { londonToday } from "@/components/forms/format";

/**
 * The header of a supervision sheet — session, practitioner and date — as
 * form fields. Shared by the new-sheet and draft pages so both ask the same
 * way.
 */
export function supervisionHeaderFields(o: {
  sessions: { id: string; startsAt: Date; status: string }[];
  staff: { id: string; name: string }[];
  appointmentId: string | null;
  practitionerId: string;
  supervisionDate: string;
}): HeaderField[] {
  const sessionLabel = (s: { startsAt: Date; status: string }) =>
    `${s.startsAt.toLocaleString("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}${s.status === "completed" ? "" : " · not yet marked completed"}`;

  // A practitioner who has since left stays selectable on their own sheet.
  const staffOptions = o.staff.map((s) => ({ value: s.id, label: s.name }));
  if (o.practitionerId && !o.staff.some((s) => s.id === o.practitionerId)) {
    staffOptions.unshift({ value: o.practitionerId, label: "A former colleague" });
  }

  return [
    {
      kind: "select",
      name: "appointmentId",
      label: "Session completed",
      hint: o.sessions.length ? undefined : "No completed sessions yet — the sheet can still be saved without one.",
      options: o.sessions.map((s) => ({ value: s.id, label: sessionLabel(s) })),
      defaultValue: o.appointmentId ?? "",
      emptyLabel: "Not linked to a session",
    },
    {
      kind: "select",
      name: "practitionerId",
      label: "Practitioner",
      options: staffOptions,
      defaultValue: o.practitionerId,
    },
    {
      kind: "date",
      name: "supervisionDate",
      label: "Supervision date",
      defaultValue: o.supervisionDate,
      max: londonToday(),
    },
  ];
}

export const SUPERVISION_BUTTONS: FormButton[] = [
  { intent: "save", label: "Save draft" },
  {
    intent: "finalise",
    label: "Finalise",
    primary: true,
    confirm:
      "Finalising locks the sheet and creates the preparation tasks. After that, corrections are added as amendments.",
  },
];
