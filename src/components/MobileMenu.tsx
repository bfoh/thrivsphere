"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { nav } from "@/data/site";

/** Mobile navigation: hamburger toggles a full-width dropdown panel. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const items = [{ label: "Home", href: "/" }, ...nav];

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
            {items.map((it) => (
              <Link key={it.label} href={it.href} onClick={close} className="mobileMenu-link">
                {it.label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={close}
              className="pill pill-gold"
              style={{ marginTop: 8, padding: "13px 22px", fontSize: 15, justifyContent: "center" }}
            >
              Book a Consultation <Icon name="arrow" size={17} />
            </Link>
          </nav>
        </>
      )}
    </>
  );
}
