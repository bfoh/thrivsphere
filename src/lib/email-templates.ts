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

import { legal } from "@/data/site";
import { NOTICE_PERIOD } from "@/lib/allocation";

const NAVY = "#1f3a5f";
const TEAL = "#3d8a8a";
const GOLD = "#bd951f";
const INK = "#2b3a4d";
const MUTED = "#5d7089";
const GROUND = "#f2f5f4";
const SURFACE = "#ffffff";
const RULE = "#e2e7ea";
const PURPLE = "#5a2d82";

export type Email = { subject: string; html: string; text: string };

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";
}

/**
 * Absolute URL — email clients cannot resolve relative paths.
 *
 * The emblem only: the full logo artwork carries an outdated name, so the
 * wordmark is set as text beneath it in the shell.
 */
function logoUrl(): string {
  return `${siteUrl()}/images/email/emblem.png`;
}

/** Company details every business email must carry, in HTML and in text. */
const LEGAL_LINE = `${legal.statement} Registered office: ${legal.registeredOffice}.`;

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
                      ThriveSphere is not an emergency or crisis service
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
<title>ThriveSphere</title>
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
              <img src="${logoUrl()}" width="72" height="72" alt=""
                   style="display:block;width:72px;max-width:72px;height:auto;border:0;">
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:21px;
                        font-weight:bold;line-height:1;"><span style="color:${PURPLE};">Thrive</span><span
                        style="color:${TEAL};">Sphere</span></p>
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                        font-weight:bold;letter-spacing:3px;color:${GOLD};">WELLBEING</p>
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
                ThriveSphere Wellbeing &middot; a non-clinical wellbeing, education and
                signposting service &middot;
                <a href="${siteUrl()}" style="color:${TEAL};">thrivsphere.org</a>
              </p>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;
                        line-height:1.6;color:${MUTED};">${LEGAL_LINE}</p>
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
  "ThriveSphere is not an emergency or crisis service.",
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
    `ThriveSphere Wellbeing · ${siteUrl()}`,
    LEGAL_LINE,
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
        <p style="margin:0;">If you can no longer attend, please let us know as soon as you can.
        As it is less than ${NOTICE_PERIOD} away, the session counts as used if cancelled, but if
        something urgent has come up, message us and we will be fair.</p>`,
      cta: { label: "View my appointment", href: `${siteUrl()}/portal` },
      footerNote: "You can turn these reminders off at any time in your account settings.",
    }),
    text: textShell(
      [
        `This is a reminder of your appointment on ${w}.`,
        "",
        "If you can no longer attend, please let us know as soon as you can.",
        `As it is less than ${NOTICE_PERIOD} away, the session counts as used if cancelled, but if`,
        "something urgent has come up, message us and we will be fair.",
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
 * An appointment was cancelled.
 *
 * `late` follows the Cancellation and Refund Policy: with less than 72 hours'
 * notice the session counts as used, and the client is told so plainly rather
 * than finding out from their balance.
 */
export function appointmentCancelled(startsAt: Date, o: { by: "client" | "service"; late?: boolean }): Email {
  const w = when(startsAt);
  const outcome =
    o.by === "service"
      ? "We're sorry for the change. Any session it used has been returned to your account."
      : o.late
        ? `As it was cancelled with less than ${NOTICE_PERIOD}' notice, the session counts as used, in line with our Cancellation and Refund Policy.`
        : "Any session it used has been returned to your account.";
  const lead = o.by === "service" ? "We have had to cancel your appointment on:" : "Your appointment has been cancelled:";
  return {
    subject: "Your appointment has been cancelled",
    html: shell({
      preheader: "A change to your appointments.",
      heading: "Your appointment has been cancelled",
      body: `
        <p style="margin:0 0 14px;">${lead}</p>
        <p style="margin:0 0 18px;font-size:17px;font-weight:bold;color:${NAVY};">${w}</p>
        <p style="margin:0 0 14px;">${outcome}</p>
        <p style="margin:0;">You can book another time from your account whenever you're ready.</p>`,
      cta: { label: "Book another time", href: `${siteUrl()}/portal/book` },
    }),
    text: textShell([
      lead,
      w,
      "",
      outcome,
      "",
      `Book another time from your account: ${siteUrl()}/portal/book`,
    ]),
  };
}

