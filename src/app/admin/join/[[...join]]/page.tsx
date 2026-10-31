import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton, SignUp } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { StaffAuthShell } from "@/components/admin/StaffAuthShell";
import { getCurrentActor } from "@/lib/session";
import { isStaff } from "@/lib/authz";
import { acceptedJustNow, invitationQuery } from "@/lib/invitation";

export const metadata: Metadata = {
  title: "Join the team",
  robots: { index: false, follow: false },
};

/**
 * Where a staff invitation opens.
 *
 * Clerk's sign-up form reads the invitation's one-time ticket, so the email
 * address is already confirmed and the role the founder chose is applied as
 * the account is created. Staff accounts exist only by invitation: opened
 * without one, this sends people to sign in instead.
 *
 * A catch-all route, because Clerk moves through the later steps of signing
 * up on paths beneath this one.
 */
export default async function StaffJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ join?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ join }, query] = await Promise.all([params, searchParams]);
  const invitation = invitationQuery(query);
  const actor = await getCurrentActor();

  if (!invitation) {
    if (actor) redirect(isStaff(actor) ? "/admin" : "/portal");
    // The later steps carry no ticket; only the first page needs one.
    if (!join) redirect("/admin/login");
  }

  if (actor && invitation) {
    // Clerk reloads this page the moment the new account is signed in, before
    // it moves on to /admin. That is the person who has just accepted.
    const user = await currentUser();
    if (user && acceptedJustNow(user.createdAt)) redirect(isStaff(actor) ? "/admin" : "/portal");

    // Otherwise someone else is signed in on this device, such as the founder
    // checking the invitation on their own phone. Accepting means signing out.
    return (
      <StaffAuthShell
        title="Accept your invitation"
        intro="You're signed in to another account on this device. Sign out, and the invitation will open again so you can set up your staff account."
      >
        <SignOutButton redirectUrl={`/admin/join?${invitation}`}>
          <button className="pill pill-gold" style={{ padding: "12px 26px", fontSize: 14.5, border: "none", cursor: "pointer" }}>
            Sign out and continue
          </button>
        </SignOutButton>
      </StaffAuthShell>
    );
  }

  return (
    <StaffAuthShell
      title="Join the ThriveSphere team"
      intro="Set up your staff account. Everything you open in the back office is recorded against your name."
    >
      <SignUp forceRedirectUrl="/admin" signInUrl="/admin/login" />
    </StaffAuthShell>
  );
}
