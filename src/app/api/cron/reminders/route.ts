import crypto from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, remindersSent } from "@/db/schema";
import { dueReminders, type ReminderKind } from "@/lib/reminders";
import { bookingConfirmation, reminder1h, reminder24h } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

/**
 * Scheduled reminder send.
 *
 * Runs hourly. Looks a little way ahead, works out which reminders are due,
 * sends them, and records what was sent so the next run cannot repeat itself.
 *
 * Protected by a shared secret rather than a user session, since the caller is
 * Vercel Cron. Without it, anyone who found the URL could make the service
 * email its clients repeatedly — which for someone whose inbox is monitored is
 * a safeguarding problem, not spam.
 */
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed: an unset secret must not mean "open to everyone".
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const horizon = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  const rows = await db
    .select({
      appointmentId: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      email: clients.email,
      emailRemindersEnabled: clients.emailRemindersEnabled,
    })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .where(
      and(
        eq(appointments.status, "scheduled"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, horizon)
      )
    );

  if (rows.length === 0) {
    return Response.json({ checked: 0, sent: 0, failed: 0 });
  }

  const sentRows = await db
    .select({ appointmentId: remindersSent.appointmentId, kind: remindersSent.kind })
    .from(remindersSent);

  const sentByAppointment = new Map<string, ReminderKind[]>();
  for (const s of sentRows) {
    const list = sentByAppointment.get(s.appointmentId) ?? [];
    list.push(s.kind as ReminderKind);
    sentByAppointment.set(s.appointmentId, list);
  }

  const due = dueReminders(
    rows.map((r) => ({
      appointmentId: r.appointmentId,
      startsAt: r.startsAt,
      status: r.status,
      emailRemindersEnabled: r.emailRemindersEnabled,
      alreadySent: sentByAppointment.get(r.appointmentId) ?? [],
    })),
    now
  );

  let sent = 0;
  let failed = 0;

  for (const item of due) {
    const row = rows.find((r) => r.appointmentId === item.appointmentId);
    if (!row) continue;

    const email =
      item.kind === "booking_confirmation"
        ? bookingConfirmation(row.startsAt)
        : item.kind === "reminder_24h"
          ? reminder24h(row.startsAt)
          : reminder1h(row.startsAt);

    const result = await sendEmail({
      to: row.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    if (result.ok) {
      // Recorded only after a successful send, so a provider outage means the
      // next run retries rather than silently skipping.
      await db.insert(remindersSent).values({
        appointmentId: item.appointmentId,
        kind: item.kind,
      });
      sent++;
    } else {
      failed++;
      console.error("[reminders] send failed", item.kind, result.reason);
    }
  }

  return Response.json({ checked: rows.length, due: due.length, sent, failed });
}
