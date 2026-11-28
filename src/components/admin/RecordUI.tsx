import * as React from "react";

/** Card section used down the client record. */
export function Section({
  id,
  title,
  subtitle,
  children,
}: {
  /** An anchor, so other pages can link straight to this section. */
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="adm-card">
      <div className="adm-card-head">
        <div>
          <h2 className="adm-card-title">{title}</h2>
          {subtitle && <p className="adm-card-sub">{subtitle}</p>}
        </div>
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
          fontSize: "var(--fs-xs)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--navy-soft)",
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: small ? "var(--fs-sm)" : "var(--fs-base)",
          lineHeight: 1.5,
          color: emphasis ? "var(--a-danger)" : value ? "var(--ink)" : "var(--navy-soft)",
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
    <p className="adm-empty">{children}</p>
  );
}
