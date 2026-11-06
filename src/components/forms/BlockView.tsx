import * as React from "react";
import type { Block } from "@/lib/forms/types";
import { hintStyle } from "./styles";

/** Guidance and reference tables, shared with the read-only view. */
export function BlockView({ block, clientId }: { block: Block; clientId?: string }) {
  if (block.kind === "table") {
    return (
      <div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              {block.columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  style={{ textAlign: "left", padding: "8px 10px", background: "rgba(31,58,95,0.06)", color: "var(--navy)", fontWeight: 800 }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map(([a, b]) => (
              <tr key={a}>
                <th scope="row" style={{ textAlign: "left", padding: "8px 10px", borderTop: "1px solid rgba(31,58,95,0.1)", color: "var(--navy)", whiteSpace: "nowrap", verticalAlign: "top" }}>
                  {a}
                </th>
                <td style={{ padding: "8px 10px", borderTop: "1px solid rgba(31,58,95,0.1)", color: "var(--ink)", lineHeight: 1.5 }}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {block.caption && <p style={{ ...hintStyle, margin: "8px 0 0", fontStyle: "italic" }}>{block.caption}</p>}
      </div>
    );
  }

  const tone = block.tone ?? "plain";
  const box: React.CSSProperties =
    tone === "safety"
      ? { background: "var(--navy)", color: "#e7eefa", borderRadius: 12, padding: "14px 18px" }
      : tone === "note"
        ? { background: "rgba(79,168,168,0.08)", border: "1px solid rgba(79,168,168,0.25)", borderRadius: 12, padding: "14px 18px", color: "var(--ink)" }
        : { color: "var(--ink)" };
  const links = (block.links ?? []).map((l) => ({
    ...l,
    href: clientId ? l.href.replace(":clientId", clientId) : l.href,
  }));

  return (
    <div role={tone === "safety" ? "alert" : undefined} style={{ ...box, fontSize: 14.5, lineHeight: 1.6 }}>
      {block.title && (
        <strong style={{ display: "block", marginBottom: 4, color: tone === "safety" ? "#fff" : "var(--navy)" }}>{block.title}</strong>
      )}
      {block.body.length > 1 && tone !== "plain" ? (
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
          {block.body.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : (
        block.body.map((p) => (
          <p key={p} style={{ margin: "0 0 6px" }}>
            {p}
          </p>
        ))
      )}
      {links.length > 0 && (
        <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginTop: 6 }}>
          {links
            .filter((l) => !l.href.includes(":clientId"))
            .map((l) => (
              <a key={l.href} href={l.href} style={{ fontSize: 14, fontWeight: 700, color: tone === "safety" ? "#fff" : "var(--teal-deep)" }}>
                {l.label} →
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
