import "server-only";

import { brand } from "@/data/site";

/**
 * Transactional email.
 *
 * Used only for notifications that carry no personal content — "you have an
 * appointment", "you have a new message". Anything personal stays behind
 * authentication in the portal, which is what the brief requires.
 *
 * Returns a result rather than throwing so a single failed send cannot abort a
 * whole batch of reminders.
 */
export type SendResult = { ok: true } | { ok: false; reason: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false, reason: "email provider not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        reply_to: brand.email,
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!res.ok) {
      return { ok: false, reason: `provider returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "send failed" };
  }
}
