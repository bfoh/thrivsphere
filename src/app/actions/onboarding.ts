"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, consents, intakeSubmissions, users } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import {
  INTAKE_VERSION,
  REQUIRED_CONSENTS,
  getOnboardingState,
  isAdult,
} from "@/lib/onboarding";
import { policies } from "@/data/policies";
import type { OnboardingFormState } from "@/lib/onboarding-state";

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function requestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

/**
 * Step 1 — the 18+ gate.
 *
 * ThrivSphere is an adults-only service, so this has to actually refuse rather
 * than merely ask. Age is computed from the date of birth on the server; the
 * confirmation checkbox is recorded alongside it but is not what decides.
 *
 * Someone under 18 is not given a record and not stored beyond the audit line
 * that the attempt happened — they are redirected to age-appropriate support.
 * Keeping a child's details on the basis of a registration we refused would be
 * hard to justify under data minimisation.
 */
export async function confirmAgeAndRegister(
  _prev: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const preferredName = str(formData, "preferredName");
  const dob = str(formData, "dateOfBirth");
  const confirmed = formData.get("confirmAdult") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!preferredName || preferredName.length > 100) {
    fieldErrors.preferredName = "Please tell us what to call you.";
  }

  const dobDate = dob ? new Date(dob) : null;
  if (!dobDate || Number.isNaN(dobDate.getTime())) {
    fieldErrors.dateOfBirth = "Please enter your date of birth.";
  } else if (dobDate > new Date()) {
    fieldErrors.dateOfBirth = "That date is in the future.";
  } else if (dobDate < new Date("1900-01-01")) {
    fieldErrors.dateOfBirth = "Please check the year.";
  }

  if (!confirmed) {
    fieldErrors.confirmAdult = "We can only work with adults aged 18 or over.";
  }

  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }

  // The gate itself.
  if (!isAdult(dobDate!)) {
    await recordAudit({
      actorId: actor.userId,
      action: "permission_denied",
      entity: "clients",
      detail: "registration refused: under 18",
    });
    redirect("/portal/not-eligible");
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, actor.userId)).limit(1);
  if (!user) redirect("/sign-in");

  const meta = await requestMeta();

  const [client] = await db
    .insert(clients)
    .values({
      userId: user.id,
      preferredName,
      dateOfBirth: dob,
      email: user.email,
      confirmedAdult: true,
      confirmedAdultAt: new Date(),
      status: "registered",
    })
    .onConflictDoNothing()
    .returning();

  // Handle a re-submission where the record already exists.
  const clientId =
    client?.id ??
    (
      await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.userId, user.id))
        .limit(1)
    )[0]?.id;

  if (!clientId) {
    return { status: "error", message: "We couldn't create your account. Please try again." };
  }

  if (!client) {
    await db
      .update(clients)
      .set({
        preferredName,
        dateOfBirth: dob,
        confirmedAdult: true,
        confirmedAdultAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId));
  }

  // Record the age confirmation as a consent in its own right, so the gate is
  // evidenced rather than only implied by a boolean on the client row.
  await db
    .insert(consents)
    .values({
      clientId,
      type: "age_18_plus",
      policySlug: "terms",
      policyVersion: policies.terms?.version ?? null,
      granted: true,
      ...meta,
    })
    .onConflictDoNothing();

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "clients",
    entityId: clientId,
    subjectClientId: clientId,
    detail: "registered and confirmed 18+",
  });

  redirect("/portal/register");
}

/** Step 2 — intake. Stored as versioned JSON against the question set used. */
export async function submitIntake(
  _prev: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const state = await getOnboardingState(actor.userId);
  if (!state.clientId || state.step === "age") redirect("/portal/register");

  const presentingConcern = str(formData, "presentingConcern");
  if (!presentingConcern) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: { presentingConcern: "Please tell us a little about what brings you here." },
    };
  }

  const answers = {
    presentingConcern,
    supportAreas: formData.getAll("supportAreas").map(String),
    hopingToAchieve: str(formData, "hopingToAchieve"),
    previousSupport: str(formData, "previousSupport"),
    gpRegistered: str(formData, "gpRegistered"),
    safeToContactByPhone: formData.get("safeToContactByPhone") === "on",
    contactNotes: str(formData, "contactNotes"),
    pronouns: str(formData, "pronouns"),
    genderSelfDescribed: str(formData, "genderSelfDescribed"),
    accessibilityNeeds: str(formData, "accessibilityNeeds"),
  };

  const db = getDb();
  await db.insert(intakeSubmissions).values({
    clientId: state.clientId,
    formVersion: INTAKE_VERSION,
    answers,
    presentingConcern,
  });

  // Mirror the few fields the practitioner needs at a glance onto the record.
  await db
    .update(clients)
    .set({
      pronouns: answers.pronouns || null,
      genderSelfDescribed: answers.genderSelfDescribed || null,
      phone: str(formData, "phone") || null,
      safeToContactByPhone: answers.safeToContactByPhone,
      contactNotes: answers.contactNotes || null,
      emergencyContactName: str(formData, "emergencyContactName") || null,
      emergencyContactPhone: str(formData, "emergencyContactPhone") || null,
      gpPractice: str(formData, "gpPractice") || null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, state.clientId));

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "intake_submissions",
    subjectClientId: state.clientId,
    detail: `intake submitted (${INTAKE_VERSION})`,
  });

  redirect("/portal/register");
}

/**
 * Step 3 — consent.
 *
 * Each consent is pinned to the version of the policy that was on screen, so
 * "what did they actually agree to?" has an answer, and bumping a policy
 * version is what brings someone back here.
 */
export async function recordConsents(
  _prev: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const state = await getOnboardingState(actor.userId);
  if (!state.clientId || state.step === "age") redirect("/portal/register");

  const missing = REQUIRED_CONSENTS.filter((c) => formData.get(c.type) !== "on");
  if (missing.length) {
    return {
      status: "error",
      message:
        "We need each of these before we can begin. If anything here concerns you, please contact us instead.",
      fieldErrors: Object.fromEntries(
        missing.map((c) => [c.type, "Please confirm you have read and agree to this."])
      ),
    };
  }

  const meta = await requestMeta();
  const db = getDb();

  await db.insert(consents).values(
    REQUIRED_CONSENTS.map((c) => ({
      clientId: state.clientId!,
      type: c.type,
      policySlug: c.policySlug,
      policyVersion: policies[c.policySlug]?.version ?? null,
      granted: true,
      ...meta,
    }))
  );

  await db
    .update(clients)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(clients.id, state.clientId));

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "consents",
    subjectClientId: state.clientId,
    detail: `consents recorded: ${REQUIRED_CONSENTS.map((c) => c.type).join(", ")}`,
  });

  redirect("/portal");
}