/** An appointment was moved to a new time. */
export function appointmentMoved(startsAt: Date): Email {
  const w = when(startsAt);
  return {
    subject: "Your appointment has changed",
    html: shell({
      preheader: "Your new appointment time is in your account.",
      heading: "Your appointment has moved",
      body: `
        <p style="margin:0 0 14px;">Your appointment is now on:</p>
        <p style="margin:0 0 18px;font-size:17px;font-weight:bold;color:${NAVY};">${w}</p>
        <p style="margin:0;">Sign in to your account to join or see the details.</p>`,
      cta: { label: "Go to my account", href: `${siteUrl()}/portal/appointments` },
    }),
    text: textShell([
      `Your appointment is now on ${w}.`,
      "",
      "Sign in to your account to join or see the details:",
      `${siteUrl()}/portal/appointments`,
    ]),
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
        <p style="margin:0 0 14px;">Someone at ThriveSphere has sent you a message.</p>
        <p style="margin:0;">Messages stay inside your account, so you'll need to sign in
        to read it.</p>`,
      cta: { label: "Read my message", href: `${siteUrl()}/portal/messages` },
    }),
    text: textShell([
      "Someone at ThriveSphere has sent you a message.",
      "",
      "Messages stay inside your account, so you'll need to sign in to read it:",
      `${siteUrl()}/portal/messages`,
    ]),
  };
}

/**
 * A worksheet has been set for the client.
 *
 * Says no more than that something is waiting in their account: not which
 * worksheet, and nothing about why. A worksheet title about emotions is itself
 * a disclosure to anyone else reading the inbox — so even the link goes to the
 * account overview, which lists it, rather than to a /worksheets address.
 */
export function worksheetAssigned(): Email {
  return {
    subject: "Something new in your account",
    html: shell({
      preheader: "Sign in to see it.",
      heading: "Something new in your account",
      body: `
        <p style="margin:0 0 14px;">Your practitioner has added something for you to look at in your
        account, ready for when it suits you.</p>
        <p style="margin:0;">It stays inside your account, so you'll need to sign in to see it.</p>`,
      cta: { label: "Open my account", href: `${siteUrl()}/portal` },
    }),
    text: textShell([
      "Your practitioner has added something for you to look at in your account, ready for when it suits you.",
      "",
      "It stays inside your account, so you'll need to sign in to see it:",
      `${siteUrl()}/portal`,
    ]),
  };
}

/** Staff: a client has sent a worksheet back. Links to the record; names nobody. */
export function worksheetSubmitted(o: { clientId: string; assignmentId: string }): Email {
  const href = `${siteUrl()}/admin/clients/${o.clientId}/worksheets/${o.assignmentId}`;
  return {
    subject: "A worksheet is ready to review",
    html: shell({
      preheader: "A client has sent back a worksheet.",
      heading: "A worksheet is ready to review",
      body: `<p style="margin:0;">A client has sent back a worksheet you set. Their answers are in their record.</p>`,
      cta: { label: "Open the worksheet", href },
      showCrisis: false,
    }),
    text: textShell(
      ["A client has sent back a worksheet you set. Their answers are in their record.", "", `Worksheet: ${href}`],
      { crisis: false }
    ),
  };
}

