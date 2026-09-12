/**
 * Apply ThrivSphere branding to the emails Clerk sends.
 *
 * Verification codes, password resets and sign-in links are sent by Clerk, not
 * by this application, so they cannot be templated in src/lib/email-templates.ts.
 * They are customised through Clerk's API instead, and this script is the
 * source of truth for them.
 *
 * Re-run it after creating a production Clerk instance — templates belong to an
 * instance, so a new one starts with Clerk's defaults again.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/brand-clerk-emails.ts
 *   npx dotenv -e .env.local -- npx tsx scripts/brand-clerk-emails.ts --dry-run
 *
 * Clerk's own variables are preserved exactly — {{otp_code}}, {{magic_link}},
 * {{requested_from}} and so on. The service name is written literally rather
 * than using {{app.name}}, so these emails read correctly regardless of what
 * the application happens to be called in the Clerk dashboard.
 */

const API = "https://api.clerk.com/v1";

const NAVY = "#1f3a5f";
const TEAL = "#3d8a8a";
const INK = "#2b3a4d";
const MUTED = "#5d7089";
const GROUND = "#f2f5f4";
const RULE = "#e2e7ea";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";
const LOGO = `${SITE}/images/email/logo.png`;
const BRAND = "ThrivSphere Wellbeing CIC";

type Section = { heading: string; body: string; showCrisis?: boolean };

/**
 * The same shell as the application's own emails, so a verification code and
 * an appointment reminder look like they came from the same organisation.
 */
