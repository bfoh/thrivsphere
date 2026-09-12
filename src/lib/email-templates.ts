/**
 * Branded email templates.
 *
 * Every message this service sends is built here, so the rules that matter
 * survive a redesign rather than getting lost in one:
 *
 *  - Every HTML email carries a plain-text alternative. Some people read mail
 *    as text by choice, some by necessity, and a screen reader handles the
 *    text part far better than a table layout.
 *  - Content stays minimal. Branding is not a reason to start naming
 *    practitioners, reasons for appointments, or anything a client told us.
 *  - Crisis signposting appears on every client-facing message, because the
 *    moment someone needs it is not predictable.
 *
 * Written as tables with inline styles because that is what email clients
 * actually render — Outlook in particular ignores most modern CSS.
 */

const NAVY = "#1f3a5f";
const TEAL = "#3d8a8a";
const GOLD = "#bd951f";
const INK = "#2b3a4d";
const MUTED = "#5d7089";
const GROUND = "#f2f5f4";
const SURFACE = "#ffffff";
const RULE = "#e2e7ea";

export type Email = { subject: string; html: string; text: string };

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";
}

/** Absolute URL — email clients cannot resolve relative paths. */
function logoUrl(): string {
  return `${siteUrl()}/images/email/logo.png`;
}

type ShellOptions = {
  /** Short line under the logo. Kept neutral. */
  preheader: string;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
  /** Crisis block is on by default; off for internal staff notifications. */
  showCrisis?: boolean;
  footerNote?: string;
};

/**
 * Shared shell.
 *
 * The preheader is the grey text a mail client shows next to the subject in an
 * inbox list. Left unset it leaks the first line of the body, so it is always
 * set explicitly and always neutral.
 */
function shell(o: ShellOptions): string {
  const crisis = o.showCrisis === false ? "" : `
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background:${NAVY};border-radius:10px;">
                <tr>
                  <td style="padding:18px 22px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#ffffff;line-height:1.4;">
                      ThrivSphere is not an emergency or crisis service
                    </p>
                    <p style="margin:0;font-size:13px;color:#c8d6e8;line-height:1.6;">
                      If you need help right now: emergency <strong style="color:#ffffff;">999</strong>
                      &middot; Samaritans, free 24/7 <strong style="color:#ffffff;">116&nbsp;123</strong>
                      &middot; urgent NHS mental health <strong style="color:#ffffff;">111</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  const cta = o.cta ? `
          <tr>
            <td style="padding:4px 32px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:${TEAL};border-radius:26px;">
                    <a href="${o.cta.href}"
                       style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;
                              font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">
                      ${o.cta.label}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>ThrivSphere</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};">
  <!-- preheader: shown beside the subject in an inbox list, hidden in the message -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${o.preheader}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${GROUND};">
    <tr>
      <td align="center" style="padding:28px 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="width:100%;max-width:600px;background:${SURFACE};border-radius:14px;overflow:hidden;">

          <tr>
            <td align="center" style="padding:30px 32px 10px;">
              <img src="${logoUrl()}" width="140" alt="ThrivSphere Wellbeing CIC"
                   style="display:block;width:140px;max-width:140px;height:auto;border:0;">
            </td>
          </tr>

          <tr>
            <td style="padding:14px 32px 0;">
              <h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:23px;
                         line-height:1.25;font-weight:bold;color:${NAVY};">${o.heading}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;
                       line-height:1.65;color:${INK};">${o.body}</td>
          </tr>
${cta}${crisis}
          <tr>
            <td style="padding:0 32px 30px;border-top:1px solid ${RULE};">
              <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;
                        line-height:1.6;color:${MUTED};">
                ${o.footerNote ?? "We never include personal details or joining links in email."}
              </p>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;
                        line-height:1.6;color:${MUTED};">
                ThrivSphere Wellbeing CIC &middot; a non-clinical wellbeing, education and
                signposting service &middot;
                <a href="${siteUrl()}" style="color:${TEAL};">thrivsphere.org</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text crisis block, matching the HTML one. */
