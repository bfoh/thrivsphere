import * as React from "react";
import { BOILERPLATES, type BrandKit } from "@/lib/brand-kit";
import { BRAND_COLOURS, CSS_VARIABLE, type BrandColour } from "@/lib/brand-tokens";
import { Section } from "@/components/admin/RecordUI";

const list: React.CSSProperties = { margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.65 };
const small: React.CSSProperties = { fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--navy-soft)", fontWeight: 800, margin: "0 0 4px" };

/** The Brand Kit, laid out to read. */
export function KitView({ kit }: { kit: BrandKit }) {
  return (
    <>
      <Section title="Identity">
        <p style={small}>Mission</p>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.6 }}>{kit.identity.mission}</p>
        <p style={small}>Positioning</p>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.6 }}>{kit.identity.positioning}</p>
        <p style={small}>Strapline</p>
        <p style={{ margin: "0 0 14px", fontSize: 14.5, fontWeight: 700, color: "var(--navy)" }}>{kit.identity.promise}</p>
        <p style={small}>Values</p>
        <p style={{ margin: 0, fontSize: 14 }}>{kit.identity.values.join(" · ")}</p>
      </Section>

      <Section title="Voice and tone" subtitle={kit.voice.personality.join(", ")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <div>
            <p style={small}>We always</p>
            <ul style={list}>{kit.voice.do.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <p style={small}>We never</p>
            <ul style={list}>{kit.voice.dont.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      </Section>

      <Section title="Words to use and avoid">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["Avoid", "Say instead", "Why"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", ...small }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kit.words.map((w) => (
                <tr key={w.avoid} style={{ borderTop: "1px solid rgba(31,58,95,0.08)" }}>
                  <td style={{ padding: "8px", fontWeight: 700, color: "#a1421c" }}>{w.avoid}</td>
                  <td style={{ padding: "8px", fontWeight: 700, color: "var(--teal-deep)" }}>{w.instead}</td>
                  <td style={{ padding: "8px", color: "var(--navy-soft)" }}>{w.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Standard wording" subtitle="Used word for word.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {BOILERPLATES.map((b) => (
            <div key={b.key}>
              <p style={small}>{b.label}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{kit.boilerplates[b.key]}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Audiences and content pillars">
        <ul style={{ ...list, marginBottom: 16 }}>
          {kit.audiences.map((a) => (
            <li key={a.name}>
              <strong>{a.name}</strong>: {a.needs}. <span style={{ color: "var(--navy-soft)" }}>Angle: {a.angle}.</span>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {kit.pillars.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13.5 }}>
              <span style={{ flex: "0 0 44px", fontWeight: 800, color: "var(--navy)", textAlign: "right" }}>{p.share}%</span>
              <span style={{ flex: "0 0 120px", height: 8, borderRadius: 999, background: "rgba(31,58,95,0.08)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${p.share}%`, background: "var(--teal)" }} />
              </span>
              <span>
                <strong>{p.name}</strong> <span style={{ color: "var(--navy-soft)" }}>{p.covers}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Hashtags and calls to action">
        <p style={{ margin: "0 0 12px", fontSize: 14 }}>{kit.hashtags.join(" ")}</p>
        <ul style={list}>
          {kit.ctas.map((c) => (
            <li key={c.label}>
              {c.label} <span style={{ color: "var(--navy-soft)" }}>→ thrivsphere.org{c.path}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Look">
        <p style={small}>Logo colours</p>
        <p style={{ margin: "0 0 14px", fontSize: 26, fontWeight: 800 }}>
          <span style={{ color: kit.visual.wordmark.thrive }}>Thrive</span>
          <span style={{ color: kit.visual.wordmark.sphere }}>Sphere</span>{" "}
          <span style={{ fontSize: 12, letterSpacing: "0.24em", color: kit.visual.wordmark.wellbeing }}>WELLBEING</span>
        </p>
        <p style={small}>Website colours</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          {(Object.keys(CSS_VARIABLE) as BrandColour[]).map((k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: BRAND_COLOURS[k], border: "1px solid rgba(31,58,95,0.15)" }} />
              <span>
                {k}
                <br />
                <code style={{ color: "var(--navy-soft)" }}>{BRAND_COLOURS[k]}</code>
              </span>
            </div>
          ))}
        </div>
        <p style={small}>Font</p>
        <p style={{ margin: "0 0 14px", fontSize: 14 }}>Montserrat</p>
        <p style={small}>AI image style</p>
        <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6 }}>{kit.visual.imageStyle}</p>
        <p style={small}>Photo rules</p>
        <ul style={list}>{kit.visual.photoRules.map((x) => <li key={x}>{x}</li>)}</ul>
      </Section>

      <Section title="Saved replies" subtitle="Copy and paste. AI never replies to the public.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {kit.replies.map((r) => (
            <div key={r.title}>
              <p style={small}>{r.title}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{r.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
