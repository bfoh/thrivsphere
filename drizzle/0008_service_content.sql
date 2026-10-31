ALTER TABLE "services" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "points" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "note" text;
--> statement-breakpoint
-- The five services in the pre-launch checklist (§4), worded as on the site.
-- Written over any existing row with the same slug: nothing edits services
-- before this release, so there is no owner wording to preserve.
INSERT INTO "services" ("slug", "name", "summary", "description", "points", "note", "kind", "duration_minutes", "active", "sort_order") VALUES
  ('wellbeing-needs-review', 'Wellbeing Needs Review', 'A structured, non-clinical conversation exploring your wellbeing concerns, strengths, coping strategies and personal goals.', 'A structured, non-clinical conversation exploring the client''s current wellbeing concerns, everyday challenges, strengths, existing coping strategies, support needs and personal goals. The review helps us identify appropriate wellbeing education, practical support and next steps.', '[]'::jsonb, NULL, 'one_to_one', 50, true, 0),
  ('emotional-wellbeing-support', 'Emotional Wellbeing Support', 'Personalised support for individuals navigating emotional challenges.', 'Personalised support for individuals navigating emotional challenges such as:', '["Everyday stress and worry","Low mood and emotional difficulties","Relationship and family pressures","Difficult life experiences and transitions","Low confidence and self-esteem","Emotional overwhelm","Challenges with personal boundaries"]'::jsonb, NULL, 'one_to_one', 50, true, 1),
  ('psychoeducation-and-coping-skills', 'Psychoeducation and Coping Skills', 'Practical education to help individuals better understand their emotional wellbeing and develop skills for everyday challenges.', 'Practical education to help individuals better understand their emotional wellbeing and develop skills for everyday challenges. This may include:', '["Understanding thoughts, feelings and behaviours","Stress awareness and management","Emotional awareness and regulation","Grounding and relaxation techniques","Mindfulness and present-moment awareness","Self-compassion and confidence-building","Problem-solving and decision-making","Assertiveness and communication","Healthy boundaries","Sleep and self-care education","Managing everyday worry and difficult emotions"]'::jsonb, 'We may draw on evidence-informed educational principles from CBT, DBT, ACT, solution-focused approaches and other relevant wellbeing strategies. These approaches are used to support learning and coping skills development, not as formal psychotherapy.', 'one_to_one', 50, true, 2),
  ('resilience-and-personal-development', 'Resilience and Personal Development', 'Emotional resilience, confidence, healthy coping habits and practical strategies for navigating change.', 'Support to build:', '["Emotional resilience","Greater self-awareness","Confidence and self-esteem","Healthy coping habits","Personal wellbeing goals","Positive routines","Stronger interpersonal boundaries","Practical strategies for navigating change"]'::jsonb, NULL, 'one_to_one', 50, true, 3),
  ('workplace-wellbeing', 'Workplace Wellbeing', 'Workplace stress, work-life balance, professional pressures, and resilience and burnout prevention.', 'Support with:', '["Workplace stress","Emotional wellbeing at work","Work-life balance","Workplace relationships and communication","Managing professional pressures","Resilience and burnout prevention","Understanding general workplace wellbeing and occupational health processes"]'::jsonb, 'The service does not include formal occupational health medical assessments or fitness-for-work reports.', 'one_to_one', 50, true, 4)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "summary" = EXCLUDED."summary",
  "description" = EXCLUDED."description",
  "points" = EXCLUDED."points",
  "note" = EXCLUDED."note",
  "active" = true,
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();--> statement-breakpoint
-- Services from before the checklist are hidden, not deleted, so anything
-- that refers to them keeps working.
UPDATE "services" SET "active" = false, "updated_at" = now()
WHERE "slug" NOT IN ('wellbeing-needs-review', 'emotional-wellbeing-support', 'psychoeducation-and-coping-skills', 'resilience-and-personal-development', 'workplace-wellbeing');
