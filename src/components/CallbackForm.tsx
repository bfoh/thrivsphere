"use client";

import * as React from "react";
import { useActionState } from "react";
import { PillButton } from "./PillButton";
import { requestCallback } from "@/app/actions/enquiry";
import { initialEnquiryState } from "@/lib/enquiry-state";
import {
  Checkbox,
  ContactMethodField,
  FormAlert,
  Honeypot,
  PrivacyAcknowledgement,
  Received,
  TextField,
  errorStyle,
  inputStyle,
  labelStyle,
} from "./EnquiryFields";

/**
 * "Request a Callback" (IT handover §19, Route B).
 *
 * A short self-referral: only what is needed to get in touch and arrange the
 * Initial Wellbeing Consultation (§13.1). No health history, no full review —
 * that happens in the consultation itself.
 */
export function CallbackForm({ price }: { price: string }) {
  const [state, formAction, pending] = useActionState(requestCallback, initialEnquiryState);

  if (state.status === "ok") {
    return <Received heading="Callback requested" message={state.message} reference={state.reference} />;
  }

  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={formAction} className="card" noValidate style={{ padding: 30, display: "flex", flexDirection: "column", gap: 13 }}>
      {state.status === "error" && <FormAlert message={state.message} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <TextField label="Full name" name="name" autoComplete="name" error={fe.name} defaultValue={v.name} />
        <TextField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@email.com" error={fe.email} defaultValue={v.email} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <TextField label="Phone number (optional)" name="phone" type="tel" autoComplete="tel" error={fe.phone} defaultValue={v.phone} />
        <ContactMethodField error={fe.preferredContact} defaultValue={v.preferredContact} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <TextField label="Country" name="country" autoComplete="country-name" error={fe.country} defaultValue={v.country} />
        <TextField
          label="Best days and times to contact you (optional)"
          name="preferredTimes"
          placeholder="e.g. weekday evenings"
          error={fe.preferredTimes}
          defaultValue={v.preferredTimes}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="message" style={labelStyle}>
          Accessibility or communication needs (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={2}
          maxLength={500}
          defaultValue={v.message}
          placeholder="For example, a preferred language, or a need for captions."
          aria-invalid={fe.message ? true : undefined}
          style={{ ...inputStyle, resize: "vertical", borderColor: fe.message ? "#c86b52" : "rgba(31,58,95,0.18)" }}
        />
        {fe.message && <p style={errorStyle}>{fe.message}</p>}
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--navy-soft)" }}>
          Please don&apos;t include health details here. We talk about what brings you to ThriveSphere in
          your consultation.
        </p>
      </div>

      <Honeypot />
      <Checkbox name="confirmAdult" error={fe.confirmAdult}>
        I confirm I am aged 18 or over.
      </Checkbox>
      <PrivacyAcknowledgement error={fe.privacy} />

      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending} icon={pending ? undefined : "arrow"}>
          {pending ? "Sending…" : "Request a Callback"}
        </PillButton>
      </div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--navy-soft)", textAlign: "center" }}>
        A callback is to arrange your Initial Wellbeing Consultation ({price}, 50 minutes, online). It is not a
        free assessment.
      </p>
    </form>
  );
}
