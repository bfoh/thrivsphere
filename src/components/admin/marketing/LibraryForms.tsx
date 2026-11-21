"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateAsset } from "@/app/actions/marketing-assets";
import { ASSET_LIMITS, PEOPLE, RIGHTS, type AssetDetails } from "@/lib/asset-rules";
import { Result, useMarketingAction } from "./KitForms";
import { errorText, hint, input, label } from "./ui";

function DetailFields({ value, upload, ai }: { value?: Partial<AssetDetails>; upload: boolean; ai?: boolean }) {
  const [rights, setRights] = React.useState<string>(value?.rights ?? (upload ? "" : "owned"));
  const [people, setPeople] = React.useState<string>(value?.people ?? "none");
  return (
    <>
      <div>
        <label htmlFor="a-title" style={label}>Name</label>
        <input id="a-title" name="title" required maxLength={ASSET_LIMITS.title} defaultValue={value?.title ?? ""} style={input} placeholder="e.g. Sunlight through leaves" />
      </div>
      <div>
        <label htmlFor="a-alt" style={label}>Description for people who can&apos;t see it (alt text)</label>
        <textarea id="a-alt" name="altText" maxLength={ASSET_LIMITS.alt} rows={2} defaultValue={value?.altText ?? ""} style={{ ...input, resize: "vertical" }} placeholder="e.g. Morning sunlight through green leaves" />
        <p style={hint}>Say what&apos;s in it, briefly. Posted with the image on every platform.</p>
      </div>
      <div>
        <label htmlFor="a-tags" style={label}>Tags (optional)</label>
        <input id="a-tags" name="tags" defaultValue={value?.tags?.join(", ") ?? ""} style={input} placeholder="e.g. nature, calm, workplace" />
      </div>
      {ai ? (
        <p style={{ ...hint, marginTop: 0 }}>Made by AI. It stays marked as AI-made, and is labelled as AI when posted on Instagram.</p>
      ) : (
        <>
          <div>
            <label htmlFor="a-rights" style={label}>Whose image is it?</label>
            <select id="a-rights" name="rights" required value={rights} onChange={(e) => setRights(e.target.value)} style={input}>
              {upload && <option value="">Choose…</option>}
              {RIGHTS.filter((r) => r.value !== "generated").map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {(rights === "licensed" || rights === "staff_photo_consented" || value?.rightsNote) && (
            <div>
              <label htmlFor="a-note" style={label}>{rights === "licensed" ? "Where it's from, and the licence" : "Note"}</label>
              <input id="a-note" name="rightsNote" maxLength={ASSET_LIMITS.rightsNote} defaultValue={value?.rightsNote ?? ""} style={input} placeholder={rights === "licensed" ? "e.g. Unsplash licence, photo by …" : "e.g. Agreement signed 3 March 2027"} />
            </div>
          )}
          {rights === "licensed" && (
            <div>
              <label htmlFor="a-exp" style={label}>Licence ends (optional)</label>
              <input id="a-exp" type="date" name="licenceExpires" defaultValue={value?.licenceExpires ?? ""} style={{ ...input, maxWidth: 220 }} />
            </div>
          )}
          <div>
            <label htmlFor="a-people" style={label}>Who is in it?</label>
            <select id="a-people" name="people" value={people} onChange={(e) => setPeople(e.target.value)} style={input}>
              {PEOPLE.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p style={hint}>Never upload a photo of a client, or anything that could identify one.</p>
          </div>
          {upload && people === "staff_consented" && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.5 }}>
              <input type="checkbox" name="staffConsent" style={{ marginTop: 3 }} />
              <span>Everyone in this photo works for ThriveSphere and has agreed in writing to it being used in marketing.</span>
            </label>
          )}
        </>
      )}
    </>
  );
}

export function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [key, setKey] = React.useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/marketing/assets", { method: "POST", body: new FormData(e.currentTarget) });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setMessage({ ok: false, text: data.error ?? "The upload failed. Please try again." });
        return;
      }
      setMessage({ ok: true, text: "Added to the library." });
      setKey((k) => k + 1);
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "The upload failed. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form key={key} onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label htmlFor="a-file" style={label}>Photo</label>
        <input id="a-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required style={{ fontSize: 14 }} />
        <p style={hint}>JPEG, PNG or WebP, up to 4 MB. Use JPEG or PNG if you&apos;ll put it in a graphic.</p>
      </div>
      <DetailFields upload />
      <div>
        <button type="submit" className="pill pill-gold" disabled={busy} style={{ padding: "10px 20px", fontSize: 13.5 }}>
          {busy ? "Uploading…" : "Add to the library"}
        </button>
      </div>
      {message && (
        <p role={message.ok ? "status" : "alert"} style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: message.ok ? "var(--teal-deep)" : errorText }}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export function AssetDetailsForm({ id, value, ai }: { id: string; value: AssetDetails; ai: boolean }) {
  const { state, pending, onSubmit } = useMarketingAction(updateAsset);
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="id" value={id} />
      <DetailFields value={value} upload={false} ai={ai} />
      {ai && <input type="hidden" name="rights" value="generated" />}
      <div>
        <button type="submit" className="pill pill-gold" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5 }}>
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}
