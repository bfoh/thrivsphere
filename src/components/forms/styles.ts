import type * as React from "react";

/** Shared form styles, matching the safeguarding and note forms. */
export const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 15,
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.2)",
  background: "#fff",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "var(--navy)",
  display: "block",
  marginBottom: 5,
  lineHeight: 1.4,
};

export const hintStyle: React.CSSProperties = {
  margin: "0 0 7px",
  fontSize: 13,
  color: "var(--navy-soft)",
  lineHeight: 1.5,
};

export const errorStyle: React.CSSProperties = {
  margin: "5px 0 0",
  fontSize: 13,
  fontWeight: 700,
  color: "#a1421c",
};

export const statusStyle = (ok: boolean): React.CSSProperties => ({
  margin: 0,
  fontSize: 13.5,
  fontWeight: 700,
  color: ok ? "var(--teal-deep)" : "#a1421c",
  lineHeight: 1.5,
});
