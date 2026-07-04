"use client";

import { Logo } from "./icons";
import { PillButton } from "./PillButton";
import { MobileMenu } from "./MobileMenu";
import { nav } from "@/data/site";

export function TopNav({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
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
      <button
        onClick={() => onNavigate("home")}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        aria-label="ThrivSphere home"
      >
        <Logo height={50} />
      </button>

      <nav style={{ display: "flex", alignItems: "center", gap: 24 }} className="nav-links">
        {nav.map((it) =>
          it.section ? (
            <button
              key={it.label}
              onClick={() => onNavigate(it.section!)}
              className="nav-item"
              style={navLinkStyle(active === it.section)}
            >
              {it.label}
            </button>
          ) : (
            <a key={it.label} href={it.href} className="nav-item" style={navLinkStyle(false)}>
              {it.label}
            </a>
          )
        )}
        <span className="nav-cta">
          <PillButton variant="gold" size="sm" href="/book" icon="arrow">
            Book a Session
          </PillButton>
        </span>
        <MobileMenu onSection={onNavigate} />
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
