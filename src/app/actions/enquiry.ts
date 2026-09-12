"use server";

import { headers } from "next/headers";
import { brand } from "@/data/site";
import type { EnquiryState } from "@/lib/enquiry-state";
import { sendEmail } from "@/lib/email";
import { enquiryNotification } from "@/lib/email-templates";

const SERVICES = [
  "One-to-One Emotional Wellbeing Support",
  "Wellbeing Coaching",
  "Wellbeing Circle (peer support group)",
  "Mindfulness Sessions",
  "Wellbeing & Resilience Programme",
  "Workplace Wellbeing",
  "Not sure yet",
  "Something else",
];

/**
 * Very small in-memory rate limit.
 *
 * Enough to blunt casual form spam on a single instance. Stage 2 replaces this
 * with Upstash Redis so the limit holds across all serverless instances — see
 * the go-live plan. Deliberately not presented as robust protection.
 */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT_MAX;
}

function str(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData
): Promise<EnquiryState> {
  // Honeypot — real people leave this hidden field empty.
  if (str(formData, "company")) {
    return { status: "ok", message: "Thank you — your message is on its way." };
  }

  const name = str(formData, "name");
  const email = str(formData, "email");
  const service = str(formData, "service");
  const message = str(formData, "message");
  const phone = str(formData, "phone");
  const preferred = str(formData, "preferred");
  const consent = formData.get("consent") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length > 100) fieldErrors.name = "Please tell us what to call you.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) {
    fieldErrors.email = "Please enter an email address we can reply to.";
  }
  if (service && !SERVICES.includes(service)) fieldErrors.service = "Please choose from the list.";
  if (message.length > 5000) fieldErrors.message = "Please keep this under 5000 characters.";
  if (phone.length > 40) fieldErrors.phone = "Please enter a valid phone number.";
  if (preferred.length > 200) fieldErrors.preferred = "Please keep this short.";
  if (!consent) fieldErrors.consent = "We need your agreement before we can reply.";

  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return {
      status: "error",
      message: `Too many messages from this connection. Please try again shortly, or email ${brand.email}.`,
    };
  }

  const notification = enquiryNotification({
    name,
    email,
    service: service || undefined,
    phone: phone || undefined,
    preferredTimes: preferred || undefined,
    message: message || undefined,
  });

  const result = await sendEmail({
    to: process.env.ENQUIRY_TO_EMAIL ?? brand.email,
    replyTo: email,
    subject: notification.subject,
    text: notification.text,
    html: notification.html,
  });

  // Never pretend an enquiry was sent. If it did not go, say so and give the
  // person a route that works rather than losing their message silently.
  if (!result.ok) {
    console.error("[enquiry] not sent:", result.reason);
    return {
      status: "error",
      message: `We couldn't send your message just now. Please email us directly at ${brand.email} and we'll reply as soon as we can.`,
    };
  }

  return {
    status: "ok",
    message: "Thank you — your message is on its way. We'll reply privately, usually within 2 working days.",
  };
}
