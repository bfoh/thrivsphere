import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/icons";
import { getCurrentActor } from "@/lib/session";
import { isStaff } from "@/lib/authz";
import { navFor } from "@/lib/admin-nav";
import { roleLabel } from "@/lib/staff-rules";

/**
 * Admin chrome.
 *
 * No crisis bar: this is the staff side, and the bar is aimed at people seeking
 * support. The confidentiality reminder is aimed at staff instead.
 *
 * The menu is built from the signed-in person's capabilities rather than a
 * fixed list, so a practitioner is never shown a page they cannot open. That is
 * a courtesy, not a control — every page still guards itself.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();

  // A client who reaches the back office belongs in their portal, not at a
  // sign-in wall or an error page.
  if (!actor) redirect("/admin/login");
  if (!isStaff(actor)) redirect("/portal");

  const nav = navFor(actor);
  const service = nav.filter((n) => n.group === "service");
  const organisation = nav.filter((n) => n.group === "organisation");

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          background: "var(--navy)",
          color: "#fff",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link href="/admin" aria-label="ThrivSphere admin" style={{ display: "flex", background: "#fff", borderRadius: 8, padding: 4 }}>
            <Logo height={32} />
          </Link>

          <nav style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            {service.map((n) => (
              <Link key={n.href} href={n.href} style={navLink}>
                {n.label}
              </Link>
            ))}

            {organisation.length > 0 && (
              <>
                <span aria-hidden style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />
                {organisation.map((n) => (
                  <Link key={n.href} href={n.href} style={{ ...navLink, color: "#c8d6e8" }}>
                    {n.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11.5, color: "#9db0c9", letterSpacing: "0.04em", textAlign: "right", lineHeight: 1.4 }}>
            {roleLabel(actor.role)}
            <br />
            CONFIDENTIAL — access is logged
          </span>
          <UserButton />
        </div>
      </header>

      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

const navLink: React.CSSProperties = {
  color: "#dce6f3",
  textDecoration: "none",
  fontSize: 14.5,
  fontWeight: 700,
  whiteSpace: "nowrap",
};
