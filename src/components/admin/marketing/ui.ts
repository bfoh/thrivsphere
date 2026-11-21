import type * as React from "react";

export const input: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14.5,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  color: "var(--ink)",
};
export const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 };
export const hint: React.CSSProperties = { margin: "5px 0 0", fontSize: 12, color: "var(--navy-soft)", lineHeight: 1.45 };
export const page: React.CSSProperties = { maxWidth: 1080, margin: "0 auto", padding: "28px 24px 72px" };
export const h1: React.CSSProperties = { margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "var(--navy)" };
export const lead: React.CSSProperties = { margin: "0 0 22px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)", maxWidth: 680 };
export const errorText = "#a1421c";
