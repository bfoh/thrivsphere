import * as React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/icons";

/**
 * Admin chrome.
 *
 * No crisis bar here: this is the staff side, and the bar is aimed at people
 * seeking support. The confidentiality reminder in the footer is aimed at
 * staff instead.
 */
const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Appointments", href: "/admin/appointments" },
  { label: "Availability", href: "/admin/availability" },
  { label: "Safeguarding", href: "/admin/safeguarding" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          height: 66,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "var(--navy)",
          color: "#fff",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Link href="/admin" aria-label="ThrivSphere admin" style={{ display: "flex", background: "#fff", borderRadius: 8, padding: 4 }}>
            <Logo height={32} />
          </Link>
          <nav style={{ display: "flex", gap: 18 }}>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                style={{ color: "#dce6f3", textDecoration: "none", fontSize: 14.5, fontWeight: 700 }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11.5, color: "#9db0c9", letterSpacing: "0.04em" }}>
            CONFIDENTIAL — access is logged
          </span>
          <UserButton />
        </div>
      </header>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
