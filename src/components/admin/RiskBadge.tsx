import * as React from "react";

const TONE: Record<string, { bg: string; fg: string; label: string }> = {
  immediate: { bg: "#b4302020", fg: "#8c2a1c", label: "Immediate risk" },
  high: { bg: "#c8532420", fg: "#a1421c", label: "High risk" },
  medium: { bg: "#bd951f24", fg: "#856a12", label: "Medium risk" },
  low: { bg: "#4fa8a820", fg: "#2f6d6d", label: "Low risk" },
};

/** Compact risk indicator, used in the client list and on the record header. */
export function RiskBadge({ level, compact = false }: { level: string; compact?: boolean }) {
  const t = TONE[level] ?? TONE.low;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact ? "3px 9px" : "5px 12px",
        borderRadius: 50,
        background: t.bg,
        color: t.fg,
        fontSize: compact ? 11.5 : 12.5,
        fontWeight: 800,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.fg }} />
      {t.label}
    </span>
  );
}
