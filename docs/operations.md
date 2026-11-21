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
| Stripe | Card payments (webhook: `docs/stripe-webhook.md`) |
| Brevo | The website's emails (confirmations, reminders, receipts) |
| GitHub (`bfoh/thrivsphere`) | The code — currently the developer's account |
| Business email provider | See `docs/business-email.md` |

## Inside the website

| Who | Can |
|---|---|
| **Founder** | Everything, including staff, roles, HR, revenue and accounting |
| **Admin** | Day-to-day running: services and prices, every practitioner's calendar, activity log, and removing practitioners and supervisors who have left |
| **Practitioner** | Their clients, appointments and their own availability |

- **Add a practitioner:** invite them at **Staff**. They sign in and do two
  things:
  - add their name under *Manage account → Profile*;
  - set their hours and default meeting room at **Availability**.

  From then on clients are offered their times automatically (§7, §16).
- **Remove a colleague who has left:** **Staff → Remove**. Their sign-in is
  deleted for good; their name stays on past sessions, notes and the activity
  log. Reassign any upcoming sessions first — the website refuses until there
  are none. Admins can remove practitioners and supervisors; only a founder
  can remove an admin or founder. *Cancel invitation* does the same for
  someone invited who has not joined yet.
- **Password rules** (such as the minimum length) are set in Clerk:
  Dashboard → the production instance → User & authentication → Password.
- **More days and times:** **Availability**. Use the weekly pattern for
  regular hours, *Extra hours* for one-off dates and *Blocked time* for leave.
  The founder and admins can manage anyone's calendar there.
- **Allocate appointments:** **Appointments** shows who each session is with.
  *Reassign* moves it to another practitioner, and the system refuses if they
  are already booked at that time.
- **Don't count a late cancellation or missed session:** under
  **Appointments → Past & closed**, *Don't count it* returns the session to
  the client's account. Use it for illness, an emergency, or when it wasn't
  safe for the client to attend. The record says only "client circumstances".
- **Refunds and disputes:** made and answered in the Stripe Dashboard. The
  website adjusts the client's sessions itself and emails you
  (`docs/stripe-webhook.md`).
- **Session materials:** **Library** (`/admin/library`) has every practitioner
  guide, teaching presentation, client learning guide and activity worksheet,
  searchable, with print-ready PDFs. To add or change a material, see
  `docs/library.md`.
- **Enquiries and callbacks:** **Enquiries** (`/admin/enquiries`, every
  member of staff, practitioners included). Every message from the contact form and every callback request
  from the Book page is saved there with a reference such as `TS-7K2QXM`.
  The enquirer gets an acknowledgement quoting it; the email to
  `ENQUIRY_TO_EMAIL` carries only the reference and a link, never the
  message. On each one you can set the status (New, In progress, Awaiting
  client, Responded, Closed), assign it, add internal notes, log a call and
  its outcome, and *Send booking link*: an email inviting them to book and pay
  for their Initial Wellbeing Consultation, with a practitioner preselected if
  you choose one. When the person registers with the same email address the
  enquiry joins their client record.
- **Booking the first appointment:** clients choose a practitioner (or *First
  available*) and a time, accept the booking terms and the 72-hour notice, and
  pay at Stripe while the time is held (`docs/stripe-webhook.md`). The
  consultation is no longer sold on its own under *Buy sessions*. Later
  sessions are bought there and booked from credit as before.
- **After the Initial Wellbeing Consultation:** on the client's record,
  under **Consultation outcome**, the practitioner records *Suitable*,
  *Clarification or further support needed* or *Not suitable — signpost*,
  with the reason (IT handover §13.1). Only *Suitable* lets the client book
  and buy ongoing sessions, and they are emailed that they can. *Not
  suitable* adds the signposting under Referrals, marks the client declined
  and reminds the owner to consider refunding the £30 in Stripe; the client
  is not emailed, so the practitioner explains it. Clients waiting for an
  outcome are listed on the **Dashboard**. A decision can be changed by
  recording a new one; earlier ones stay on the record.
- **Discounts** (founder and admins only; practitioners never see prices):
  - *A concession for one client*, e.g. 50% off: on the client's record,
    under **Discounts & free sessions**, *Give a concession*. Choose % or £
    off, what it covers, an optional end date or number of purchases, and a
    reason. The client then sees and pays the lower price on *Book* and *Buy
    sessions*, at Stripe and on the receipt. A client has one concession at a
    time; *End concession* stops it at once. 100% makes things free: the
    client books or adds sessions without going to Stripe.
  - *A discount code*, e.g. `WELCOME10`: **Discounts** (`/admin/discounts`),
    *New code*. Codes are once per client unless set otherwise, can have
    start and end dates and a total limit, and can be turned off at any time.
    A code can never make anything free, so a leaked code gives nothing away.
  - *Free sessions*: on the client's record, *Add free sessions* gives the
    Initial Wellbeing Consultation or 1–12 support sessions. They last as
    long as bought ones, and the client is emailed (no amounts, no reason).
  - Discounts never stack: the client pays the lower price. A price is free
    or at least £1, because Stripe can't take less; the forms refuse anything
    in between. Revenue shows *Discounts given* and *Complimentary sessions*;
    income is always what was actually paid. Every change is in **Activity**.
    Never record health details in a discount's note.
