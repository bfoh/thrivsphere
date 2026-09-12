import "server-only";

import { redirect } from "next/navigation";
import { getCurrentActor } from "./session";
import { getOnboardingState, type OnboardingState } from "./onboarding";
import { isStaff } from "./authz";

/**
 * Gate for portal pages that need a completed client record.
 *
 * Three cases, deliberately distinguished:
 *
 *  - A client who has not finished registering goes to /portal/register. That
 *    is the point of the gate.
 *  - A client who has finished gets their state back.
 *  - A **staff member with no client record of their own** goes to /admin.
 *    Pushing a practitioner through an 18+ confirmation and a consent flow
 *    written for people seeking support is nonsense, and worse, it invites
 *    them to create a client record for themselves just to get past it.
 *
 * Staff who genuinely are also clients — plausible in a small CIC — keep a
 * working portal, because the check is "do they have a client record", not
 * "are they staff".
 *
 * One helper rather than the same three lines on five pages: an access rule
 * copied five times is an access rule that will eventually differ in one of
 * them.
 */
export async function requirePortalClient(): Promise<
  OnboardingState & { clientId: string }
> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const state = await getOnboardingState(actor.userId);

  if (state.step === "complete" && state.clientId) {
    return { ...state, clientId: state.clientId };
  }

  // Staff with nothing of their own here belong in the admin area.
  if (isStaff(actor) && !state.clientId) redirect("/admin");

  redirect("/portal/register");
}
