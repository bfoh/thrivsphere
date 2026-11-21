"use client";

import * as React from "react";
import Link from "next/link";
import { SIZES, TEMPLATES, THEMES, templateByKey, type SizeKey, type TemplateKey, type ThemeKey } from "@/lib/graphics/spec";
import { errorText, hint, input, label } from "./ui";

type Option = { value: string; label: string };

/**
 * Pick a template, fill it in, preview it, keep it. Drawn by the website from
 * the brand's fonts and colours; the preview is exactly what is saved.
 */
export function GraphicMaker({ services, posts, photos }: { services: Option[]; posts: Option[]; photos: Option[] }) {
  const [template, setTemplate] = React.useState<TemplateKey>("tip");
  const [size, setSize] = React.useState<SizeKey>("square");
  const [theme, setTheme] = React.useState<ThemeKey>("navy");
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [previewedFor, setPreviewedFor] = React.useState<string | null>(null);

  const def = templateByKey(template)!;
  const fields = () => {
    const p = new URLSearchParams({ template, size, theme });
    for (const f of def.fields) if (values[f.name]) p.set(f.name, values[f.name]);
    return p;
  };
  const missing = def.fields.find((f) => f.required && !values[f.name]?.trim());
  // Only what has been previewed can be saved, so the saved file is what was seen.
  const current = fields().toString();
  const stale = !!preview && previewedFor !== current;

  async function showPreview() {
    if (missing) {
      setError(`${missing.label} is needed.`);
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/admin/marketing/render?${fields()}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "The preview couldn't be drawn.");
        return;
      }
      const blob = await res.blob();
      setPreviewedFor(current);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch {
      setError("The preview couldn't be drawn. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const [k, v] of fields()) fd.set(k, v);
      const res = await fetch("/api/admin/marketing/render", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) setError(data.error ?? "Saving failed. Please try again.");
      else setSaved(data.id);
    } catch {
      setError("Saving failed. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const change = (patch: () => void) => {
    patch();
    setSaved(null);
  };

  const optionsFor = (kind: string) => (kind === "service" ? services : kind === "post" ? posts : photos);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, alignItems: "start" }}>
      <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor="g-template" style={label}>Template</label>
          <select
            id="g-template"
            value={template}
            onChange={(e) =>
              change(() => {
                const next = templateByKey(e.target.value)!;
                setTemplate(next.key);
                if (!next.sizes.includes(size)) setSize(next.sizes[0]);
              })
            }
            style={input}
          >
            {TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <p style={hint}>{def.description}</p>
        </div>

        {def.fields.map((f) => (
          <div key={`${template}-${f.name}`}>
            <label htmlFor={`g-${f.name}`} style={label}>
              {f.label}
              {f.max && f.kind !== "photo" && <span style={{ fontWeight: 600, color: "var(--navy-soft)" }}> ({(values[f.name] ?? "").length}/{f.max})</span>}
            </label>
            {f.kind === "textarea" ? (
              <textarea id={`g-${f.name}`} maxLength={f.max} rows={3} value={values[f.name] ?? ""} onChange={(e) => change(() => setValues({ ...values, [f.name]: e.target.value }))} style={{ ...input, resize: "vertical" }} />
            ) : f.kind === "service" || f.kind === "post" || f.kind === "photo" ? (
              <select id={`g-${f.name}`} value={values[f.name] ?? ""} onChange={(e) => change(() => setValues({ ...values, [f.name]: e.target.value }))} style={input}>
                <option value="">Choose…</option>
                {optionsFor(f.kind).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input id={`g-${f.name}`} maxLength={f.max} value={values[f.name] ?? ""} onChange={(e) => change(() => setValues({ ...values, [f.name]: e.target.value }))} style={input} />
            )}
            {f.hint && <p style={hint}>{f.hint}</p>}
            {f.kind === "photo" && photos.length === 0 && (
              <p style={hint}>
                No JPEG or PNG photos in the library yet. <Link href="/admin/marketing/library">Add one</Link>.
              </p>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 200px" }}>
            <label htmlFor="g-size" style={label}>Size</label>
            <select id="g-size" value={size} onChange={(e) => change(() => setSize(e.target.value as SizeKey))} style={input}>
              {def.sizes.map((s) => (
                <option key={s} value={s}>{SIZES[s].label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "1 1 120px" }}>
            <label htmlFor="g-theme" style={label}>Colours</label>
            <select id="g-theme" value={theme} onChange={(e) => change(() => setTheme(e.target.value as ThemeKey))} style={input}>
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <option key={k} value={k}>{THEMES[k].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={showPreview} className="pill pill-teal" disabled={loading} style={{ padding: "10px 20px", fontSize: 13.5 }}>
            {loading ? "Drawing…" : "Show preview"}
          </button>
          <button type="button" onClick={save} className="pill pill-gold" disabled={saving || !preview || stale || !!saved} style={{ padding: "10px 20px", fontSize: 13.5 }}>
            {saving ? "Saving…" : saved ? "Saved" : "Save to the library"}
          </button>
        </div>
        {stale && !error && <p style={{ ...hint, marginTop: 0 }}>You&apos;ve changed something since the preview. Show the preview again to save it.</p>}
        {error && <p role="alert" style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: errorText }}>{error}</p>}
        {saved && (
          <p role="status" style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)" }}>
            Saved. <Link href={`/admin/marketing/library/${saved}`}>Open it in the library</Link> to download it or check its description.
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 14, minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,58,95,0.04)" }}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview of the graphic" style={{ maxWidth: "100%", maxHeight: 640, height: "auto", display: "block", borderRadius: 6, boxShadow: "0 6px 24px rgba(31,58,95,0.15)" }} />
        ) : (
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--navy-soft)", textAlign: "center" }}>Fill in the template and press &ldquo;Show preview&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
