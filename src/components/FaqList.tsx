import { Icon } from "./icons";
import { faqs } from "@/data/site";

export function FaqList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {faqs.map((f) => (
        <details key={f.q} className="card" style={{ padding: "16px 22px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--navy)", fontSize: 15.5, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {f.q}
            <Icon name="chevron-down" size={20} stroke="var(--teal)" />
          </summary>
          <p style={{ margin: "12px 0 0", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
