"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { CONTACT_METHODS } from "@/lib/enquiry-rules";
import { HEARD_VIA, UTM_FIELDS } from "@/lib/attribution";

/**
 * The pieces the public enquiry and callback forms share: labelled fields
 * with their errors, the privacy acknowledgement, the honeypot and the
 * confirmation with its reference (IT handover §16.2, §16.4).
 */

export const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "var(--navy)" };

export const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)",
  background: "#fff",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  maxWidth: "100%",
};

export const errorStyle: React.CSSProperties = { margin: 0, fontSize: 12, fontWeight: 600, color: "#b4553f" };

const fieldBox: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

function bordered(error?: string): React.CSSProperties {
  return { ...inputStyle, borderColor: error ? "#c86b52" : "rgba(31,58,95,0.18)" };
}

export function TextField({
  label,
  name,
  type = "text",
  placeholder,
  error,
  defaultValue,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <div style={fieldBox}>
      <label htmlFor={name} style={labelStyle}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        style={bordered(error)}
      />
      {error && (
        <p id={`${name}-error`} style={errorStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  placeholder,
  error,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <div style={fieldBox}>
      <label htmlFor={name} style={labelStyle}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        style={bordered(error)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${name}-error`} style={errorStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactMethodField({ error, defaultValue }: { error?: string; defaultValue?: string }) {
  return (
    <SelectField
      label="Preferred contact method (optional)"
      name="preferredContact"
      options={CONTACT_METHODS}
      placeholder="No preference"
      error={error}
      defaultValue={defaultValue}
    />
  );
}

export function Checkbox({ name, error, children }: { name: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--navy-soft)", alignItems: "flex-start" }}>
        {/* Never ticked in advance (handover §16.2, §19). */}
        <input
          id={name}
          name={name}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          style={{ marginTop: 3 }}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${name}-error`} style={{ ...errorStyle, marginTop: 5 }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Reading the privacy information is not consent to take part in sessions (§16.2). */
export function PrivacyAcknowledgement({ error }: { error?: string }) {
  return (
    <Checkbox name="privacy" error={error}>
      I have read the{" "}
      <Link href="/privacy" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
        privacy information
      </Link>{" "}
      about how ThriveSphere handles enquiries.
    </Checkbox>
  );
}

/**
 * "How did you hear about us?" (optional), plus the tracking tags on the link
 * the visitor arrived by, read from this page's address. Nothing is stored on
 * their device. Controlled, so the answer survives a form sent back with errors.
 */
export function AttributionFields({ defaultValue, defaultDetail }: { defaultValue?: string; defaultDetail?: string }) {
  const [heard, setHeard] = React.useState(defaultValue ?? "");
  const [detail, setDetail] = React.useState(defaultDetail ?? "");
  const [tags, setTags] = React.useState<Record<string, string>>({});
  const selectRef = React.useRef<HTMLSelectElement>(null);
  const heardRef = React.useRef(heard);

  React.useEffect(() => {
    heardRef.current = heard;
  }, [heard]);

  // React resets a form after its action runs. Text inputs come back with
  // their value, but a controlled <select> shows its first option again, so
  // put the answer back once the reset has happened.
  React.useEffect(() => {
    const select = selectRef.current;
    const form = select?.form;
    if (!select || !form) return;
    const restore = () => requestAnimationFrame(() => (select.value = heardRef.current));
    form.addEventListener("reset", restore);
    return () => form.removeEventListener("reset", restore);
  }, []);

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const found: Record<string, string> = { landingPath: window.location.pathname, referrer: document.referrer };
    for (const f of UTM_FIELDS) found[f] = q.get(f) ?? "";
    // Read once, when the form appears: the browser's address is the source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTags(found);
  }, []);

  return (
    <div style={fieldBox}>
      <label htmlFor="heardVia" style={labelStyle}>
        How did you hear about us? (optional)
      </label>
      <select ref={selectRef} id="heardVia" name="heardVia" value={heard} onChange={(e) => setHeard(e.target.value)} style={inputStyle}>
        <option value="">Choose if you&apos;d like to tell us…</option>
        {HEARD_VIA.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {heard === "other" && (
        <input
          aria-label="Where did you hear about us?"
          name="heardViaDetail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={80}
          placeholder="Where? (optional)"
          style={inputStyle}
        />
      )}
      {Object.entries(tags).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}

/** Hidden from people, tempting to bots. */
export function Honeypot() {
  return (
    <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
      <label htmlFor="company">Company</label>
      <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      style={{
        margin: 0,
        padding: "11px 14px",
        borderRadius: 10,
        background: "rgba(180,85,63,0.1)",
        border: "1px solid rgba(180,85,63,0.3)",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "#8c3f2e",
      }}
    >
      {message}
    </p>
  );
}

/** The on-screen confirmation, with the reference to keep (§16.4, §16.5). */
export function Received({ heading, message, reference }: { heading: string; message: string; reference?: string }) {
  return (
    <div className="card" role="status" style={{ padding: 34, textAlign: "center" }}>
      <div
        style={{
          width: 62,
          height: 62,
          margin: "0 auto 14px",
          borderRadius: "50%",
          background: "rgba(79,168,168,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" size={32} stroke="var(--teal-deep)" />
      </div>
      <h2 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>{heading}</h2>
      {reference && (
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--navy-soft)" }}>
          Your reference:{" "}
          <strong style={{ fontSize: 18, letterSpacing: "0.04em", color: "var(--navy)" }}>{reference}</strong>
        </p>
      )}
      <p style={{ margin: "12px auto 0", maxWidth: 440, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{message}</p>
    </div>
  );
}
