-- Launch prices from the owner's pre-launch checklist (§6).
--
--   Initial Wellbeing Needs Review         50 minutes               £30
--   Individual Wellbeing Support Session   50 minutes               £40
--   Four-session package                   Four 50-minute sessions  £150
--   Six-session package                    Six 50-minute sessions   £225
--
-- Rows are matched by slug, which never changes because orders refer to the
-- plan. Packages are optional, so none is singled out as featured.
--
-- Fails rather than silently updating nothing if a plan is missing.

DO $$
BEGIN
  IF (SELECT count(*) FROM price_plans
      WHERE slug IN ('initial-consultation', 'individual-session', 'package-4', 'package-6')) <> 4 THEN
    RAISE EXCEPTION 'launch prices: expected the four seeded price plans';
  END IF;
END $$;
--> statement-breakpoint
UPDATE price_plans SET
  name = 'Initial Wellbeing Needs Review',
  blurb = 'A structured, non-clinical conversation exploring your wellbeing concerns, strengths, coping strategies and personal goals.',
  amount_pence = 3000, sessions = 1, featured = false, sort_order = 0, updated_at = now()
WHERE slug = 'initial-consultation';
--> statement-breakpoint
UPDATE price_plans SET
  name = 'Individual Wellbeing Support Session',
  blurb = 'Personalised one-to-one wellbeing support, tailored to your goals.',
  amount_pence = 4000, sessions = 1, featured = false, sort_order = 1, updated_at = now()
WHERE slug = 'individual-session';
--> statement-breakpoint
UPDATE price_plans SET
  name = 'Four-session package',
  blurb = 'Four 50-minute sessions, paid together.',
  amount_pence = 15000, sessions = 4, featured = false, sort_order = 2, updated_at = now()
WHERE slug = 'package-4';
--> statement-breakpoint
UPDATE price_plans SET
  name = 'Six-session package',
  blurb = 'Six 50-minute sessions, paid together.',
  amount_pence = 22500, sessions = 6, featured = false, sort_order = 3, updated_at = now()
WHERE slug = 'package-6';