function shell({ heading, body, showCrisis = true }: Section): string {
  const crisis = showCrisis
    ? `
        <tr>
          <td style="padding:0 32px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${NAVY};border-radius:10px;">
              <tr>
                <td style="padding:18px 22px;font-family:Arial,Helvetica,sans-serif;">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#ffffff;line-height:1.4;">ThrivSphere is not an emergency or crisis service</p>
                  <p style="margin:0;font-size:13px;color:#c8d6e8;line-height:1.6;">If you need help right now: emergency <strong style="color:#ffffff;">999</strong> &middot; Samaritans, free 24/7 <strong style="color:#ffffff;">116&nbsp;123</strong> &middot; urgent NHS mental health <strong style="color:#ffffff;">111</strong></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>ThrivSphere</title></head>
<body style="margin:0;padding:0;background:${GROUND};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${GROUND};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
      <tr><td align="center" style="padding:30px 32px 10px;">
        <img src="${LOGO}" width="140" alt="${BRAND}" style="display:block;width:140px;max-width:140px;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:14px 32px 0;">
        <h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:23px;line-height:1.25;font-weight:bold;color:${NAVY};">${heading}</h1>
      </td></tr>
      <tr><td style="padding:0 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15.5px;line-height:1.65;color:${INK};">${body}</td></tr>
${crisis}
      <tr><td style="padding:0 32px 30px;border-top:1px solid ${RULE};">
        <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:${MUTED};">If you weren't expecting this email, you can safely ignore it — nothing will change.</p>
        <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:${MUTED};">${BRAND} &middot; a non-clinical wellbeing, education and signposting service &middot; <a href="${SITE}" style="color:${TEAL};">thrivsphere.org</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Large, spaced code block — the thing the reader is looking for. */
function codeBlock(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
    <tr><td align="center" style="background:${GROUND};border-radius:10px;padding:22px 16px;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:7px;color:${NAVY};">{{otp_code}}</div>
    </td></tr>
  </table>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;">
    <tr><td style="background:${TEAL};border-radius:26px;">
      <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;
}

type TemplateSpec = { slug: string; subject: string; heading: string; body: string; showCrisis?: boolean };

const TEMPLATES: TemplateSpec[] = [
  {
    slug: "verification_code",
    subject: "Your ThrivSphere verification code",
    heading: "Confirm your email address",
    body:
      `<p style="margin:0 0 16px;">Enter this code to finish setting up your ThrivSphere account:</p>` +
      codeBlock() +
      `<p style="margin:0;">The code expires shortly. If you didn't try to create an account, you can ignore this email.</p>`,
  },
  {
    slug: "reset_password_code",
    subject: "Your ThrivSphere password reset code",
    heading: "Reset your password",
    body:
      `<p style="margin:0 0 16px;">Use this code to set a new password:</p>` +
      codeBlock() +
      `<p style="margin:0;">If you didn't ask to reset your password, ignore this email — your password will stay as it is.</p>`,
  },
  {
    slug: "magic_link_sign_in",
    subject: "Your ThrivSphere sign-in link",
    heading: "Sign in to ThrivSphere",
    body:
      `<p style="margin:0 0 16px;">Use the button below to sign in. The link works once and expires shortly.</p>` +
      button("Sign in", "{{magic_link}}") +
      `<p style="margin:0;">If you didn't request this, you can ignore it.</p>`,
  },
  {
    slug: "magic_link_sign_up",
    subject: "Finish creating your ThrivSphere account",
    heading: "Confirm your email address",
    body:
      `<p style="margin:0 0 16px;">Use the button below to finish creating your account.</p>` +
      button("Confirm my email", "{{magic_link}}") +
      `<p style="margin:0;">If you didn't try to create an account, you can ignore this email.</p>`,
  },
  {
    slug: "magic_link_user_profile",
    subject: "Verify your email address",
    heading: "Verify your email address",
    body:
      `<p style="margin:0 0 16px;">Use the button below to confirm this email address on your ThrivSphere account.</p>` +
      button("Verify email", "{{magic_link}}") +
      `<p style="margin:0;">If this wasn't you, ignore this email and nothing will change.</p>`,
  },
  {
    slug: "password_changed",
    subject: "Your ThrivSphere password was changed",
    heading: "Your password was changed",
    // Clerk requires {{primary_email_address}} in this template, so the reader
    // can see which account the notice is about.
    body:
      `<p style="margin:0 0 16px;">The password for <strong>{{primary_email_address}}</strong> has just been changed.</p>` +
      `<p style="margin:0;"><strong>If this wasn't you</strong>, reset your password now and contact us at <a href="mailto:hello@thrivsphere.org" style="color:${TEAL};">hello@thrivsphere.org</a>.</p>`,
  },
  {
    slug: "new_device_sign_in",
    subject: "New sign-in to your ThrivSphere account",
    heading: "A new device signed in",
    body:
      `<p style="margin:0 0 16px;">Someone signed in to your ThrivSphere account from a new device.</p>` +
      `<p style="margin:0 0 16px;color:${MUTED};font-size:14px;">{{requested_from}}{{#if requested_at}} &middot; {{requested_at}}{{/if}}</p>` +
      `<p style="margin:0;"><strong>If this wasn't you</strong>, change your password and contact us at <a href="mailto:hello@thrivsphere.org" style="color:${TEAL};">hello@thrivsphere.org</a>.</p>`,
  },
  {
    slug: "account_locked",
    subject: "Your ThrivSphere account is temporarily locked",
    heading: "Your account is temporarily locked",
    body:
      `<p style="margin:0 0 16px;">Too many sign-in attempts, so your account has been locked for a short time to keep it safe.</p>` +
      `<p style="margin:0;">You can try again shortly. If you're stuck, email <a href="mailto:hello@thrivsphere.org" style="color:${TEAL};">hello@thrivsphere.org</a> and we'll help.</p>`,
  },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    console.error("CLERK_SECRET_KEY is not set.");
    process.exit(1);
  }

  let updated = 0;
  let failed = 0;

  for (const t of TEMPLATES) {
    const payload = {
      name: t.slug,
      subject: t.subject,
      markup: "",
      body: shell({ heading: t.heading, body: t.body, showCrisis: t.showCrisis }),
      delivered_by_clerk: true,
      from_email_name: "no-reply",
    };

    if (dryRun) {
      console.log(`would update ${t.slug.padEnd(26)} "${t.subject}"`);
      continue;
    }

    const res = await fetch(`${API}/templates/email/${t.slug}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`updated ${t.slug.padEnd(26)} "${t.subject}"`);
      updated++;
    } else {
      const detail = await res.text().catch(() => "");
      console.error(`FAILED  ${t.slug.padEnd(26)} ${res.status} ${detail.slice(0, 180)}`);
      failed++;
    }
  }

  if (!dryRun) console.log(`\n${updated} updated, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