export function paymentReceipt(
  planName: string,
  amountPence: number,
  sessions: number,
  opts: {
    forBooking?: boolean;
    /** A discount: the full price, the amount off and the discount's name. */
    discount?: { listPence: number; discountPence: number; label: string };
  } = {}
): Email {
  const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
  const amount = gbp(amountPence);
  const d = opts.discount && opts.discount.discountPence > 0 ? opts.discount : null;
  // Price, discount and what was paid, when a discount was used.
  const breakdownHtml = d
    ? `<p style="margin:0 0 6px;font-size:13px;color:${MUTED};">Price ${gbp(d.listPence)} · ${escapeHtml(d.label)} −${gbp(d.discountPence)}</p>`
    : "";
  const s = sessions === 1 ? "1 session" : `${sessions} sessions`;
  // Paid while booking (§19): the session is already booked, so the receipt
  // points to the appointment rather than asking them to book.
  const what = opts.forBooking ? "For the appointment you have booked" : `${s} added to your account`;
  const next = opts.forBooking
    ? "Your appointment confirmation is sent separately, and the appointment is in your account."
    : "You can book whenever you're ready.";
  const cta = opts.forBooking
    ? { label: "See my appointments", href: `${siteUrl()}/portal/appointments` }
    : { label: "Book a session", href: `${siteUrl()}/portal/book` };
  return {
    subject: "Payment received",
    html: shell({
      preheader: opts.forBooking ? "Your payment is confirmed." : "Your sessions are ready to book.",
      heading: "Thank you — payment received",
      body: `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
               style="border:1px solid ${RULE};border-radius:10px;margin:0 0 18px;">
          <tr>
            <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">${planName}</p>
              ${breakdownHtml}
              <p style="margin:0;font-size:22px;font-weight:bold;color:${NAVY};">${d ? "Paid " : ""}${amount}</p>
              <p style="margin:6px 0 0;font-size:13.5px;color:${INK};">${what}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0;">${next}</p>`,
      cta,
      footerNote: "Keep this email as your receipt.",
    }),
    text: textShell(
      [
        "Thank you — your payment has been received.",
        "",
        ...(d
          ? [`${planName}`, `Price: ${gbp(d.listPence)}`, `${d.label}: -${gbp(d.discountPence)}`, `Paid: ${amount}`]
          : [`${planName}: ${amount}`]),
        `${what}.`,
        "",
        opts.forBooking ? `${next} ${cta.href}` : `Book whenever you're ready: ${cta.href}`,
      ],
      { footer: "Keep this email as your receipt." }
    ),
  };
}

/* ----------------------------------------------------------------- staff */

/**
 * A practitioner's diary changed.
 *
 * Sent to the practitioner, with the time only: the client's name and details
 * stay in the back office rather than in an inbox.
 */
export function staffAppointmentNotice(
  change: "booked" | "cancelled" | "moved" | "assigned",
  startsAt: Date
): Email {
  const w = when(startsAt);
  const line = {
    booked: "A client has booked a session with you:",
    cancelled: "A client has cancelled their session:",
    moved: "A client has moved their session to:",
    assigned: "A session has been assigned to you:",
  }[change];
  const subject = {
    booked: "New booking",
    cancelled: "Booking cancelled",
    moved: "Booking moved",
    assigned: "Booking assigned to you",
  }[change];
  return {
    subject: `${subject} — ${w}`,
    html: shell({
      preheader: "A change to your appointments.",
      heading: subject,
      body: `
        <p style="margin:0 0 14px;">${line}</p>
        <p style="margin:0;font-size:17px;font-weight:bold;color:${NAVY};">${w}</p>`,
      cta: { label: "Open appointments", href: `${siteUrl()}/admin/appointments` },
      showCrisis: false,
    }),
    text: textShell([line, w, "", `Appointments: ${siteUrl()}/admin/appointments`], { crisis: false }),
  };
}

/**
 * A payment changed in Stripe and a client's sessions changed with it.
 *
 * Goes to ThriveSphere. Like the diary notices it carries no client details:
 * the link opens the client's record in the back office.
 */
