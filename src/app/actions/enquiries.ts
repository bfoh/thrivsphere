"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { enquiries, enquiryEvents, users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { ForbiddenError, STAFF_ROLES, UnauthenticatedError, type Actor } from "@/lib/authz";
import { sendEmail } from "@/lib/email";
import { bookingLinkEmail } from "@/lib/email-templates";
import { getInitialConsultationPrice } from "@/lib/queries/catalogue";
import { isQueueStatus, statusLabel } from "@/lib/enquiry-rules";
import type { EnquiryAdminState } from "@/lib/enquiry-state";

/**
 * Working the enquiry queue (IT handover §16.4, §19 Route B).
 *
 * Every change is made through the guard, so it is permission-checked and in
 * the activity log, and is also added to the enquiry's own history: who
 * changed what, and when. History rows are only ever added.
 */

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function guard(enquiryId: string, detail: string): Promise<Actor | EnquiryAdminState> {
  try {
    return await requireCapability("enquiry:manage", { entity: "enquiries", entityId: enquiryId, action: "update", detail });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return { status: "error", message: "Your session has expired. Please sign in again." };
    if (err instanceof ForbiddenError) return { status: "error", message: err.message };
    throw err;
  }
}

const refused = (v: Actor | EnquiryAdminState): v is EnquiryAdminState => "status" in v && "message" in v;

async function load(id: string) {
  const [row] = await getDb().select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
  return row ?? null;
}

async function log(enquiryId: string, actorId: string, kind: (typeof enquiryEvents.$inferInsert)["kind"], detail: string) {
  await getDb().insert(enquiryEvents).values({ enquiryId, actorId, kind, detail });
}

