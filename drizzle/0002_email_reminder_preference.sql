-- Whether a client wants appointment reminders by email at all.
--
-- For someone whose inbox may be monitored by the person they are seeking
-- support about, an email from a wellbeing service is itself a disclosure —
-- regardless of how carefully the body is worded. `safe_to_contact_by_phone`
-- already covers voicemail; this is the equivalent for email, and the client
-- controls it from their own portal.
--
-- Defaults to true so existing clients keep receiving confirmations, and the
-- opt-out is offered prominently rather than buried.

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "email_reminders_enabled" boolean DEFAULT true NOT NULL;
