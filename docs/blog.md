# The blog

Posts are written and reviewed in the back office (**Blog**, `/admin/blog`)
and appear at `/blog`. Nothing reaches the website until a reviewer has
approved that exact version.

## Who does what

| | Write and edit | Approve | Publish or schedule an approved post | Take a post down |
|---|---|---|---|---|
| Patience (founder) | yes | any post, her own included | yes | yes |
| A named blog reviewer | yes | other people's posts, not their own or a version they made | yes | yes |
| Other practitioners, supervisors, admins | yes | no | yes | no |

Patience names reviewers on **Staff** (*Blog reviewer* column). The rules are
in `src/lib/blog-rules.ts` (`canReview`) and tested in `blog-rules.test.ts`.

## How a post moves

`draft` → *Send for review* → `in_review` → *Approve* → `approved` →
*Publish now* (`published`) or *Schedule* (`scheduled`, published by the
hourly job in `/api/cron/reminders`).

A reviewer can instead *Request changes* (`changes_requested`), with a
comment. Editing anything makes a new version and returns the post to
`draft`, clearing the approval and any schedule.

What readers see lives in append-only versions (`blog_post_versions`). A post
points at three of them: the one being worked on, the one approved, and the
one on the website. Publishing checks that the approved version's fingerprint
(`contentHash`, a SHA-256 of everything a reader sees) matches the one
recorded with the approval, so a post can't change between approval and
going live. While a published post is being edited, the website keeps showing
the approved version.

## What the reviewer sees

- The post as it will appear (*Preview*, the same component as the website).
- What changed since the version last reviewed, paragraph by paragraph.
- Automatic checks (`contentFindings`): mentions of suicide or self-harm
  (follow Samaritans' guidance: no methods, include help routes), promises of
  outcomes, diagnosis, medication, anything that sounds like a client; links
  that aren't in the sources; sources outside the usual trusted list; email
  addresses and phone numbers other than the helplines the site lists;
  figures with no sources. These point at things to look at; they never
  replace reading the post.

## On the website

Each article shows the author ("ThriveSphere team" when none), the reviewer
("Reviewed by …"), the date, the sources, the crisis notice and the booking
box. Articles have their own canonical address, Open Graph tags and
BlogPosting structured data, and are listed in the sitemap and in the feed at
`/blog/rss.xml`. Pages refresh every five minutes, and straight away on
publishing or taking down.

Text is Markdown, rendered without raw HTML. Pictures inside the text are
dropped; the only photo is the cover, which is part of the approved version.
Cover photos (JPEG, PNG or WebP, under 4 MB) are stored privately in Vercel
Blob under `blog/` and served by `/blog/images/<name>` only while they belong
to a published post. Staff see drafts' photos through
`/api/admin/blog/images/<name>`.

## Still to come

- Readers' likes and comments, with comments held for approval.
- AI help in the editor (topic ideas, rewrites, checks, titles, alt text).
- AI research and writing agents that draft a post from a brief, using
  trusted UK sources only.
