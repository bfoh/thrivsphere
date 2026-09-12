"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./icons";
import { MobileMenu } from "./MobileMenu";
import { AccountNavLink } from "./AccountNavLink";
import { nav } from "@/data/site";

/**
 * Fixed header for the homepage deck.
 *
 * Every nav item is a real route now, so the active item comes from the
 * pathname rather than from scroll position.
 */
export function TopNav() {
  const pathname = usePathname();

  return (
    <header
      style={{
        position: "fixed",
        top: 30,
        left: 0,
        right: 0,
        height: 74,
        zIndex: 55,
        background: "rgba(250,249,246,0.86)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(31,58,95,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
      }}
    >
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center" }}
        aria-label="ThrivSphere home"
      >
        <Logo height={50} />
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: 24 }} className="nav-links">
        {nav.map((it) => {
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.label}
              href={it.href}
              className="nav-item"
              aria-current={active ? "page" : undefined}
              style={navLinkStyle(active)}
            >
              {it.label}
            </Link>
          );
        })}
        <AccountNavLink className="nav-cta" />
        <MobileMenu />
      </nav>
    </header>
  );
}

function navLinkStyle(activeItem: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 700,
    textDecoration: "none",
    color: activeItem ? "var(--teal-deep)" : "var(--navy)",
    borderBottom: activeItem ? "2px solid var(--gold)" : "2px solid transparent",
    paddingBottom: 2,
    transition: "color 0.2s ease",
  };
}
