# Email provider: Brevo

All transactional email goes through `src/lib/email.ts`, which posts to Brevo's
transactional endpoint. There is one provider boundary — no feature sends mail
directly.

## What email is used for

Notifications that carry **no personal content**:

- enquiry and booking requests from the public contact form (to ThrivSphere)
- appointment confirmations and reminders (to the client)

Anything personal stays behind authentication in the portal. Reminder bodies
contain only a date and time — no practitioner name, no reason for the
appointment, no joining link. See `src/lib/reminders.ts`.

## Environment variables

| Variable             | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `BREVO_API_KEY`      | Brevo API key (Brevo dashboard → SMTP & API → API keys)    |
| `EMAIL_FROM_ADDRESS` | Verified sender address, e.g. `no-reply@thrivsphere.org`   |
| `EMAIL_FROM_NAME`    | Sender display name. Defaults to the CIC's name            |
| `ENQUIRY_TO_EMAIL`   | Where contact-form enquiries land. Defaults to `brand.email` |

Set them on all three environments:

```bash
printf '%s' "<key>" | vercel env add BREVO_API_KEY production
printf '%s' "<key>" | vercel env add BREVO_API_KEY preview
printf '%s' "<key>" | vercel env add BREVO_API_KEY development
```

## Before it will deliver

Brevo requires the sending domain to be authenticated before it will deliver
reliably. In the Brevo dashboard, add `thrivsphere.org` under **Senders,
Domains & Dedicated IPs** and publish the DKIM and Brevo code DNS records it
gives you, plus an SPF record.

Without this, mail is likely to be rejected or land in spam — which for an
appointment reminder means a client simply does not turn up.

## Behaviour when unconfigured

`sendEmail` returns `{ ok: false }` rather than throwing.

- The contact form tells the person the message did not send and gives them the
  address to write to directly. It never claims success.
- The reminder job records nothing as sent, so the next run retries rather than
  skipping the appointment.

## Why not the Vercel Marketplace

Brevo is not offered there. It is configured manually with the key above, which
is why these variables are set by hand rather than provisioned automatically.
