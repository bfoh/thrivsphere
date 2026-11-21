"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, enquiries, enquiryEvents } from "@/db/schema";
import { brand } from "@/data/site";
import type { EnquiryState } from "@/lib/enquiry-state";
import { sendEmail } from "@/lib/email";
import { callbackAcknowledgement, enquiryAcknowledgement, enquiryStaffNotice } from "@/lib/email-templates";
import { makeReference, parseEnquiry, type EnquiryForm } from "@/lib/enquiry-rules";
import { recordAudit } from "@/lib/audit";

/**
 * Very small in-memory rate limit.
 *
 * Enough to blunt casual form spam on a single instance. Stage 2 replaces this
 * with Upstash Redis so the limit holds across all serverless instances — see
 * the go-live plan. Deliberately not presented as robust protection.
 */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT_MAX;
}

function str(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** The general contact form (IT handover §16.2). */
export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  return receive("contact", formData);
}

/** "Request a Callback" (IT handover §19, Route B). */
export async function requestCallback(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  return receive("callback", formData);
}

/** Returned to the form with its errors. Checkboxes are left unticked. */
const TYPED_FIELDS = ["category", "name", "email", "country", "phone", "preferredContact", "subject", "message", "preferredTimes"];

const CONFIRMATION: Record<EnquiryForm, string> = {
  // §16.5, word for word.
  contact:
    "Thank you for contacting ThriveSphere Wellbeing. Your enquiry has been received. Please keep your reference number for future correspondence. This contact form is not monitored for emergencies.",
  callback:
    "Thank you — your callback request has been received, and ThriveSphere will be in touch to arrange your Initial Wellbeing Consultation. Please keep your reference number for future correspondence. This form is not monitored for emergencies.",
};

/**
 * Store an enquiry, then acknowledge it.
 *
 * Stored first (§16.4): the queue in the admin dashboard is the record, so an
 * enquiry is never lost because an email failed. The person who wrote gets an
 * acknowledgement with their reference; ThriveSphere gets a notice with a
 * link to the record and none of its content. A failed email is noted on the
 * record and in the activity log, where staff will see it.
 */
async function receive(form: EnquiryForm, formData: FormData): Promise<EnquiryState> {
  // Honeypot — real people leave this hidden field empty.
  if (str(formData, "company")) return { status: "ok", message: CONFIRMATION[form] };

  const parsed = parseEnquiry(form, (n) => str(formData, n), (n) => formData.get(n) === "on");
  const typed = Object.fromEntries(
    TYPED_FIELDS.map((n) => [n, str(formData, n).slice(0, 3000)])
  );
  if (!parsed.ok) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: typed };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return {
      status: "error",
      message: `Too many messages from this connection. Please try again shortly, or email ${brand.email}.`,
      values: typed,
    };
  }

  const v = parsed.value;
  const db = getDb();
  const unsent = `We couldn't send your message just now. Please try again, or email us directly at ${brand.email}.`;
  const failed: EnquiryState = { status: "error", message: unsent, values: typed };

  let row: { id: string; reference: string } | undefined;
  try {
    // One client profile (§19): an enquiry from someone already registered
    // joins their record. Matched on the address their account verified.
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(sql`lower(${clients.email}) = ${v.email}`)
      .limit(1);

    // A clash between two random references is very unlikely; try again if so.
    for (let attempt = 0; attempt < 3 && !row; attempt++) {
      [row] = await db
        .insert(enquiries)
        .values({
          reference: makeReference(randomBytes(6)),
          category: v.category,
          name: v.name,
          email: v.email,
          phone: v.phone,
          country: v.country,
          preferredContact: v.preferredContact,
          subject: v.subject,
          message: v.message,
          preferredTimes: v.preferredTimes,
          confirmedAdult: v.confirmedAdult,
          privacyAcknowledgedAt: new Date(),
          clientId: client?.id ?? null,
        })
        .onConflictDoNothing({ target: enquiries.reference })
        .returning({ id: enquiries.id, reference: enquiries.reference });
    }
    if (!row) return failed;

    await db.insert(enquiryEvents).values({
      enquiryId: row.id,
      kind: "received",
      detail: `${form === "callback" ? "Callback request" : "Enquiry"} from the website${client ? "; matched to an existing client by email" : ""}`,
    });
  } catch (err) {
    console.error("[enquiry] not stored", err);
    return failed;
  }

  const ack = form === "callback" ? callbackAcknowledgement(row.reference) : enquiryAcknowledgement(row.reference);
  const notice = enquiryStaffNotice({ id: row.id, reference: row.reference, category: v.category });
  const [ackSent, noticeSent] = await Promise.all([
    sendEmail({ to: v.email, subject: ack.subject, text: ack.text, html: ack.html }),
    sendEmail({
      to: process.env.ENQUIRY_TO_EMAIL ?? brand.email,
      subject: notice.subject,
      text: notice.text,
      html: notice.html,
    }),
  ]);

  const failures = [
    ...(ackSent.ok ? [] : ["the acknowledgement to the enquirer"]),
    ...(noticeSent.ok ? [] : ["the notice to ThriveSphere"]),
  ];
  if (failures.length) {
    console.error("[enquiry] email not sent:", failures.join(", "), row.reference);
    await db.insert(enquiryEvents).values({
      enquiryId: row.id,
      kind: "note",
      detail: `Email not sent: ${failures.join(" and ")}.`,
    });
    await recordAudit({
      actorId: null,
      action: "update",
      entity: "enquiries",
      entityId: row.id,
      detail: `enquiry ${row.reference}: email not sent (${failures.join(", ")})`,
    });
  }

  return { status: "ok", message: CONFIRMATION[form], reference: row.reference };
}
