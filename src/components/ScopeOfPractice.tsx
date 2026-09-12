import * as React from "react";
import { Icon } from "./icons";
import { scopeOfPractice } from "@/data/site";
import Link from "next/link";

/**
 * "What we are / what we are not" panel.
 *
 * ThrivSphere is a non-clinical service, and saying so plainly is a
 * safeguarding measure as much as a positioning one — people need to know
 * before they rely on us. Shown on About, Services and Book, and reused by the
 * Stage 2 intake flow where the client must read it before consenting.
 */
export function ScopeOfPractice({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="scope-heading" style={{ marginTop: compact ? 0 : 8 }}>
      <h2
        id="scope-heading"
        style={{
          margin: "0 0 6px",
          fontSize: compact ? 21 : 26,
          fontWeight: 800,
          color: "var(--navy)",
          letterSpacing: "-0.01em",
        }}
      >
        Our scope of practice
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)", maxWidth: 680 }}>
        Being clear about what we do — and what we don&apos;t — is part of keeping you safe.
      </p>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Column
          title={scopeOfPractice.isTitle}
          items={scopeOfPractice.is}
          tone="yes"
          icon="check"
        />
        <Column
          title={scopeOfPractice.isNotTitle}
          items={scopeOfPractice.isNot}
          tone="no"
          icon="close"
        />
      </div>

      <p
        style={{
          margin: "18px 0 0",
          padding: "14px 18px",
          borderRadius: 12,
          background: "rgba(212,175,55,0.1)",
          border: "1px solid rgba(212,175,55,0.28)",
          fontSize: 14.5,
          lineHeight: 1.6,
          color: "var(--navy)",
        }}
      >
        {scopeOfPractice.note}{" "}
        <Link href="/resources#signposting" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          See where else you can turn
        </Link>
        .
      </p>
    </section>
  );
}

function Column({
  title,
  items,
  tone,
  icon,
}: {
  title: string;
  items: string[];
  tone: "yes" | "no";
  icon: string;
}) {
  const accent = tone === "yes" ? "var(--teal-deep)" : "#b4553f";
  return (
    <div
      className="card"
      style={{
        padding: 26,
        borderTop: `4px solid ${tone === "yes" ? "var(--teal)" : "#c86b52"}`,
      }}
    >
      <h3 style={{ margin: "0 0 14px", fontSize: 17, color: "var(--navy)", fontWeight: 800 }}>
        {title}
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
        {items.map((it) => (
          <li key={it} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>
            <span style={{ flex: "0 0 auto", marginTop: 1 }}>
              <Icon name={icon} size={17} stroke={accent} />
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