export function paymentAlert(o: { subject: string; lines: string[]; clientId: string }): Email {
  const href = `${siteUrl()}/admin/clients/${o.clientId}`;
  return {
    subject: o.subject,
    html: shell({
      preheader: "A change to a client's sessions.",
      heading: o.subject,
      body: o.lines.map((line) => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`).join(""),
      cta: { label: "Open the client's record", href },
      showCrisis: false,
    }),
    text: textShell([...o.lines, "", `Client record: ${href}`], { crisis: false }),
  };
}

/**
 * Acknowledgement to someone who sent an enquiry (IT handover §16.5).
 *
 * The subject and body are the handover's wording. It repeats nothing they
 * wrote, so a forwarded or shared inbox shows only that they got in touch.
 */
export function enquiryAcknowledgement(reference: string): Email {
  const ref = escapeHtml(reference);
  return {
    subject: `ThriveSphere Wellbeing — enquiry received ${reference}`,
    html: shell({
      preheader: "We have received your message.",
      heading: "Enquiry received",
      body: `
        <p style="margin:0 0 14px;">Thank you for your enquiry. We have received your message and will respond through our approved contact channels.</p>
        <p style="margin:0 0 14px;">Your reference is <strong style="color:${NAVY};">${ref}</strong>. Please keep it for future correspondence.</p>
        <p style="margin:0;">Please do not send sensitive wellbeing information by reply to this general enquiry email. ThriveSphere is not an emergency service.</p>`,
    }),
    text: textShell([
      "Thank you for your enquiry. We have received your message and will respond through our approved contact channels.",
      "",
      `Your reference is ${reference}. Please keep it for future correspondence.`,
      "",
      "Please do not send sensitive wellbeing information by reply to this general enquiry email. ThriveSphere is not an emergency service.",
    ]),
  };
}

/**
 * Acknowledgement of a callback request (IT handover §19, Route B): sent at
 * once, saying ThriveSphere will be in touch. It promises no response time and
 * implies no free assessment.
 */
export function callbackAcknowledgement(reference: string): Email {
  const ref = escapeHtml(reference);
  return {
    subject: `ThriveSphere Wellbeing — callback request received ${reference}`,
    html: shell({
      preheader: "We have received your callback request.",
      heading: "Callback request received",
      body: `
        <p style="margin:0 0 14px;">Thank you for your request. ThriveSphere will be in touch using the contact method you chose, to arrange your Initial Wellbeing Consultation.</p>
        <p style="margin:0 0 14px;">Your reference is <strong style="color:${NAVY};">${ref}</strong>. Please keep it for future correspondence.</p>
        <p style="margin:0;">Please do not send sensitive wellbeing information by reply to this email. ThriveSphere is not an emergency service.</p>`,
    }),
    text: textShell([
      "Thank you for your request. ThriveSphere will be in touch using the contact method you chose, to arrange your Initial Wellbeing Consultation.",
      "",
      `Your reference is ${reference}. Please keep it for future correspondence.`,
      "",
      "Please do not send sensitive wellbeing information by reply to this email. ThriveSphere is not an emergency service.",
    ]),
  };
}

/**
 * Tells ThriveSphere a new enquiry is waiting (IT handover §16.4).
 *
 * A link to the protected record and nothing else: no name, no email address,
 * no message. The inbox it goes to may be read on a shared phone or by an
 * email provider; the record itself is behind sign-in and every view of it is
 * logged.
 */
export function enquiryStaffNotice(o: { id: string; reference: string; category: string }): Email {
  const href = `${siteUrl()}/admin/enquiries/${o.id}`;
  const kind = o.category === "callback" ? "callback request" : "enquiry";
  return {
    subject: `New website ${kind} ${o.reference}`,
    html: shell({
      preheader: `A new ${kind} is in the queue.`,
      heading: `New ${kind}`,
      body: `
        <p style="margin:0 0 14px;">A new ${kind}, reference <strong style="color:${NAVY};">${escapeHtml(o.reference)}</strong>, is waiting in the Enquiries queue.</p>
        <p style="margin:0;">Its details are in the admin dashboard, not in this email.</p>`,
      cta: { label: "Open the enquiry", href },
      showCrisis: false,
    }),
    text: textShell(
      [`A new ${kind}, reference ${o.reference}, is waiting in the Enquiries queue.`, "", `Open it: ${href}`],
      { crisis: false, footer: "Its details are in the admin dashboard, not in this email." }
    ),
  };
}

/**
 * A blog post is waiting for review. Link only, like every staff notice: the
 * post itself is read in the back office.
 */
export function blogReviewRequest(o: { postId: string }): Email {
  const href = `${siteUrl()}/admin/blog/${o.postId}`;
  return {
    subject: "A blog post is waiting for your review",
    html: shell({
      preheader: "A blog post is ready for review.",
      heading: "A blog post is ready for review",
      body: `
        <p style="margin:0 0 14px;">A colleague has sent a blog post for review. Nothing goes on the website until a reviewer approves it.</p>
        <p style="margin:0;">You can read it, see what changed and approve it or ask for changes in the admin dashboard.</p>`,
      cta: { label: "Review the post", href },
      showCrisis: false,
    }),
    text: textShell(
      ["A colleague has sent a blog post for review. Nothing goes on the website until a reviewer approves it.", "", `Review it: ${href}`],
      { crisis: false }
    ),
  };
}

/**
 * A reader's comment is waiting for approval. Link only: what they wrote, and
 * who they are, stay in the dashboard. A comment that suggests the writer may
 * be at risk says so in the subject, so it is opened first.
 */
export function blogCommentNotice(o: { needsAttention: boolean }): Email {
  const href = `${siteUrl()}/admin/blog/comments`;
  const subject = o.needsAttention ? "A blog comment may need attention soon" : "A blog comment is waiting for approval";
  const line = o.needsAttention
    ? "A reader has left a comment that suggests they may be at risk. Please read it soon: it isn't on the website, and the reader's email address is with it if someone needs to follow up."
    : "A reader has left a comment on a blog post. It isn't on the website until someone approves it.";
  return {
    subject,
    html: shell({
      preheader: subject,
      heading: subject,
      body: `<p style="margin:0 0 14px;">${line}</p><p style="margin:0;">The comment is in the admin dashboard, not in this email.</p>`,
      cta: { label: "Open the comments", href },
      showCrisis: false,
    }),
    text: textShell([line, "", `Open the comments: ${href}`], { crisis: false, footer: "The comment is in the admin dashboard, not in this email." }),
  };
}

/** The author hears what the reviewer decided. The comment stays in the dashboard. */
export function blogReviewDecision(o: { postId: string; approved: boolean }): Email {
  const href = `${siteUrl()}/admin/blog/${o.postId}`;
  const heading = o.approved ? "Your blog post was approved" : "Changes were requested on your blog post";
  const line = o.approved
    ? "Your blog post has been approved. You can now publish it or schedule it."
    : "The reviewer has asked for some changes before your blog post can go on the website. Their comments are in the admin dashboard.";
  return {
    subject: heading,
    html: shell({
      preheader: heading,
      heading,
      body: `<p style="margin:0;">${line}</p>`,
      cta: { label: "Open the post", href },
      showCrisis: false,
    }),
    text: textShell([line, "", `Open it: ${href}`], { crisis: false }),
  };
}

/**
 * The booking and payment link staff send after a callback (§19, Route B).
 *
 * The client books and pays the same way as everyone else, so the price, the
 * length and the 72-hour notice are stated here as on the booking page.
 */
export function bookingLinkEmail(o: { price: string; practitionerId?: string | null; practitionerName?: string | null }): Email {
  const href = `${siteUrl()}/portal/book${o.practitionerId ? `?with=${encodeURIComponent(o.practitionerId)}` : ""}`;
  const withWhom = o.practitionerName ? ` with ${o.practitionerName}` : "";
  const intro = `You can now book your Initial Wellbeing Consultation${withWhom}: 50 minutes, online, ${o.price}.`;
  return {
    subject: "Book your Initial Wellbeing Consultation",
    html: shell({
      preheader: "Your booking link.",
      heading: "Book your consultation",
      body: `
        <p style="margin:0 0 14px;">Thank you for speaking with us. ${escapeHtml(intro)}</p>
        <p style="margin:0 0 14px;">Sign in, or create your ThriveSphere account, then choose a time${escapeHtml(withWhom)} and pay securely by card. Card payments are handled by Stripe; your card details never reach ThriveSphere.</p>
        <p style="margin:0;">To cancel or move an appointment free of charge, please give at least ${NOTICE_PERIOD}' notice.</p>`,
      cta: { label: "Book and pay securely", href },
    }),
    text: textShell([
      `Thank you for speaking with us. ${intro}`,
      "",
      `Sign in, or create your ThriveSphere account, then choose a time${withWhom} and pay securely by card:`,
      href,
      "",
      "Card payments are handled by Stripe; your card details never reach ThriveSphere.",
      `To cancel or move an appointment free of charge, please give at least ${NOTICE_PERIOD}' notice.`,
    ]),
  };
}

/**
 * Payment arrived but the time it was for had gone: the hold was released
 * before Stripe confirmed, and someone else took it. Rare, but the client has
 * paid, so they are told plainly and keep the consultation to book again.
 */
export function paidTimeUnavailable(): Email {
  return {
    subject: "Please choose a new time for your consultation",
    html: shell({
      preheader: "Your payment was received.",
      heading: "Please choose a new time",
      body: `
        <p style="margin:0 0 14px;">Thank you — your payment was received. Unfortunately the time you chose was no longer available by the time it arrived.</p>
        <p style="margin:0;">Your Initial Wellbeing Consultation is paid for. Please sign in and choose another time; nothing more will be charged.</p>`,
      cta: { label: "Choose a time", href: `${siteUrl()}/portal/book` },
    }),
    text: textShell([
      "Thank you — your payment was received. Unfortunately the time you chose was no longer available by the time it arrived.",
      "",
      "Your Initial Wellbeing Consultation is paid for. Please sign in and choose another time; nothing more will be charged:",
      `${siteUrl()}/portal/book`,
    ]),
  };
}

/**
 * Sent when the practitioner records Suitable after the initial consultation
 * (IT handover §13.1): ongoing sessions can now be booked. A neutral subject,
 * and nothing about the review itself.
 */
export function sessionsOpen(): Email {
  return {
    subject: "Your next steps with ThriveSphere Wellbeing",
    html: shell({
      preheader: "You can now book your sessions.",
      heading: "Your next steps",
      body: `
        <p style="margin:0 0 14px;">Thank you for attending your Initial Wellbeing Consultation. Your practitioner has confirmed your next steps.</p>
        <p style="margin:0;">You can now book your ongoing 50-minute sessions in your account, at a time that suits you.</p>`,
      cta: { label: "Book a session", href: `${siteUrl()}/portal/book` },
    }),
    text: textShell([
      "Thank you for attending your Initial Wellbeing Consultation. Your practitioner has confirmed your next steps.",
      "",
      "You can now book your ongoing 50-minute sessions in your account, at a time that suits you:",
      `${siteUrl()}/portal/book`,
    ]),
  };
}

/**
 * Sessions added at no charge: free sessions from ThriveSphere, or a 100%
 * concession. No amounts, and nothing about why.
 */
export function sessionsAdded(o: { sessions: number; consultation: boolean }): Email {
  const what = o.consultation
    ? "Your Initial Wellbeing Consultation has been added to your account, with nothing to pay."
    : `${o.sessions === 1 ? "1 session has" : `${o.sessions} sessions have`} been added to your account, with nothing to pay.`;
  const next = o.consultation ? "Choose a time whenever you're ready." : "You can book whenever you're ready.";
  return {
    subject: o.consultation ? "Your consultation is ready to book" : "Sessions added to your account",
    html: shell({
      preheader: o.consultation ? "Choose a time whenever you're ready." : "Your sessions are ready to book.",
      heading: o.consultation ? "Your consultation is ready to book" : "Sessions added to your account",
      body: `
        <p style="margin:0 0 14px;">${what}</p>
        <p style="margin:0;">${next}</p>`,
      cta: { label: o.consultation ? "Choose a time" : "Book a session", href: `${siteUrl()}/portal/book` },
    }),
    text: textShell([what, "", `${next} ${siteUrl()}/portal/book`]),
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
