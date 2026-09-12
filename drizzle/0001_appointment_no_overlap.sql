-- Prevent two scheduled appointments for the same practitioner from overlapping.
--
-- An application-level "is this slot free?" check cannot do this safely: two
-- requests can both read "free" before either writes. This is enforced by the
-- database instead, so a race ends in a constraint violation rather than a
-- client quietly double-booked into someone else's session.
--
-- Only `scheduled` rows participate, so cancelled and completed appointments
-- do not block the time from being reused.

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "practitioner_id" WITH =,
    tstzrange("starts_at", "ends_at") WITH &&
  ) WHERE ("status" = 'scheduled');
