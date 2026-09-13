# Clerk webhook

Endpoint: `POST https://thrivsphere.org/api/webhooks/clerk`

**Registered on the production instance (`ins_3JFN1yqK9s2LrSclSjhqYsihgMq`) on
13 September 2026** and verified end to end: a real sign-in and sign-out
produced a matching `login`/`logout` pair in the activity log, and forged
requests — tampered body, replay outside the tolerance window, wrong secret, no
headers — were all refused with 400 and logged as `permission_denied`. Re-run
`scripts/probe-webhook.ts` to check the door again after any change.

It does two things:

- writes **sign-in and sign-out** entries to the activity log, so the log has a
  beginning and an end rather than only showing what was opened;
- applies the **role attached to a staff invitation** when the account is
  created, so a new colleague never exists with permissions nobody chose;
- keeps **name and email in step** when someone changes their own details in
  Clerk, so invitations, receipts and reminders are not sent to a stale
  address.

`user.updated` deliberately does *not* apply a role, even though the role sits
in the same metadata. Roles live in our `users` table precisely so a privilege
level cannot be changed from a third-party dashboard without an audit row.

Until it is registered, both are simply absent. Nothing else breaks: the
endpoint refuses every unsigned request, and staff invitations still arrive —
the invited person is just created as a client and needs their role setting by
hand from `/admin/staff`.

## Registering it

1. Clerk dashboard → the **production** instance (`thrivsphere.org`) →
   **Configure → Webhooks → Add Endpoint**.
2. URL: `https://thrivsphere.org/api/webhooks/clerk`
3. Subscribe to exactly these events:
   - `session.created`
   - `session.ended`
   - `session.removed`
   - `session.revoked`
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Create it, then copy the **Signing Secret** (`whsec_…`).
5. Add it to Vercel and locally:

   ```
   vercel env add CLERK_WEBHOOK_SECRET production
   ```

   and the same value in `.env.local`.
6. Redeploy, then use Clerk's **Send test event** on `session.created`. A
   correctly configured endpoint answers `200`; a wrong or missing secret
   answers `400` and writes a `permission_denied` row to the activity log,
   which is the intended behaviour and a useful confirmation in itself.

## Rotating the secret

Clerk → Webhooks → the endpoint → **Signing Secret** → roll it. Then
`vercel env rm CLERK_WEBHOOK_SECRET production`, add the new value, update
`.env.local`, and redeploy. There is a short window during the swap where
deliveries are refused; Svix retries them, so nothing is lost.

Repeat this for the development instance if session logging is wanted there
too. Webhook endpoints belong to an instance, so the production secret is not
the development one.

## Why the secret is not optional

`src/lib/svix-signature.ts` refuses everything when `CLERK_WEBHOOK_SECRET` is
unset. Without it, anyone who found the URL could forge sign-in records — which
corrupts exactly the evidence a founder would rely on in an investigation — or
create an account carrying a role of their choosing.