const CRISIS_TEXT = [
  "ThrivSphere is not an emergency or crisis service.",
  "If you need help right now: emergency 999 · Samaritans, free 24/7, 116 123",
  "· urgent NHS mental health 111.",
].join("\n");

function textShell(lines: string[], opts: { crisis?: boolean; footer?: string } = {}): string {
  return [
    ...lines,
    "",
    ...(opts.crisis === false ? [] : ["—", CRISIS_TEXT, ""]),
    opts.footer ?? "We never include personal details or joining links in email.",
    "",
    `ThrivSphere Wellbeing CIC · ${siteUrl()}`,
  ].join("\n");
}

const when = (d: Date) =>
  d.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ---------------------------------------------------------------- client */

export function bookingConfirmation(startsAt: Date): Email {
  const w = when(startsAt);
  return {
    subject: "Your appointment is confirmed",
    html: shell({
      preheader: "Your appointment details are in your account.",
      heading: "Your appointment is confirmed",
      body: `
        <p style="margin:0 0 14px;">Your appointment is confirmed for:</p>
        <p style="margin:0 0 18px;font-size:17px;font-weight:bold;color:${NAVY};">${w}</p>
        <p style="margin:0;">Sign in to your account to join, reschedule, or see the details.</p>`,
      cta: { label: "Go to my account", href: `${siteUrl()}/portal` },
    }),
    text: textShell([
      `Your appointment is confirmed for ${w}.`,
      "",
      "Sign in to your account to join, reschedule, or see the details:",
      `${siteUrl()}/portal`,
    ]),
  };
}

export function reminder24h(startsAt: Date): Email {
  const w = when(startsAt);
  return {
    subject: "Your appointment tomorrow",
    html: shell({
      preheader: "A reminder of your upcoming appointment.",
      heading: "Your appointment is tomorrow",
      body: `
        <p style="margin:0 0 14px;">This is a reminder of your appointment:</p>
        <p style="margin:0 0 18px;font-size:17px;font-weight:bold;color:${NAVY};">${w}</p>
        <p style="margin:0;">If you need to rearrange, please let us know as soon as you can —
        at least 24 hours' notice means there is no charge.</p>`,
      cta: { label: "View my appointment", href: `${siteUrl()}/portal` },
      footerNote: "You can turn these reminders off at any time in your account settings.",
    }),
    text: textShell(
      [
        `This is a reminder of your appointment on ${w}.`,
        "",
        "If you need to rearrange, please let us know as soon as you can —",
        "at least 24 hours' notice means there is no charge.",
        "",
        `Your account: ${siteUrl()}/portal`,
      ],
      { footer: "You can turn these reminders off at any time in your account settings." }
    ),
  };
}

export function reminder1h(startsAt: Date): Email {
  const w = when(startsAt);
  return {
    subject: "Your appointment is soon",
    html: shell({
      preheader: "Your appointment starts shortly.",
      heading: "Your appointment is soon",
      body: `
        <p style="margin:0 0 14px;">Your appointment starts at:</p>
        <p style="margin:0 0 18px;font-size:17px;font-weight:bold;color:${NAVY};">${w}</p>
        <p style="margin:0;">Sign in a few minutes beforehand — your joining link is waiting
        in your account.</p>`,
      cta: { label: "Join from my account", href: `${siteUrl()}/portal` },
      footerNote: "You can turn these reminders off at any time in your account settings.",
    }),
    text: textShell(
      [
        `Your appointment starts at ${w}.`,
        "",
        "Sign in a few minutes beforehand — your joining link is waiting in your account:",
        `${siteUrl()}/portal`,
      ],
      { footer: "You can turn these reminders off at any time in your account settings." }
    ),
  };
}

/**
 * New secure message.
 *
 * Says only that a message exists. The whole point of in-portal messaging is
 * that its contents never travel by email.
 */
