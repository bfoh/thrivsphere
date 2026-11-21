"use client";

import * as React from "react";
import { useActionState } from "react";
import { PillButton } from "./PillButton";
import { submitEnquiry } from "@/app/actions/enquiry";
import { initialEnquiryState } from "@/lib/enquiry-state";
import { CONTACT_CATEGORIES } from "@/lib/enquiry-rules";
import {
  AttributionFields,
  ContactMethodField,
  FormAlert,
  Honeypot,
  PrivacyAcknowledgement,
  Received,
  SelectField,
  TextField,
  errorStyle,
  inputStyle,
  labelStyle,
} from "./EnquiryFields";

/**
 * The general contact form (IT handover §16.2).
 *
 * Deliberately does not ask for health details: an enquiry is just enough to
 * reply. Anything sensitive is gathered later, behind sign-in.
 */
export function EnquiryForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, initialEnquiryState);

  if (state.status === "ok") {
    return <Received heading="Enquiry received" message={state.message} reference={state.reference} />;
  }

  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={formAction} className="card" noValidate style={{ padding: 30, display: "flex", flexDirection: "column", gap: 13 }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "var(--navy)" }}>Send us a message</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--navy-soft)" }}>Confidential · not monitored for emergencies</p>
      </div>

      {state.status === "error" && <FormAlert message={state.message} />}

      <SelectField
        label="What is your enquiry about?"
        name="category"
        options={CONTACT_CATEGORIES}
        placeholder="Choose a category…"
        error={fe.category}
        defaultValue={v.category}
      />
      <TextField label="Full name" name="name" autoComplete="name" error={fe.name} defaultValue={v.name} />
      <TextField label="Email address" name="email" type="email" autoComplete="email" placeholder="you@email.com" error={fe.email} defaultValue={v.email} />
      <TextField label="Country" name="country" autoComplete="country-name" error={fe.country} defaultValue={v.country} />
      <TextField label="Phone number (optional)" name="phone" type="tel" autoComplete="tel" error={fe.phone} defaultValue={v.phone} />
      <ContactMethodField error={fe.preferredContact} defaultValue={v.preferredContact} />
      <TextField label="Subject" name="subject" error={fe.subject} defaultValue={v.subject} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="message" style={labelStyle}>
          Your message
        </label>
        <p id="message-warning" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#8c3f2e", fontWeight: 600 }}>
          Please do not include detailed mental health histories, highly sensitive information or urgent
          safety concerns in this general enquiry form.
        </p>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={3000}
          defaultValue={v.message}
          aria-describedby={fe.message ? "message-warning message-error" : "message-warning"}
          aria-invalid={fe.message ? true : undefined}
          style={{ ...inputStyle, resize: "vertical", borderColor: fe.message ? "#c86b52" : "rgba(31,58,95,0.18)" }}
        />
        {fe.message && (
          <p id="message-error" style={errorStyle}>
            {fe.message}
          </p>
        )}
      </div>

      <AttributionFields defaultValue={v.heardVia} defaultDetail={v.heardViaDetail} />

      <Honeypot />
      <PrivacyAcknowledgement error={fe.privacy} />

      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending} icon={pending ? undefined : "arrow"}>
          {pending ? "Sending…" : "Send securely"}
        </PillButton>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "var(--navy-soft)", textAlign: "center" }}>
        🔒 This is an enquiry form, not a booking.
      </p>
    </form>
  );
}
