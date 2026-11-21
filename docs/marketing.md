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

## Release 1: brand, library and graphics (live)

Open **Marketing** in the back office (anyone who writes for the blog).

- **Brand kit** (`/admin/marketing/brand`): identity, voice, words to use
  and avoid, standard wording (including the crisis line), audiences,
  content pillars with target shares, hashtags, calls to action, the logo's
  colours, the AI image style, photo rules and saved replies for comments
  and messages. Admins edit it; every save is a new version; **only the
  founder approves**, and only the exact version she read (its fingerprint
  is stored with the approval). Until the first approval, the website's own
  wording stands in. Start it with *Start from the website's wording*.
- **Photos & graphics** (`/admin/marketing/library`): photos staff add, with
  whose they are (ours, a staff photo with written agreement, licensed) and
  who is in them. There is no way to record a client. Each image has alt
  text. Files are private; staff open and download them here. Archive hides
  an image without deleting it.
- **Make a graphic** (`/admin/marketing/graphics`): seven templates (tip
  card, carousel slide, awareness day, service spotlight, talk or workshop,
  photo with caption, blog post) in six sizes (Instagram square, portrait and
  story; LinkedIn; Facebook; Google Business Profile) and four colour themes.
  Only colour pairs that pass WCAG contrast for body text are used. Awareness
  days always carry the crisis line. Stories keep text clear of Instagram's
  own controls. Preview, then save to the library with alt text written from
  the graphic's words. Only what was previewed can be saved.
- **Link previews**: the website and each blog post now have a branded
  picture when shared (`src/app/opengraph-image.tsx`,
  `src/app/blog/[slug]/opengraph-image.tsx`), the post's cover included.
- **AI usage** (founder only): spending this month against the limit
  (`AI_MONTHLY_BUDGET_USD`, default $50), by feature and request. Empty until
  AI help is switched on.
- Code: `src/lib/brand-kit.ts` (rules, seed), `src/lib/brand-tokens.ts`
  (colours, contrast; tested against `globals.css`), `src/lib/graphics/`
  (spec, renderer, lookups), `src/lib/asset-rules.ts`,
  `src/lib/image-upload.ts`. Fonts: Montserrat TTFs in `src/assets/fonts`
  (SIL Open Font Licence, `OFL.txt`), deployed with the image routes by
  `outputFileTracingIncludes` in `next.config.ts`.
- Platform sizes were checked on 21 November 2026 (`SIZES` in
  `src/lib/graphics/spec.ts`). Check them each quarter.

## AI help

Shown once `ANTHROPIC_API_KEY` is set. Model: Claude Opus 5.5
(`claude-opus-5-5`, $4 in / $20 out per million tokens, checked 21 November
2026).

- **Blog editor:** suggest titles, write the summary and search description,
  check a draft against our rules, and rewrite selected text (warmer, plainer,
  shorter, or for employers). Suggestions appear under the buttons; nothing
  changes until someone presses *Use this*. A saved version that used a
  suggestion is marked "Edited with AI help", and the reviewer is told to
  check facts and tone. Approval is unchanged.
- **Photo library:** *Suggest a description (AI)* writes alt text from the
  image, and warns if the image may show people. Photos over 3.75 MB are not
  sent.
- **Every request**, in order: is this month's limit reached
  (`AI_MONTHLY_BUDGET_USD`); does the text contain an email address, a mobile
  number, an NHS-style number or something about a client (if so, nothing is
  sent and staff are told why); then the request. Each one is recorded in
  `ai_usage` (task, tokens, cost, outcome; never the text) and shows on
  *AI usage*. 30 requests per person per 10 minutes.
- **Instructions:** built from the approved Brand Kit and the scope of practice
  (`src/lib/ai/brand-prompt.ts`): no treatment claims or promised outcomes, no
  testimonials, no personal details, Samaritans' guidance and the crisis line,
  no statements about the reader's health in social posts, facts only from the
  sources given. The instructions are cached for 5 minutes per button, so
  using the same button again soon after costs less.
- **Cost (first real run, 21 November 2026):** titles $0.03, summary $0.02,
  rules check $0.05, rewrite $0.02; 4 to 15 seconds each.
- Code: `src/lib/ai/` (`tasks.ts` for what each button does, `run.ts` for the
  checks and the request, `cost.ts`, `personal-data.ts`), the route
  `src/app/api/admin/ai/[task]/route.ts`, and `src/components/admin/ai/`.

## Still to come

1. Plan, write, approve and post: content packs for each channel, checks,
   AI drafting and images, calendar with awareness days, campaigns, posting
   packs and a morning reminder.
2. Newsletter with double opt-in, sent through Brevo.
3. Insights and an AI monthly review.
