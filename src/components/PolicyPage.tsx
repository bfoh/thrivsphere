import { PageShell } from "./PageShell";
import { Icon } from "./icons";
import { policies } from "@/data/policies";
import { policyLinks } from "@/data/site";

export function PolicyPage({ slug }: { slug: string }) {
  const p = policies[slug];
  if (!p) return null;

  return (
    <PageShell eyebrow={p.eyebrow} title={p.title} intro={p.intro}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 40 }} className="two-col">
        <div>
          {p.sections.map((s) => (
            <section key={s.heading} style={{ marginBottom: 28 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 20, color: "var(--navy)", fontWeight: 800 }}>{s.heading}</h2>
              {s.body?.map((b, i) => (
                <p key={i} style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.65, color: "var(--ink)" }}>
                  {b}
                </p>
              ))}
              {s.bullets && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.bullets.map((b) => (
                    <li key={b} style={{ display: "flex", gap: 9, fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}>
                      <Icon name="check" size={17} stroke="var(--teal)" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <div style={{ marginTop: 20, padding: "14px 18px", background: "rgba(212,175,55,0.1)", borderRadius: 12, fontSize: 13, color: "var(--navy)" }}>
            This is a plain-language summary provided for transparency and should be reviewed and formally
            adopted by ThrivSphere. It does not constitute legal advice.
          </div>
        </div>

        <aside>
          <div className="card" style={{ padding: 20, position: "sticky", top: 120 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--navy-soft)" }}>
              Policies
            </h3>
            {policyLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  display: "block",
                  margin: "0 0 9px",
                  fontSize: 13.5,
                  fontWeight: l.href === `/${slug}` ? 800 : 600,
                  color: l.href === `/${slug}` ? "var(--teal-deep)" : "var(--ink)",
                  textDecoration: "none",
                }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
