import * as React from "react";

/** Card section used down the client record. */
export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>{title}</h2>
        {subtitle && (
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--navy-soft)" }}>{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Labelled value.
 *
 * `emphasis` is used for facts a practitioner must not miss — notably "do not
 * leave voicemails", where skimming past it could put someone at risk.
 */
export function Field({
  label,
  value,
  small = false,
  emphasis = false,
}: {
  label: string;
  value: string | null | undefined;
  small?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--navy-soft)",
          fontWeight: 800,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: small ? 13.5 : 14.5,
          lineHeight: 1.5,
          color: emphasis ? "#a1421c" : value ? "var(--ink)" : "var(--navy-soft)",
          fontWeight: emphasis ? 700 : 400,
          whiteSpace: "pre-wrap",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 14, color: "var(--navy-soft)", fontStyle: "italic" }}>
      {children}
    </p>
  );
}
