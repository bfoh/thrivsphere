import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { StaffAuthShell } from "@/components/admin/StaffAuthShell";
import { getCurrentActor } from "@/lib/session";
import { isStaff } from "@/lib/authz";
import { invitationQuery, isNewAccountInvitation } from "@/lib/invitation";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

/**
 * Staff entrance.
 *
 * Worth being clear about what this is: a separate **door**, not a separate
 * **lock**. It authenticates against the same provider as the client sign-in,
 * and knowing this URL grants nobody anything.
 *
 * What makes it more than cosmetic is the routing. A client who arrives here —
 * by a shared link, an old bookmark, or curiosity — is sent to their own portal
 * rather than shown an error or left staring at the back office they cannot
 * open. Staff go where they meant to go.
 *
 * A catch-all route, because Clerk moves through the later steps of signing
 * in (a code, a second factor) on paths beneath this one.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Invitations sent before /admin/join existed open here. Their account is
  // still to be created, which only the join page's sign-up form can do.
  const query = await searchParams;
  if (isNewAccountInvitation(query)) redirect(`/admin/join?${invitationQuery(query)}`);

  const actor = await getCurrentActor();
  if (actor) {
    if (isStaff(actor)) redirect("/admin");
    redirect("/portal");
  }

  return (
    <StaffAuthShell
      title="Staff sign in"
      intro="For ThriveSphere staff. Everything you open in the back office is recorded against your name."
    >
      <SignIn forceRedirectUrl="/admin" signUpUrl="/admin/join" />
    </StaffAuthShell>
  );
}
