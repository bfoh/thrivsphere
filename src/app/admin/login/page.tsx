import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/icons";
import { getCurrentActor } from "@/lib/session";
import { isStaff } from "@/lib/authz";

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
 * No crisis bar here, unlike every client-facing page: this one is for people
 * delivering the service, not seeking it.
 */
export default async function AdminLoginPage() {
  const actor = await getCurrentActor();

  if (actor) {
    if (isStaff(actor)) redirect("/admin");
    redirect("/portal");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--navy)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "56px 20px",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 8, marginBottom: 26 }}>
        <Logo height={44} />
      </div>

      <h1
        style={{
          margin: "0 0 8px",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontWeight: 800,
          color: "#fff",
          textAlign: "center",
          letterSpacing: "-0.015em",
        }}
      >
        Staff sign in
      </h1>
      <p style={{ margin: "0 0 30px", fontSize: 14.5, color: "#a9bcd4", textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>
        For ThrivSphere staff. Everything you open in the back office is recorded
        against your name.
      </p>

      <SignIn forceRedirectUrl="/admin" signUpUrl="/admin/login" />

      <p style={{ margin: "28px 0 0", fontSize: 13.5, color: "#a9bcd4", textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>
        Looking for your own appointments and messages?{" "}
        <Link href="/sign-in" style={{ color: "#8fd0d0", fontWeight: 700 }}>
          Client sign in
        </Link>
      </p>

      <p style={{ margin: "14px 0 0", fontSize: 13 }}>
        <Link href="/" style={{ color: "#8fd0d0", textDecoration: "none" }}>
          Back to the website
        </Link>
      </p>
    </main>
  );
}
