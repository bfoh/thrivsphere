"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { nav } from "@/data/site";

type Item = { label: string; section?: string; href: string };

/**
 * Mobile navigation: hamburger toggles a full-width dropdown panel.
 * On the homepage, section items scroll (via onSection); routes use links.
 * On sub-pages (no onSection), every item is a link.
 */
export function MobileMenu({ onSection }: { onSection?: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  const items: Item[] = [
    { label: "Home", section: "home", href: "/" },
    ...nav.map((n) => ({
      label: n.label,
      section: n.section,
      href: n.section ? `/#${n.section}` : n.href!,
    })),
  ];

  const close = () => setOpen(false);

  return (
    <>
      <button
        className="nav-burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "none",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--navy)",
          padding: 6,
        }}
      >
        <Icon name={open ? "close" : "menu"} size={26} />
      </button>

      {open && (
        <>
          <div onClick={close} className="mobileMenu-scrim" />
          <nav className="mobileMenu">
            {items.map((it) =>
              onSection && it.section ? (
                <button
                  key={it.label}
                  onClick={() => {
                    onSection(it.section!);
                    close();
                  }}
                  className="mobileMenu-link"
                >
                  {it.label}
                </button>
              ) : (
                <a key={it.label} href={it.href} onClick={close} className="mobileMenu-link">
                  {it.label}
                </a>
              )
            )}
            <a href="/book" onClick={close} className="pill pill-gold" style={{ marginTop: 8, padding: "13px 22px", fontSize: 15, justifyContent: "center" }}>
              Book a Session <Icon name="arrow" size={17} />
            </a>
          </nav>
        </>
      )}
    </>
  );
}
