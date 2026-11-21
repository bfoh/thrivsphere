"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, referrals, suitabilityDecisions } from "@/db/schema";
import { requireCapabilityForClient } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { sendEmail } from "@/lib/email";
import { paymentAlert, sessionsOpen } from "@/lib/email-templates";
import { latestSuitability } from "@/lib/booking-engine";
import { outcomeLabel, parseDecision } from "@/lib/suitability-rules";
import { brand } from "@/data/site";
import type { SuitabilityState } from "@/lib/suitability-state";

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Record the outcome of the Initial Wellbeing Consultation (IT handover
 * §13.1): Suitable, Clarification or further support needed, or Not
 * suitable — signpost, with the practitioner's rationale.
 *
 * - **Suitable** opens booking for ongoing sessions, and the client is told
 *   they can book. This is the only way sessions open.
 * - **Clarification** keeps them closed; the practitioner follows up.
 * - **Not suitable** keeps them closed, records the signposting as a
 *   referral, marks the client declined, and reminds the owner that the £30
 *   may need refunding in Stripe. Nothing is emailed to the client: the
 *   practitioner explains it to them in person.
 *
 * Decisions are only ever added, so a changed decision is a new row and the
 * record keeps every one.
 */
export async function recordSuitability(_prev: SuitabilityState, fd: FormData): Promise<SuitabilityState> {
  const clientId = str(fd, "clientId");
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return { status: "error", message: "Missing client." };

  const parsed = parseDecision({
    outcome: str(fd, "outcome"),
    rationale: str(fd, "rationale"),
    signpostedTo: str(fd, "signpostedTo"),
  });
  if (!parsed.ok) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }
  const { outcome, rationale, signpostedTo } = parsed.value;

  let actor;
  try {
    actor = await requireCapabilityForClient("notes:write", clientId, {
      entity: "suitability_decisions",
      action: "create",
      detail: `recorded consultation outcome: ${outcome}`,
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return { status: "error", message: "Your session has expired. Please sign in again." };
    if (err instanceof ForbiddenError) return { status: "error", message: "You do not have permission to do that." };
    throw err;
  }

  const db = getDb();
  const now = new Date();
  const [[client], previous, [consultation]] = await Promise.all([
    db.select({ email: clients.email }).from(clients).where(eq(clients.id, clientId)).limit(1),
    latestSuitability(clientId),
    // The consultation this decision follows: their latest initial
    // appointment that has started.
    db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          eq(appointments.kind, "initial"),
          inArray(appointments.status, ["scheduled", "completed"]),
          lte(appointments.startsAt, now)
        )
      )
      .orderBy(desc(appointments.startsAt))
      .limit(1),
  ]);
  if (!client) return { status: "error", message: "That client no longer exists." };

  await db.insert(suitabilityDecisions).values({
    clientId,
    appointmentId: consultation?.id ?? null,
    outcome,
    rationale,
    signpostedTo,
    decidedBy: actor.userId,
  });

  if (outcome === "not_suitable") {
    await Promise.all([
      db.insert(referrals).values({
        clientId,
        organisationName: signpostedTo!,
        reason: "Signposted after the Initial Wellbeing Consultation",
        outcome: "pending",
        madeBy: actor.userId,
      }),
      db.update(clients).set({ status: "declined", updatedAt: now }).where(eq(clients.id, clientId)),
    ]);
  } else if (outcome === "suitable") {
    await db.update(clients).set({ status: "active", updatedAt: now }).where(eq(clients.id, clientId));
  }

  // Emails never fail the decision, which is already saved.
  try {
    if (outcome === "suitable" && previous !== "suitable") {
      const email = sessionsOpen();
      const sent = await sendEmail({ to: client.email, subject: email.subject, text: email.text, html: email.html });
      if (!sent.ok) console.error("[suitability] client email not sent:", sent.reason);
    }
    if (outcome === "not_suitable") {
      const alert = paymentAlert({
        subject: "A consultation fee may need refunding",
        lines: [
          "A consultation outcome was recorded today, and the client was signposted to another service.",
          "If their £30 is to be refunded, refund it in the Stripe Dashboard; the website updates their account itself.",
        ],
        clientId,
      });
      const sent = await sendEmail({
        to: process.env.ENQUIRY_TO_EMAIL ?? brand.email,
        subject: alert.subject,
        text: alert.text,
        html: alert.html,
      });
      if (!sent.ok) console.error("[suitability] owner alert not sent:", sent.reason);
    }
  } catch (err) {
    console.error("[suitability] notification failed", err);
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  return {
    status: "ok",
    message:
      outcome === "suitable"
        ? "Recorded as Suitable. The client can now book ongoing sessions, and has been emailed."
        : outcome === "not_suitable"
          ? "Recorded, and the signposting added under Referrals. The owner has been reminded about a refund."
          : `Recorded as ${outcomeLabel(outcome)}. Sessions stay closed until a further decision.`,
  };
}
