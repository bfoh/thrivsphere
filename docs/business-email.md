# Business email (checklist §8)

The checklist asks for:

- a shared general mailbox (such as `info@`) that Patience and Lucy each open
  with their own login;
- an individual mailbox for each of them;
- room for more staff;
- MFA, business ownership of the admin account, and website enquiries
  delivered to the business mailbox.

## Where things stand (checked 31 October 2026)

- `thrivsphere.org` has **no MX record**, so no address at the domain can
  receive mail yet. That includes `hello@thrivsphere.org`, which the website
  shows as the contact address and which outgoing emails use as their reply-to
  address.
- Website enquiries are delivered to the address in `ENQUIRY_TO_EMAIL`, which
  is currently a Gmail address.
- Sending is already set up. Brevo sends the website's emails from
  `no-reply@thrivsphere.org`, and its SPF, DKIM and DMARC records are
  published. Nothing below may remove them.

## 1. Choose a provider

Either works, priced per user per month:

| | Google Workspace (Business Starter) | Microsoft 365 (Business Basic) |
|---|---|---|
| Shared `info@` with separate logins | A Google Group set up as a *collaborative inbox* | A *shared mailbox* (no extra licence) |
| Individual mailboxes | One licence each for Patience and Lucy | One licence each for Patience and Lucy |
| More staff later | Add a user | Add a user |

The owner signs up, using the business's own details and payment. That makes
the business the owner of the account (§8 "business ownership and administrator
access").

## 2. Accounts

1. **Users:** `patience@thrivsphere.org` and `lucy@thrivsphere.org` (or the
   addresses the owner confirms).
2. **Shared mailbox:** `info@thrivsphere.org`. Give both users access.
3. **Alias:** add `hello@thrivsphere.org` as an alias of `info@`, so the
   address already on the website and in email replies starts working.
4. **MFA:** turn on two-step verification and enforce it for every user in the
   admin console.
5. **Admin:** keep the owner as the only super administrator. A developer, if
   needed, gets a separate, limited admin role that can be removed.

## 3. DNS at the domain registrar

The provider's setup wizard gives exact values. When adding them:

- **MX:** add the provider's MX records. This is what makes mail arrive.
- **SPF:** a domain may have only **one** SPF record. Edit the existing one to
  include both senders rather than adding a second:
  - Google: `v=spf1 include:spf.brevo.com include:_spf.google.com ~all`
  - Microsoft: `v=spf1 include:spf.brevo.com include:spf.protection.outlook.com ~all`
- **DKIM:** add the provider's DKIM record alongside Brevo's (they use different
  names and do not clash), then switch DKIM signing on in the admin console.
- **DMARC:** keep the existing `_dmarc` record. Once mail has flowed cleanly for
  a few weeks, tighten `p=none` to `p=quarantine`.
- **Keep:** the `brevo-code` TXT record and Brevo's DKIM records.

## 4. Point the website at the shared mailbox

Once `info@` receives mail:

```bash
vercel env rm ENQUIRY_TO_EMAIL production
printf '%s' "info@thrivsphere.org" | vercel env add ENQUIRY_TO_EMAIL production
```

Then redeploy. Send a test enquiry from `/contact` and a test reply to a
booking email, and check both arrive in `info@` (§15).

If the owner chooses an address other than `hello@` for the website, change
`brand.email` in `src/data/site.ts`.
