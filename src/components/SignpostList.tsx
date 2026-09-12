import * as React from "react";
import { Icon } from "./icons";
import { signpostCategories, signposts } from "@/data/site";

/**
 * Signposting directory, grouped by category.
 *
 * Signposting is a service in its own right, not a disclaimer — where someone's
 * needs fall outside our scope this is how we point them somewhere better. In
 * Stage 2 the same data lives in `signposting_directory` and backs the admin
 * referral picker, so recorded referrals map to these organisations.
 */
export function SignpostList() {
  return (
    <div id="signposting" style={{ scrollMarginTop: 120 }}>
      {signpostCategories.map((cat) => {
        const items = signposts.filter((s) => s.category === cat.key);
        if (!items.length) return null;
        return (
          <section key={cat.key} style={{ marginBottom: 30 }}>
            <h3
              style={{
                margin: "0 0 14px",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--navy-soft)",
              }}
            >
              {cat.label}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((s) => (
                <div
                  key={s.name}
                  className="card"
                  style={{
                    padding: "18px 22px",
                    borderLeft: s.urgent ? "4px solid var(--gold)" : "4px solid var(--teal)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: 16.5, color: "var(--navy)", fontWeight: 800 }}>
                      {s.name}
                    </h4>
                    {s.phone && (
                      <a
                        href={telHref(s.phone)}
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "var(--teal-deep)",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.phone}
                      </a>
                    )}
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)" }}>
                    {s.detail}
                  </p>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tile-arrow"
                      style={{ marginTop: 10 }}
                    >
                      Visit website <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** "Text SHOUT to 85258" and similar are instructions, not diallable numbers. */
function telHref(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  const isPlainNumber = /^[\d\s]+$/.test(phone);
  return isPlainNumber ? `tel:${digits}` : "#";
}
