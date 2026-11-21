# Brand & Marketing hub

Where ThriveSphere's branding and marketing is planned, written, approved and
measured. Built in releases; this page grows with each one. The owner's
decisions (21 November 2026):

- **Channels:** Instagram & Facebook, LinkedIn, Google Business Profile (as
  a service-area business, since ThriveSphere visits employers; no address
  shown) and an email newsletter.
- **Posting:** by hand. The hub prepares the caption and images; staff post
  them and record the link. No platform APIs.
- **Approval:** the blog's rule. Patience approves anything, her own work
  included; a colleague she flags as a reviewer approves other people's work,
  never their own. Practitioners can draft.
- **Visuals:** templates rendered by the website, the practice's own photos,
  and an AI image generator (no people, no words in the image, labelled as AI).

## Rules every piece follows

These come from the research behind the hub and are checked automatically
where possible:

- No claims to treat, cure or improve a condition, and nothing that
  discourages someone from seeing their GP (ASA/CAP Code).
- No testimonials or reviews written or edited by AI, and no review requests
  (DMCC Act 2024 fake-review ban; client confidentiality).
- On Instagram and Facebook, copy must not assume something about the
  reader's health ("Are you anxious?" ✗, "Support with anxiety" ✓), as Meta's
  advertising standards require.
- Any mention of suicide or self-harm carries the Samaritans line (116 123);
  sensitive awareness days carry the crisis wording.
- Marketing emails only to people who opted in, with a record of that, and an
  unsubscribe link in every email (ICO/PECR). No open tracking.
- No cookies or other storage for tracking.

## Release 0: how people found us (live)

- The enquiry form, the callback form and the booking step for the Initial
  Wellbeing Consultation ask **"How did you hear about us?"** (optional;
  "Somewhere else" lets people say where).
- The same forms quietly note the **tracking tags** on the link the person
  arrived by (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`), the
  page they were on, and the site they came from. These are read from the
  form page's address, so nothing is stored on their device and no cookie
  consent is needed. Campaign links should therefore point straight at
  `/book` or `/contact`:

  `https://thrivsphere.org/book?utm_source=instagram&utm_medium=social&utm_campaign=spring-calm`

  Use lower-case words and dashes; anything else is ignored.
- Each answer is one row in `lead_attributions`, linked to the enquiry or
  the consultation order (exactly one of the two). A booking that is never
  paid keeps its row but is not counted later. Attribution never stops an
  enquiry or booking being saved.
- Staff see it on each enquiry under *How they found us*. Totals by source
  and campaign arrive with Insights (Release 4).
- The privacy policy (1.4.0) says what is kept and why.
- Rules: `src/lib/attribution.ts` (tested); saving:
  `src/lib/lead-attribution.ts`; form fields: `AttributionFields` in
  `src/components/EnquiryFields.tsx`.

## Still to come

1. Foundation: shared AI help (with a monthly spending cap), the Brand Kit,
   the photo and graphics library, branded templates, social preview images.
2. Plan, write, approve and post: content packs for each channel, checks,
   AI drafting and images, calendar with awareness days, campaigns, posting
   packs and a morning reminder.
3. Newsletter with double opt-in, sent through Brevo.
4. Insights and an AI monthly review.
