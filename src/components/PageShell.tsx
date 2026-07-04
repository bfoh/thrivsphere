import * as React from "react";
import { CrisisBar } from "./CrisisBar";
import { SiteFooter } from "./FooterBar";
import { PageWatermark } from "./PageWatermark";
import { MobileMenu } from "./MobileMenu";
import { Logo, Icon } from "./icons";
import { nav } from "@/data/site";

/** Chrome for routed sub-pages: crisis bar + sticky header + footer. */
export function PageShell({
  eyebrow,
  title,
  intro,
  aura = "warm",
  watermark,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  aura?: "warm" | "teal" | "sage";
  watermark?: string;
  children: React.ReactNode;
}) {
  const band = watermark ?? title.split(" ")[0];
  const bg =
    aura === "teal"
      ? "linear-gradient(160deg,#4fa8a8 0%,#3d8a8a 100%)"
      : aura === "sage"
        ? "linear-gradient(160deg,#f2f6ee 0%,#e6efe1 100%)"
        : "linear-gradient(135deg,#faf9f6 0%,#eef5f2 100%)";
  const onTeal = aura === "teal";

  return (
    <>
      <CrisisBar />
      <header
        style={{
          position: "sticky",
          top: 30,
          zIndex: 40,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(31,58,95,0.08)",
          height: 74,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          marginTop: 30,
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center" }} aria-label="ThrivSphere home">
          <Logo height={50} />
        </a>
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }} className="nav-links">
          <a href="/" className="nav-item" style={link}>
            Home
          </a>
          {nav.map((it) => (
            <a
              key={it.label}
              href={it.section ? `/#${it.section}` : it.href}
              className="nav-item"
              style={link}
            >
              {it.label}
            </a>
          ))}
          <a href="/book" className="pill pill-gold nav-cta" style={{ padding: "9px 18px", fontSize: 13 }}>
            Book a Session <Icon name="arrow" size={16} />
          </a>
          <MobileMenu />
        </nav>
      </header>

      {/* page hero */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: bg,
          borderBottom: "1px solid rgba(31,58,95,0.06)",
          minHeight: 300,
        }}
      >
        <PageWatermark word={band} tone={onTeal ? "light" : "dark"} />
        <div className="page-hero-inner" style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "70px 40px 60px" }}>
          <span
            className="eyebrow"
            style={onTeal ? { color: "#fff" } : undefined}
          >
            {eyebrow}
          </span>
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: 44,
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: "-0.015em",
              color: onTeal ? "#fff" : "var(--navy)",
              maxWidth: 780,
            }}
            className="page-title"
          >
            {title}
          </h1>
          {intro && (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: 17,
                lineHeight: 1.6,
                maxWidth: 720,
                color: onTeal ? "#e9f4f4" : "var(--ink)",
              }}
            >
              {intro}
            </p>
          )}
        </div>
      </section>

      <main style={{ background: "var(--warm-white)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 40px 80px" }} className="page-body">
          {children}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

const link: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "var(--navy)",
  textDecoration: "none",
};
