"use client";

import { useEffect, useState } from "react";

const KEY = "thrivsphere-cookie-consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const decide = (value: "accepted" | "essential") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 80,
        width: "min(290px, calc(100vw - 32px))",
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(31,58,95,0.12)",
        borderRadius: 14,
        boxShadow: "0 16px 40px rgba(31,58,95,0.20)",
        padding: "13px 15px",
      }}
    >
      <p style={{ margin: "0 0 10px", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink)" }}>
        <span style={{ fontWeight: 800, color: "var(--navy)" }}>🍪 Cookies.</span> We use essential
        cookies, plus optional analytics if you allow.{" "}
        <a href="/cookies" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Learn more
        </a>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => decide("accepted")}
          className="pill pill-gold"
          style={{ padding: "8px 14px", fontSize: 12.5, flex: 1 }}
        >
          Accept all
        </button>
        <button
          onClick={() => decide("essential")}
          className="pill pill-ghost"
          style={{ padding: "8px 14px", fontSize: 12.5, flex: 1 }}
        >
          Essential
        </button>
      </div>
    </div>
  );
}
