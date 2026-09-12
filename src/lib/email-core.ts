import { brand } from "@/data/site";
import { BREVO_ENDPOINT, buildBrevoPayload, isAccepted } from "./email-payload";

/**
 * Transactional email, via Brevo.
 *
 * Application code imports `./email`, which adds the `server-only` guard;
 * this module exists without it so tests and scripts can exercise the send.
 *
 * The single place this service sends mail from, so there is one provider
 * boundary rather than a copy of it beside every feature that needs to notify
 * someone.
 *
 * Used only for messages that carry no personal content — "you have an
 * appointment", "someone has enquired". Anything personal stays behind
 * authentication in the portal, which is what the brief requires.
 *
 * Returns a result rather than throwing, so one failed send cannot abort a
 * batch of reminders, and so callers can tell a person honestly that the
 * message did not go rather than implying it did.
 */
export type SendResult = { ok: true } | { ok: false; reason: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /**
   * Send without the service's name in the sender line.
   *
   * The inbox list shows the sender before anything is opened, so a message
   * meant to be discreet gives itself away there first. Used for reminders.
   */
  discreet?: boolean;
}): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS;
  const fromName = params.discreet
    ? (process.env.EMAIL_FROM_NAME_DISCREET ?? "Appointments")
    : (process.env.EMAIL_FROM_NAME ?? brand.name);

  if (!apiKey || !fromEmail) {
    return { ok: false, reason: "email provider not configured" };
  }

  const payload = buildBrevoPayload({
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    fromEmail,
    fromName,
    replyTo: params.replyTo ?? brand.email,
  });

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!isAccepted(res.status)) {
      // The body carries Brevo's reason; log it but never the message itself.
      const detail = await res.text().catch(() => "");
      console.error("[email] Brevo rejected the send", res.status, detail.slice(0, 300));
      return { ok: false, reason: `provider returned ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "send failed" };
  }
}
