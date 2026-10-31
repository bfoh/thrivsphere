# Appointment emails: schedule

## When each email goes

- **Booking confirmation:** sent the moment a client books, unless they have
  turned appointment emails off. If that send fails, the hourly job retries it.
- **Moved / cancelled:** sent straight away when a client reschedules or
  cancels, or when staff cancel.
- **24-hour reminder:** sent within ±90 minutes of 24 hours before.
- **1-hour reminder:** sent within ±30 minutes of 1 hour before.

None of these emails contains the joining link or any personal detail. The
link is only shown in the client's account under **Appointments**.

## The job

`vercel.json` runs `/api/cron/reminders` **hourly** (`0 * * * *`), which needs
the Vercel Pro plan. The reminder windows in `src/lib/reminders.ts` are sized
for an hourly run, so each reminder fires exactly once.

Each run:

- looks at every upcoming `scheduled` appointment;
- works out what is due;
- sends it;
- records it in `reminders_sent`.

Because of that record, a run can never send the same email twice. Sends that
fail are not recorded, so the next run retries them.

The job is protected by `CRON_SECRET`, which Vercel Cron sends automatically.
Without the secret the route refuses every request.
