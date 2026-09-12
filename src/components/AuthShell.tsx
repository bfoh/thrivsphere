import * as React from "react";
import Link from "next/link";
import { CrisisBar } from "./CrisisBar";
import { Logo, Icon } from "./icons";

/**
 * Chrome for the sign-in and sign-up pages.
 *
 * Lighter than PageShell — no nav to wander off into mid-registration — but it
 * keeps the crisis bar, because someone in distress may well arrive here
 * first, and the emergency numbers should never be more than a glance away.
 */
export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <CrisisBar />
      <main
        style={{
          minHeight: "100vh",
          paddingTop: 30,
          background: "linear-gradient(135deg,#faf9f6 0%,#eef5f2 55%,#e7f0ee 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ padding: "28px 20px 8px" }}>
          <Link href="/" aria-label="ThrivSphere home" style={{ display: "block" }}>
            <Logo height={54} />
          </Link>
        </div>

        <div style={{ width: "100%", maxWidth: 560, padding: "12px 20px 48px", textAlign: "center" }}>
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 800,
              color: "var(--navy)",
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </h1>
          {intro && (
            <p
              style={{
                margin: "0 auto 26px",
                maxWidth: 440,
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--ink)",
              }}
            >
              {intro}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "center" }}>{children}</div>

          <p
            style={{
              margin: "26px auto 0",
              maxWidth: 440,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "var(--navy-soft)",
            }}
          >
            ThrivSphere is for adults aged 18 and over. We are not an emergency or crisis
            service — if you need help now, call <strong>999</strong> or Samaritans on{" "}
            <strong>116 123</strong>.
          </p>

          <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--navy-soft)" }}>
            <Link href="/privacy" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Privacy
            </Link>
            {" · "}
            <Link href="/confidentiality" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Confidentiality
            </Link>
            {" · "}
            <Link href="/terms" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Terms
            </Link>
          </p>

          <p style={{ margin: "20px 0 0", fontSize: 13.5 }}>
            <Link
              href="/"
              style={{
                color: "var(--teal-deep)",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
                <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
              </span>
              Back to the website
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
