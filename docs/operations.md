# Running the website (checklist §13)

## Accounts the business should own

§13 asks that the business holds administrator access to the website, the
booking system and the related accounts. Each of these should be owned by the
owner, using a business email address and MFA. A developer should be added as
a member who can be removed.

| Service | What it runs |
|---|---|
| Domain registrar | `thrivsphere.org` and its DNS |
| Vercel (Pro) | Hosting, deployments, environment variables, the hourly reminder job |
| Neon | The database: clients, appointments, payments, records |
| Clerk | Sign-in for clients and staff |
| Stripe | Card payments |
| Brevo | The website's emails (confirmations, reminders, receipts) |
| GitHub (`bfoh/thrivsphere`) | The code — currently the developer's account |
| Business email provider | See `docs/business-email.md` |

## Inside the website

| Who | Can |
|---|---|
| **Founder** | Everything, including staff, roles, HR, revenue and accounting |
| **Admin** | Day-to-day running: prices, every practitioner's calendar, activity log |
| **Practitioner** | Their clients, appointments and their own availability |

- **Add a practitioner:** invite them at **Staff**. They sign in and do two
  things:
  - add their name under *Manage account → Profile*;
  - set their hours and default meeting room at **Availability**.

  From then on clients are offered their times automatically (§7, §16).
- **More days and times:** **Availability**. Use the weekly pattern for
  regular hours, *Extra hours* for one-off dates and *Blocked time* for leave.
  The founder and admins can manage anyone's calendar there.
- **Allocate appointments:** **Appointments** shows who each session is with.
  *Reassign* moves it to another practitioner, and the system refuses if they
  are already booked at that time.
- **Prices:** **Prices** (`/admin/catalogue`). Changes reach the pricing page,
  the client's *Buy sessions* page and card checkout together, and are
  recorded in **Activity**.
- **Service descriptions:** these live in `src/data/site.ts` and are changed by
  a developer.

## Environment variables

They are set in Vercel → Project → Settings → Environment Variables. A change
takes effect on the next deployment. `NEXT_PUBLIC_` variables are built into
the pages, so they always need a redeploy.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection (set by the Neon integration) |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET` | Sign-in, and keeping staff and client accounts in step |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments; **live** keys in production |
| `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `EMAIL_FROM_NAME_DISCREET` | Sending email (`docs/email-provider.md`) |
| `ENQUIRY_TO_EMAIL` | Where website enquiries are delivered |
| `APP_ENCRYPTION_KEY` | Encrypts meeting links and other secrets. **Never change or lose it:** links saved under the old key can no longer be read |
| `CRON_SECRET` | Lets only Vercel run the reminder job |
| `BLOB_READ_WRITE_TOKEN` | Client documents and receipts storage |
| `NEXT_PUBLIC_SITE_URL` | The public address used in emails and links |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | The WhatsApp Business number, in any UK format. The WhatsApp button appears once this is set |
| `BOOKING_REQUIRES_PAYMENT` | `true` means clients must buy a session before choosing a time. Anything else (the default) lets them book and pay afterwards |

## Backups and recovery

- **Database:** Neon keeps a restore window. Any moment inside it can be
  restored to a new branch and checked before switching over. Confirm how long
  the window is under Neon → Project → Settings, and take a manual export
  (`pg_dump`) before any large change.
- **Client documents:** these are stored in Vercel Blob, which has no automatic
  backup. Export them periodically if they are not kept elsewhere.
- **Code:** GitHub. Every deployment can be rolled back from Vercel →
  Deployments → *Promote*.

## Releasing a change

1. Run `npm test`, `npx tsc --noEmit`, `npm run lint` and `npx next build`.
2. If the change adds a migration in `drizzle/`, apply it **first** with
   `npm run db:migrate`, using production credentials from
   `vercel env pull .env.local`. Migrations here only ever add, so the live
   site keeps working against the new database.
3. Push to `main`, which makes Vercel deploy to production.
4. Check the live site: the pages you changed, a booking, and the reminder job
   under Vercel → Cron Jobs.

## One-off steps after the pre-launch release

- [ ] Apply migration `0007_practitioner_settings` (`npm run db:migrate`).
- [ ] Set `EMAIL_FROM_NAME` to `ThriveSphere Wellbeing`.
- [ ] Rename the application in Clerk (Dashboard → Settings) and re-run
      `npx dotenv -e .env.local -- npx tsx scripts/brand-clerk-emails.ts`.
- [ ] Patience adds her name under *Manage account → Profile* and her default
      meeting room under **Availability**.
- [ ] Invite Lucy at **Staff**. She then completes the same two steps.
- [ ] Confirm Stripe is in live mode, then make one real £30 purchase and
      refund it.
- [ ] Once the number exists, set `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- [ ] The owner decides on `BOOKING_REQUIRES_PAYMENT`.
