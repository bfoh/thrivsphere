"use client";

import * as React from "react";
import { useActionState } from "react";
import { approveKit, saveKitDraft, startKitFromWebsite } from "@/app/actions/brand-kit";
import { BOILERPLATES, KIT_LIMITS, kitProblems, parseKitForm } from "@/lib/brand-kit";
import { initialMarketingState, type MarketingFormState } from "@/lib/marketing-state";
import { errorText, hint, input, label } from "./ui";

type Action = (prev: MarketingFormState, fd: FormData) => Promise<MarketingFormState>;

/** Submit through a transition, so what was typed stays when the server says no. */
export function useMarketingAction(fn: Action) {
  const [state, dispatch, pending] = useActionState(fn, initialMarketingState);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    React.startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}

export function Result({ state }: { state: MarketingFormState }) {
  if (state.status === "idle") return null;
  return (
    <div role={state.status === "error" ? "alert" : "status"} style={{ marginTop: 10 }}>
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: state.status === "error" ? errorText : "var(--teal-deep)" }}>{state.message}</p>
      {state.problems && state.problems.length > 0 && (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: errorText, lineHeight: 1.55 }}>
          {state.problems.map((p, i) => (
            <li key={i}>
              <strong>{p.section}:</strong> {p.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StartKitButton() {
  const { state, pending, onSubmit } = useMarketingAction(startKitFromWebsite);
  return (
    <form onSubmit={onSubmit}>
      <button type="submit" className="pill pill-gold" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5 }}>
        {pending ? "Starting…" : "Start from the website's wording"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function ApproveKitForm({ versionId, contentHash, number }: { versionId: string; contentHash: string; number: number }) {
  const { state, pending, onSubmit } = useMarketingAction(approveKit);
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="contentHash" value={contentHash} />
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5 }}>
        <input type="checkbox" name="confirm" style={{ marginTop: 4 }} />
        <span>I have read version {number} in full, and everything in the hub should follow it.</span>
      </label>
      <div>
        <button type="submit" className="pill pill-gold" disabled={pending || state.status === "ok"} style={{ padding: "10px 20px", fontSize: 13.5 }}>
          {pending ? "Approving…" : `Approve version ${number}`}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

/* ------------------------------------------------------------------ editor */

function Area({ name, title, help, rows = 4, values }: { name: string; title: string; help?: string; rows?: number; values: Record<string, string> }) {
  return (
    <div>
      <label htmlFor={`k-${name}`} style={label}>{title}</label>
      <textarea id={`k-${name}`} name={name} defaultValue={values[name] ?? ""} rows={rows} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
      {help && <p style={hint}>{help}</p>}
    </div>
  );
}

function Group({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card" style={{ border: "none", padding: "20px 22px", margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      <legend style={{ float: "left", width: "100%", padding: 0, margin: "0 0 2px", fontSize: 16.5, fontWeight: 800, color: "var(--navy)" }}>{title}</legend>
      {intro && <p style={{ ...hint, marginTop: 0, fontSize: 13 }}>{intro}</p>}
      {children}
    </fieldset>
  );
}

export function KitEditor({ values, basedOn }: { values: Record<string, string>; basedOn: string }) {
  const { state, pending, onSubmit } = useMarketingAction(saveKitDraft);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [live, setLive] = React.useState<string[]>([]);

  // Check the draft as it's typed, with the same rules the server uses.
  const check = () => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const kit = parseKitForm((n) => String(fd.get(n) ?? ""));
    setLive(kitProblems(kit).map((p) => `${p.section}: ${p.message}`));
  };

  const replySlots = Array.from({ length: KIT_LIMITS.replies }, (_, i) => i);

  return (
    <form ref={formRef} onSubmit={onSubmit} onBlur={check} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ ...hint, fontSize: 13 }}>Editing a copy of {basedOn}. Saving makes a new version; nothing changes until Patience approves it.</p>

      <Group title="Identity">
        <Area name="mission" title="Mission" rows={3} values={values} />
        <Area name="positioning" title="Positioning line" rows={2} values={values} />
        <Area name="promise" title="Strapline" rows={1} values={values} />
        <Area name="values" title="Values" help="One per line." rows={5} values={values} />
      </Group>

      <Group title="Voice and tone">
        <Area name="personality" title="Personality" help="A few words, one per line." rows={4} values={values} />
        <Area name="voiceDo" title="We always" help="One per line." rows={6} values={values} />
        <Area name="voiceDont" title="We never" help="One per line." rows={6} values={values} />
      </Group>

      <Group title="Words to use and avoid" intro="One per line: words to avoid | what to say instead | why.">
        <Area name="words" title="Words" rows={10} values={values} />
      </Group>

      <Group title="Standard wording" intro="Used word for word wherever it's needed. The AI is told to use these exactly.">
        {BOILERPLATES.map((b) => (
          <Area key={b.key} name={`bp_${b.key}`} title={b.label} help={b.hint} rows={b.max > 600 ? 7 : 2} values={values} />
        ))}
      </Group>

      <Group title="Audiences" intro="One per line: who | what they need | the angle that helps. Never a description of a client.">
        <Area name="audiences" title="Audiences" rows={5} values={values} />
      </Group>

      <Group title="Content pillars" intro="One per line: pillar | share of posts (adding up to 100%) | what it covers.">
        <Area name="pillars" title="Pillars" rows={6} values={values} />
      </Group>

      <Group title="Hashtags and calls to action">
        <Area name="hashtags" title="Hashtags" help="Separated by spaces." rows={2} values={values} />
        <Area name="ctas" title="Calls to action" help="One per line: wording | page (/book, /contact, /services, /pricing, /blog, /about, /how-it-works, /newsletter)." rows={4} values={values} />
      </Group>

      <Group title="Look">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(["Thrive", "Sphere", "Wellbeing"] as const).map((w) => (
            <div key={w} style={{ flex: "1 1 150px" }}>
              <label htmlFor={`k-wordmark${w}`} style={label}>&ldquo;{w}&rdquo; colour</label>
              <input id={`k-wordmark${w}`} name={`wordmark${w}`} defaultValue={values[`wordmark${w}`]} style={input} pattern="#[0-9a-fA-F]{6}" />
            </div>
          ))}
        </div>
        <p style={{ ...hint, marginTop: -6 }}>The logo&apos;s type colours: &ldquo;Thrive&rdquo; and &ldquo;Sphere&rdquo; are the name (navy), &ldquo;Wellbeing&rdquo; is the &ldquo;MENTAL WELLBEING&rdquo; line (purple).</p>
        <Area name="imageStyle" title="Image style" help="What AI images should look like. They never show people or words." rows={4} values={values} />
        <Area name="photoRules" title="Photo rules" help="One per line." rows={5} values={values} />
      </Group>

      <Group title="Saved replies" intro="Ready answers for comments and messages, copied and pasted by staff. AI never replies to the public.">
        {replySlots.map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: i ? 10 : 0, borderTop: i ? "1px solid rgba(31,58,95,0.08)" : "none" }}>
            <input aria-label={`Reply ${i + 1} title`} name={`replyTitle${i}`} defaultValue={values[`replyTitle${i}`] ?? ""} placeholder={`Reply ${i + 1}: when to use it`} style={input} />
            <textarea aria-label={`Reply ${i + 1} text`} name={`replyText${i}`} defaultValue={values[`replyText${i}`] ?? ""} rows={3} style={{ ...input, resize: "vertical" }} />
          </div>
        ))}
      </Group>

      <div className="card" style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 10, position: "sticky", bottom: 12 }}>
        <label htmlFor="k-note" style={label}>What changed (optional)</label>
        <input id="k-note" name="note" maxLength={300} style={input} placeholder="e.g. Added a saved reply for employer enquiries" />
        {live.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: errorText, lineHeight: 1.5 }}>
            {live.slice(0, 5).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <div>
          <button type="submit" className="pill pill-gold" disabled={pending} style={{ padding: "10px 22px", fontSize: 13.5 }}>
            {pending ? "Saving…" : "Save as a new version"}
          </button>
        </div>
        <Result state={state} />
      </div>
    </form>
  );
}
