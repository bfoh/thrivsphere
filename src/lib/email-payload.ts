/**
 * Building the Brevo transactional email request.
 *
 * Kept pure and separate from the sending so the shape of what leaves this
 * service can be asserted. These messages go to people who may be in difficult
 * circumstances, and the rule that nothing personal travels by email is only
 * worth having if it is actually checked.
 */

export type EmailInput = {
  to: string;
  subject: string;
  text: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
};

export type BrevoPayload = {
  sender: { email: string; name?: string };
  to: { email: string }[];
  subject: string;
  textContent: string;
  replyTo?: { email: string };
};

export const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Brevo's transactional endpoint takes JSON with a `sender` object and a `to`
 * array, rather than the flat `from`/`to` of some other providers.
 *
 * The recipient's name is deliberately omitted. Brevo would accept it, but a
 * display name in the envelope is another place a person's name can surface in
 * a mailbox someone else reads, and it buys nothing.
 */
export function buildBrevoPayload(input: EmailInput): BrevoPayload {
  return {
    sender: input.fromName
      ? { email: input.fromEmail, name: input.fromName }
      : { email: input.fromEmail },
    to: [{ email: input.to }],
    subject: input.subject,
    textContent: input.text,
    ...(input.replyTo ? { replyTo: { email: input.replyTo } } : {}),
  };
}

/**
 * Whether Brevo accepted the message.
 *
 * Brevo answers a successful transactional send with 201, not 200, so treating
 * only 200 as success would mark every delivered message as failed — and for
 * reminders that would mean re-sending the same email on every run.
 */
export function isAccepted(status: number): boolean {
  return status >= 200 && status < 300;
}
