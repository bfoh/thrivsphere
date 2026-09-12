import * as React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { CrisisBar } from "@/components/CrisisBar";
import { Logo } from "@/components/icons";

/**
 * Portal chrome.
 *
 * Kept deliberately plain — no marketing nav. Someone signed in here may be
 * mid-registration or about to join a session, and the crisis bar stays
 * because this is exactly where distress is most likely to surface.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CrisisBar />
      <header
        style={{
          position: "sticky",
          top: 30,
          zIndex: 40,
          marginTop: 30,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "rgba(250,249,246,0.94)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(31,58,95,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Link href="/portal" aria-label="ThrivSphere portal" style={{ display: "flex" }}>
            <Logo height={46} />
          </Link>
          <nav style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Overview", href: "/portal" },
              { label: "Book", href: "/portal/book" },
              { label: "Messages", href: "/portal/messages" },
              { label: "Documents", href: "/portal/documents" },
            ].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)", textDecoration: "none" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <UserButton />
      </header>
      <main style={{ background: "var(--warm-white)", minHeight: "calc(100vh - 102px)" }}>
        {children}
      </main>
    </>
  );
}