export function secureMessageNotice(): Email {
  return {
    subject: "You have a new message",
    html: shell({
      preheader: "Sign in to read it.",
      heading: "You have a new message",
      body: `
        <p style="margin:0 0 14px;">Someone at ThrivSphere has sent you a message.</p>
        <p style="margin:0;">Messages stay inside your account, so you'll need to sign in
        to read it.</p>`,
      cta: { label: "Read my message", href: `${siteUrl()}/portal/messages` },
    }),
    text: textShell([
      "Someone at ThrivSphere has sent you a message.",
      "",
      "Messages stay inside your account, so you'll need to sign in to read it:",
      `${siteUrl()}/portal/messages`,
    ]),
  };
}

export function paymentReceipt(planName: string, amountPence: number, sessions: number): Email {
  const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    amountPence / 100
  );
  const s = sessions === 1 ? "1 session" : `${sessions} sessions`;
  return {
    subject: "Payment received",
    html: shell({
      preheader: "Your sessions are ready to book.",
      heading: "Thank you — payment received",
      body: `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
               style="border:1px solid ${RULE};border-radius:10px;margin:0 0 18px;">
          <tr>
            <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">${planName}</p>
              <p style="margin:0;font-size:22px;font-weight:bold;color:${NAVY};">${amount}</p>
              <p style="margin:6px 0 0;font-size:13.5px;color:${INK};">${s} added to your account</p>
            </td>
          </tr>
        </table>
        <p style="margin:0;">You can book whenever you're ready.</p>`,
      cta: { label: "Book a session", href: `${siteUrl()}/portal/book` },
      footerNote: "Keep this email as your receipt.",
    }),
    text: textShell(
      [
        "Thank you — your payment has been received.",
        "",
        `${planName}: ${amount}`,
        `${s} added to your account.`,
        "",
        `Book whenever you're ready: ${siteUrl()}/portal/book`,
      ],
      { footer: "Keep this email as your receipt." }
    ),
  };
}

/* ----------------------------------------------------------------- staff */

/**
 * Internal enquiry notification.
 *
 * Goes to ThrivSphere, not a client, so it carries the enquiry details and
 * drops the crisis block — staff do not need signposting in their own inbox.
 */
export function enquiryNotification(fields: {
  name: string;
  email: string;
  service?: string;
  phone?: string;
  preferredTimes?: string;
  message?: string;
}): Email {
  const row = (label: string, value?: string) =>
    value
      ? `<tr>
           <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};width:135px;vertical-align:top;">${label}</td>
           <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;color:${INK};">${escapeHtml(value)}</td>
         </tr>`
      : "";

  return {
    subject: `${fields.preferredTimes || fields.phone ? "Booking request" : "Website enquiry"} — ${fields.name}`,
    html: shell({
      preheader: "A new enquiry from the website.",
      heading: "New enquiry",
      body: `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${row("Name", fields.name)}
          ${row("Email", fields.email)}
          ${row("Phone", fields.phone)}
          ${row("Service", fields.service)}
          ${row("Preferred times", fields.preferredTimes)}
        </table>
        ${
          fields.message
            ? `<p style="margin:18px 0 6px;font-size:13px;color:${MUTED};">Message</p>
               <p style="margin:0;padding:14px 16px;background:${GROUND};border-radius:8px;
                         white-space:pre-wrap;">${escapeHtml(fields.message)}</p>`
            : ""
        }`,
      showCrisis: false,
      // Escaped: every field here is written by a stranger, and the footer
      // is interpolated into HTML just like the table rows above.
      footerNote: `Reply directly to this email to reach ${escapeHtml(fields.name)}.`,
    }),
    text: textShell(
      [
        "New enquiry from the website.",
        "",
        `Name: ${fields.name}`,
        `Email: ${fields.email}`,
        `Phone: ${fields.phone || "Not given"}`,
        `Service: ${fields.service || "Not specified"}`,
        `Preferred times: ${fields.preferredTimes || "Not given"}`,
        "",
        "Message:",
        fields.message || "(no message)",
      ],
      { crisis: false, footer: `Reply directly to this email to reach ${fields.name}.` }
    ),
  };
}

/** Enquiry text is written by the public, so it is escaped before templating. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export { GOLD };
