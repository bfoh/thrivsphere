import { Icon } from "./icons";
import type { Service } from "@/data/site";

/** One service in full: description, what it may cover, and any boundary note (checklist §4). */
export function ServiceDetail({ service, letter }: { service: Service; letter: string }) {
  return (
    <article id={service.slug} className="card" style={{ padding: "26px 28px", scrollMarginTop: 130 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <span className="svc-icon" style={{ margin: 0, flex: "0 0 auto" }}>
          <Icon name={service.icon} size={25} stroke="#fff" />
        </span>
        <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.25, color: "var(--navy)", fontWeight: 800 }}>
          <span style={{ color: "var(--gold)" }}>{letter}.</span> {service.title}
        </h2>
      </div>
      <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>{service.desc}</p>
      {service.points.length > 0 && (
        <ul className="two-col" style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 20px" }}>
          {service.points.map((p) => (
            <li key={p} style={{ display: "flex", gap: 8, fontSize: 14.5, lineHeight: 1.45, color: "var(--ink)" }}>
              <span style={{ flex: "0 0 auto", marginTop: 1 }}>
                <Icon name="check" size={16} stroke="var(--teal)" />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
      {service.note && (
        <p style={{ margin: "16px 0 0", padding: "12px 16px", borderRadius: 10, background: "rgba(79,168,168,0.08)", border: "1px solid rgba(79,168,168,0.22)", fontSize: 14, lineHeight: 1.55, color: "var(--navy)" }}>
          {service.note}
        </p>
      )}
    </article>
  );
}
