import type * as React from "react";

export const input: React.CSSProperties = { fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
export const label: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--navy)" };
export const hint: React.CSSProperties = { margin: "5px 0 0", fontSize: 12, color: "var(--navy-soft)", lineHeight: 1.45 };
/** Spacing only; the title style is the shared `adm-title` class. */
export const h1: React.CSSProperties = { margin: "0 0 6px" };
export const lead: React.CSSProperties = { margin: "0 0 22px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)", maxWidth: 680 };
export const errorText = "#a1421c";
