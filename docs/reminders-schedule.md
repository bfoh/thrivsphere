# Appointment reminders: schedule

`vercel.json` runs the reminder job **once a day at 08:00 UTC**.

That is not the intended schedule. `src/lib/reminders.ts` is built for an
**hourly** run (`0 * * * *`):

- `booking_confirmation` — sent on the first run after a booking is made.
- `reminder_24h` — fires within ±90 minutes of 24 hours before the appointment.
- `reminder_1h` — fires within ±30 minutes of 1 hour before.

On a daily schedule only the confirmation is reliable. The 24-hour reminder
reaches only appointments that happen to fall in the three-hour band around the
run, and the one-hour reminder effectively never fires.

## Why it is daily

The Vercel Hobby plan limits cron jobs to once per day, and an hourly
expression fails the deployment outright:

```
Hobby accounts are limited to daily cron jobs. This cron expression
(0 * * * *) would run more than once per day.
```

## To fix

Upgrade the project to the Pro plan — which ThrivSphere needs regardless, since
Hobby is for non-commercial use and the CIC takes payments — then set:

```json
{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }
```

No code changes are required; the reminder windows already assume hourly.

Reminders cannot send at all until the email provider is provisioned, so this
is not currently visible to clients.
