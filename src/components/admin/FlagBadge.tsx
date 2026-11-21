import * as React from "react";

/**
 * Marks a client with an active safeguarding flag. There is no level:
 * ThriveSphere does not score risk.
 */
export function FlagBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact ? "3px 9px" : "5px 12px",
        borderRadius: 50,
        background: "#c8532420",
        color: "#a1421c",
        fontSize: compact ? 11.5 : 12.5,
        fontWeight: 800,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#a1421c" }} />
      Safeguarding flag
    </span>
  );
}
