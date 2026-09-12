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

## Sender address

`thrivsphere.org` is authenticated in Brevo (DKIM and SPF published, verified
12 September 2026). Mail is sent from `no-reply@thrivsphere.org`.

There is no "no-reply" mailbox in Brevo, and there does not need to be. Once a
domain is authenticated, Brevo accepts **any** address at that domain as a
sender — the per-address "Senders" list is only for people sending from a
domain they do not control, such as a Gmail address.

So the sending address is chosen here, in `EMAIL_FROM_ADDRESS`, not in Brevo.
Changing it to `bookings@thrivsphere.org` or anything else at the same domain
needs no Brevo change at all.

`no-reply@` does not receive mail. Replies are directed to `hello@thrivsphere.org`
by the `replyTo` field, so a client who hits reply still reaches a real inbox —
worth checking that mailbox exists and is monitored.

## Behaviour when unconfigured

`sendEmail` returns `{ ok: false }` rather than throwing.

- The contact form tells the person the message did not send and gives them the
  address to write to directly. It never claims success.
- The reminder job records nothing as sent, so the next run retries rather than
  skipping the appointment.

## Why not the Vercel Marketplace

Brevo is not offered there. It is configured manually with the key above, which
is why these variables are set by hand rather than provisioned automatically.
