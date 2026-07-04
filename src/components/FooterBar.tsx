"use client";

import * as React from "react";
import { PillButton } from "./PillButton";
import { Icon } from "./icons";
import { policyLinks } from "@/data/site";

const footerLink: React.CSSProperties = {
  display: "block",
  margin: "0 0 9px",
  fontSize: 14,
  color: "#b9c8dd",
  textDecoration: "none",
};

export function FooterBar({
  hint,
  onBook,
}: {
  hint: string;
  onBook: () => void;
}) {
  return (
    <div
      className="floatingBar"
      style={{
        position: "fixed",
        bottom: 16,
        left: 0,
        right: 0,
        zIndex: 45,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(31,58,95,0.9)",
          backdropFilter: "blur(10px)",
          color: "#fff",
          borderRadius: 50,
          padding: "8px 8px 8px 22px",
          boxShadow: "0 14px 40px rgba(31,58,95,0.32)",
          maxWidth: "94vw",
        }}
      >
        <span
          key={hint}
          className="fadeUp footer-hint"
          style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {hint}
        </span>
        <span style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} className="footer-div" />
        <PillButton variant="gold" size="sm" onClick={onBook} icon="arrow">
          Book a Session
        </PillButton>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <div style={{ position: "relative", zIndex: 1, background: "var(--navy)", color: "#dce6f3" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "56px 48px 40px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gap: 40,
        }}
        className="footer-grid"
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/thrivsphere-logo.png"
            alt="ThrivSphere Wellbeing CIC"
            style={{ height: 88, width: "auto", background: "#fff", borderRadius: 14, padding: 8 }}
          />
          <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, maxWidth: 340, color: "#b9c8dd" }}>
            A UK Community Interest Company providing accessible, confidential online wellbeing
            support for women — helping you heal, grow and thrive.
          </p>
        </div>
        <div>
          <h4 style={{ margin: "0 0 14px", color: "#fff", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Explore
          </h4>
          {[
            { l: "About", h: "/#about" },
            { l: "Our Services", h: "/#services" },
            { l: "Programme", h: "/#programme" },
            { l: "Resource Centre", h: "/resources" },
            { l: "Pricing", h: "/pricing" },
            { l: "Blog", h: "/blog" },
            { l: "Book a Session", h: "/book" },
          ].map((x) => (
            <a key={x.l} href={x.h} style={footerLink}>
              {x.l}
            </a>
          ))}
        </div>
        <div>
          <h4 style={{ margin: "0 0 14px", color: "#fff", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Support &amp; Safety
          </h4>
          <p style={{ margin: "0 0 9px", fontSize: 14, color: "#b9c8dd" }}>Emergency: 999</p>
          <p style={{ margin: "0 0 9px", fontSize: 14, color: "#b9c8dd" }}>Samaritans: 116 123</p>
          <p style={{ margin: "0 0 13px", fontSize: 14, color: "#b9c8dd" }}>Refuge: 0808 2000 247</p>
          {policyLinks.map((p) => (
            <a key={p.href} href={p.href} style={footerLink}>
              {p.label}
            </a>
          ))}
        </div>
      </div>
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "18px 48px",
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          fontSize: 12.5,
          color: "#9db0c9",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="mail" size={15} /> hello@thrivsphere.org.uk
        </span>
        <span>© {new Date().getFullYear()} ThrivSphere Wellbeing CIC. All rights reserved.</span>
      </div>
    </div>
  );
}