- **Safeguarding:** when the Safeguarding & Safety Escalation Procedure has
  been activated, complete a *Safeguarding Incident / Concern Record* from the
  client's record (**Clients** → the client → *Safeguarding concerns*). It
  follows ThriveSphere's form section by section. There is no risk score.
  - Required: when it happened and the practitioner; how it arose and the type
    of concern; what happened; the immediate-safety answer and the information
    behind it; whether a trusted person, an external service, or the
    Safeguarding Lead/Deputy were involved (with who, when and what was shared
    where they were); at least one next step; initials.
  - A record whose immediate-safety answer is *Yes* or *Unclear*, or whose next
    step is *Review with Safeguarding Lead/Deputy before next session*, puts a
    **safeguarding flag** at the top of the client's record and in the client
    list. Only Patience (founder) or the Deputy Safeguarding Lead can stand it
    down. Patience names the deputy on **Staff** (*Deputy Safeguarding Lead*).
  - **Safeguarding** (`/admin/safeguarding`) lists every record not yet
    closed. Close one with its outcome from the client's record. Records are
    never edited after saving; complete a new one if something new happens.
- **Blog** (`/admin/blog`; the founder and practitioners write, see
  `docs/blog.md`):
  - *New post* starts a draft. Write in the editor (with a preview), list the
    sources, and add a cover photo if wanted. Every save is kept as a version.
  - *Send for review* emails the reviewers a link. Patience approves any
    post, her own included; a colleague she names as a *Blog reviewer* on
    **Staff** approves other people's posts, never their own. Approving needs
    four ticks: read in full, facts match the sources, safe for someone who
    may be struggling, nothing identifies a client.
  - Only the exact approved version can be published or scheduled. Any edit
    afterwards needs approving again; a live post stays as approved until the
    new version is published. Scheduled posts go live within the hour.
  - The founder or a reviewer can take a post off the website at any time.
  - Readers can like posts and leave comments. Comments wait in **Blog →
    Readers' comments** until any member of staff who writes posts approves
    them. Ones marked *Possible risk* come first and ThriveSphere's inbox is
    emailed: read them soon and follow the safeguarding procedure (the
    reader's email is shown there). Never publish a comment that identifies
    someone or gives personal or health details.
- **How people found us:** the enquiry, callback and booking forms ask
  "How did you hear about us?" (optional). Links shared in posts, emails or
  leaflets can carry tracking tags, e.g.
  `https://thrivsphere.org/book?utm_source=instagram&utm_medium=social&utm_campaign=spring-calm`;
  point them straight at `/book` or `/contact`, because the tags are read
  from the form page's address (no cookies). The answer shows on each
  enquiry under *How they found us*. See `docs/marketing.md`.
- **Brand and marketing:** **Marketing** (`/admin/marketing`). The Brand
  Kit is edited by admins and approved by Patience; every graphic and, later,
  every post follows the approved version. Photos added to the library must
  be ours, licensed, or of staff who agreed in writing; never a client.
  See `docs/marketing.md`.
- **Prices and service descriptions:** **Services & prices**
  (`/admin/catalogue`). A price change reaches the pricing page, the client's
  *Buy sessions* page and card checkout together. Service wording shows on the
  homepage and *Our Services*. Every change is recorded in **Activity**.
  The *Book Initial Wellbeing Consultation – £30* buttons are written in
  `src/data/site.ts` (`bookCta`); change them there if that price changes.

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
| `ENQUIRY_TO_EMAIL` | Where website enquiries are delivered. Optional: without it they go to the contact address, `patbarning@yahoo.co.uk` |
| `APP_ENCRYPTION_KEY` | Encrypts meeting links and other secrets. **Never change or lose it:** links saved under the old key can no longer be read |
| `CRON_SECRET` | Lets only Vercel run the reminder job |
| `BLOB_READ_WRITE_TOKEN` | Client documents and receipts storage |
| `NEXT_PUBLIC_SITE_URL` | The public address used in emails and links |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | The WhatsApp Business number, in any UK format. The WhatsApp button appears once this is set |
| `ANTHROPIC_API_KEY` | AI help in the blog and marketing hub (see `docs/marketing.md`). Use a key from an Anthropic account owned by the business, with a spending limit set there too |
| `RECRAFT_API_KEY` | AI images in the marketing hub (not set yet) |
| `AI_MONTHLY_BUDGET_USD` | The monthly limit on AI spending, in US dollars. Optional; $50 if not set. AI help pauses when it is reached |
| `BOOKING_REQUIRES_PAYMENT` | `true` means clients must buy a session before choosing a time. Anything else (the default) lets them book and pay afterwards. The first appointment is the Initial Wellbeing Needs Review: Review credit pays only for it, and the Review can be bought once |

## Backups and recovery

- **Database:** Neon keeps a restore window. Any moment inside it can be
  restored to a new branch and checked before switching over. Confirm how long
  the window is under Neon → Project → Settings, and take a manual export
  (`pg_dump`) before any large change.
- **Client documents:** these are stored in Vercel Blob, which has no automatic
  backup. Export them periodically if they are not kept elsewhere.
- **Resource library:** built from the owner's files and stored in the same
  Blob store under `library/assets/`. Keep the owner's original files: the
  library can be rebuilt and uploaded from them at any time
  (`docs/library.md`).
- **Code:** GitHub. Every deployment can be rolled back from Vercel →
  Deployments → *Promote*.

## Releasing a change

1. Run `npm test`, `npx tsc --noEmit`, `npm run lint` and `npx next build`.
2. If the change adds a migration in `drizzle/`, apply it **first** with
   `npm run db:migrate`, using production credentials from
   `vercel env pull .env.local`. Migrations here almost always only add, so
   the live site keeps working against the new database. A migration that
   removes columns says so at the top; expect the pages that read them to
   error until the new code is live.
3. Push to `main`, which makes Vercel deploy to production.
4. Check the live site: the pages you changed, a booking, and the reminder job
   under Vercel → Cron Jobs.

## One-off steps after the pre-launch release

- [ ] Apply migrations `0007_practitioner_settings` and `0008_service_content`
      (`npm run db:migrate`).
- [ ] Set `EMAIL_FROM_NAME` to `ThriveSphere Wellbeing`.
- [ ] Rename the application in Clerk (Dashboard → Settings) and re-run
      `npx dotenv -e .env.local -- npx tsx scripts/brand-clerk-emails.ts`.
      The script needs a paid Clerk plan; on the current plan Clerk refuses
      it (see `docs/email-provider.md`).
- [ ] Patience adds her name under *Manage account → Profile* and her default
      meeting room under **Availability**.
- [ ] Invite Lucy at **Staff**. She then completes the same two steps.
- [ ] Add the five new events to the Stripe webhook endpoint, in the sandbox
      and in live mode (`docs/stripe-webhook.md`).
- [ ] Confirm Stripe is in live mode, then make one real £30 purchase and
      refund it. The owner should get a "payment was refunded" email, and the
      session should leave the account.
- [ ] Once the number exists, set `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- [x] The owner decides on `BOOKING_REQUIRES_PAYMENT`: settled by the IT
      handover §19. The consultation is always paid as it is booked; the
      setting now applies only to later sessions.
- [x] Apply migration `0010_dual_booking` (payment holds, the enquiry queue,
      one client record per sign-in). Applied 21 November 2026.
- [x] Apply migration `0012_discounts` (concessions, codes, free sessions).
      Applied 21 November 2026.
- [x] Apply migration `0013_blog` and move the four existing articles into
      the blog (`scripts/import-blog-posts.ts`). Applied 21 November 2026; the
      articles stay live, marked not yet reviewed, for Patience to review.
- [ ] Patience reviews the four imported articles in **Blog**, and names any
      colleague who should approve posts on **Staff** (*Blog reviewer*).
- [x] Apply migration `0015_lead_attribution` ("How did you hear about us?"
      and campaign tags on enquiries, callbacks and paid consultations).
      Applied 21 November 2026.
- [x] Apply migration `0016_marketing_foundation` (Brand Kit, marketing
      library, AI usage record). Applied 21 November 2026.
- [ ] Patience reads and approves Brand Kit version 1 (**Marketing → Brand
      kit**), including the logo colours.
- [ ] Apply migration `0017_safeguarding_record` (the Safeguarding Incident /
      Concern Record; removes risk levels). Unlike the others it removes
      columns, so it refuses to run if any concern or flag exists, and the
      back office's client, safeguarding and staff pages error for the minutes
      between applying it and the new code going live.
- [ ] Once Lucy has an account, Patience makes her *Deputy Safeguarding Lead*
      on **Staff**.