function refresh(id: string) {
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${id}`);
  revalidatePath("/admin");
}

/** Move an enquiry through New → In progress → Awaiting client → Responded → Closed. */
export async function setEnquiryStatus(_prev: EnquiryAdminState, fd: FormData): Promise<EnquiryAdminState> {
  const id = str(fd, "enquiryId");
  const status = str(fd, "status");
  if (!id || !isQueueStatus(status)) return { status: "error", message: "Choose a status." };

  const actor = await guard(id, `set enquiry status to ${status}`);
  if (refused(actor)) return actor;

  const row = await load(id);
  if (!row) return { status: "error", message: "That enquiry no longer exists." };
  if (row.status === status) return { status: "ok", message: "No change." };

  const now = new Date();
  const closing = status === "responded" || status === "closed";
  await getDb()
    .update(enquiries)
    .set({
      status,
      updatedAt: now,
      ...(closing ? { handledBy: actor.userId, handledAt: now } : {}),
    })
    .where(eq(enquiries.id, id));
  await log(id, actor.userId, "status", `${statusLabel(row.status)} → ${statusLabel(status)}`);

  refresh(id);
  return { status: "ok", message: `Marked ${statusLabel(status).toLowerCase()}.` };
}

/** Give an enquiry to a colleague, or take it off them. */
export async function assignEnquiry(_prev: EnquiryAdminState, fd: FormData): Promise<EnquiryAdminState> {
  const id = str(fd, "enquiryId");
  const assignee = str(fd, "assignedTo");
  if (!id) return { status: "error", message: "Missing enquiry." };

  const actor = await guard(id, assignee ? `assigned enquiry to ${assignee}` : "unassigned enquiry");
  if (refused(actor)) return actor;

  const db = getDb();
  const row = await load(id);
  if (!row) return { status: "error", message: "That enquiry no longer exists." };

  let name = "nobody";
  if (assignee) {
    const [staff] = await db
      .select({ id: users.id, name: users.displayName, email: users.email })
      .from(users)
      .where(and(eq(users.id, assignee), inArray(users.role, STAFF_ROLES), eq(users.status, "active")))
      .limit(1);
    if (!staff) return { status: "error", message: "That person can't be assigned enquiries." };
    name = staff.name || staff.email;
  }
  if ((row.assignedTo ?? "") === assignee) return { status: "ok", message: "No change." };

  await db
    .update(enquiries)
    .set({
      assignedTo: assignee || null,
      // Picking up a new enquiry starts work on it.
      ...(assignee && row.status === "new" ? { status: "in_progress" as const } : {}),
      updatedAt: new Date(),
    })
    .where(eq(enquiries.id, id));
  await log(id, actor.userId, "assigned", assignee ? `Assigned to ${name}` : "Unassigned");

  refresh(id);
  return { status: "ok", message: assignee ? `Assigned to ${name}.` : "Unassigned." };
}

/** An internal note. Never shown to the enquirer. */
export async function addEnquiryNote(_prev: EnquiryAdminState, fd: FormData): Promise<EnquiryAdminState> {
  const id = str(fd, "enquiryId");
  const note = str(fd, "note");
  if (!id) return { status: "error", message: "Missing enquiry." };
  if (!note) return { status: "error", message: "Write the note first." };
  if (note.length > 2000) return { status: "error", message: "Please keep notes under 2,000 characters." };

  const actor = await guard(id, "added an internal note to an enquiry");
  if (refused(actor)) return actor;
  if (!(await load(id))) return { status: "error", message: "That enquiry no longer exists." };

  await log(id, actor.userId, "note", note);
  await getDb().update(enquiries).set({ updatedAt: new Date() }).where(eq(enquiries.id, id));

  refresh(id);
  return { status: "ok", message: "Note added." };
}

const CONTACT_CHANNELS: Record<string, string> = {
  phone: "Phone call",
  email: "Email",
  whatsapp: "WhatsApp",
  other: "Other",
};

/** Record a call or message, and how it went (§16.4: "log date and outcome"). */
export async function logEnquiryContact(_prev: EnquiryAdminState, fd: FormData): Promise<EnquiryAdminState> {
  const id = str(fd, "enquiryId");
  const channel = str(fd, "channel");
  const outcome = str(fd, "outcome");
  if (!id) return { status: "error", message: "Missing enquiry." };
  if (!CONTACT_CHANNELS[channel]) return { status: "error", message: "Choose how you were in touch." };
  if (!outcome) return { status: "error", message: "Say briefly how it went." };
  if (outcome.length > 1000) return { status: "error", message: "Please keep this under 1,000 characters." };

  const actor = await guard(id, `logged ${channel} contact on an enquiry`);
  if (refused(actor)) return actor;
  const row = await load(id);
  if (!row) return { status: "error", message: "That enquiry no longer exists." };

  await log(id, actor.userId, "contact", `${CONTACT_CHANNELS[channel]}: ${outcome}`);
  await getDb()
    .update(enquiries)
    .set({ ...(row.status === "new" ? { status: "in_progress" as const } : {}), updatedAt: new Date() })
    .where(eq(enquiries.id, id));

  refresh(id);
  return { status: "ok", message: "Contact logged." };
}

/**
 * Email the enquirer the link to book and pay for their initial consultation
 * (§19, Route B). They book and pay exactly as everyone else does, so the
 * time is held while they pay and the booking is confirmed by Stripe.
 */
export async function sendEnquiryBookingLink(_prev: EnquiryAdminState, fd: FormData): Promise<EnquiryAdminState> {
  const id = str(fd, "enquiryId");
  const practitionerId = str(fd, "practitionerId");
  if (!id) return { status: "error", message: "Missing enquiry." };

  const actor = await guard(id, "sent a booking link from an enquiry");
  if (refused(actor)) return actor;
  const row = await load(id);
  if (!row) return { status: "error", message: "That enquiry no longer exists." };

  const db = getDb();
  let practitionerName: string | null = null;
  if (practitionerId) {
    const [p] = await db
      .select({ name: users.displayName })
      .from(users)
      .where(and(eq(users.id, practitionerId), inArray(users.role, STAFF_ROLES), eq(users.status, "active")))
      .limit(1);
    if (!p) return { status: "error", message: "That practitioner can't take bookings." };
    practitionerName = p.name;
  }

  const price = await getInitialConsultationPrice();
  const email = bookingLinkEmail({ price: price.label, practitionerId: practitionerId || null, practitionerName });
  const sent = await sendEmail({ to: row.email, subject: email.subject, text: email.text, html: email.html });
  if (!sent.ok) {
    console.error("[enquiries] booking link not sent", sent.reason);
    return { status: "error", message: "The email didn't send. Please try again, or send the link from your own inbox." };
  }

  await log(id, actor.userId, "booking_link", `Booking link sent${practitionerName ? ` for ${practitionerName}` : ""}`);
  await db
    .update(enquiries)
    .set({
      ...(row.status === "new" || row.status === "in_progress" ? { status: "awaiting_client" as const } : {}),
      updatedAt: new Date(),
    })
    .where(eq(enquiries.id, id));

  refresh(id);
  return { status: "ok", message: "Booking link sent." };
}
