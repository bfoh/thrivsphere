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

The editor's bottom bar does each step on what is on screen, so nothing is
sent or approved that wasn't just saved (`editorAction`):

- **Save draft**: always.
- **Save and send for review**: for anyone who can't approve the post.
- **Publish…**: for whoever may approve it themselves (Patience). She ticks
  the same four review confirmations, then chooses *now* or a date; the
  editor saves, records her approval against that version's fingerprint, and
  publishes or schedules it. It is the review, in one step, not a way round it.

A reviewer approving someone else's post can choose *Approve and publish now*.
What still stands between a draft and review (a title, 150 words) is shown
under the buttons as it is typed, and only real limits stop a save; each says
how far over it is. A line break counts as one character, as in the box.

The summary is optional: left empty, it is the post's first paragraph, cut
near 220 characters. Sources are one per line, written however references are
usually written; a web address in a line becomes its link, and a reference
with none (a book, a journal) is listed as plain text. Text pasted from Word
or Google Docs is spaced into paragraphs, with its bullet points kept.

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

## Readers' likes and comments

- **Likes:** one per browser per post. The browser gets a random id in the
  `ts_reader` cookie only when the reader presses Like; the database keeps a
  hash of it (`blog_likes`), nothing else. The count is read by the browser
  from `/api/blog/<slug>/like`, so the article page stays cached.
- **Comments:** anyone can comment with a first name or nickname and an email
  address. The email is encrypted (`APP_ENCRYPTION_KEY`) and never shown.
  Every comment waits in **Blog → Readers' comments** (`/admin/blog/comments`)
  until a member of staff who writes posts approves it (owner's decision,
  21 November 2026). Comments are shown as plain text; links in them aren't
  clickable.
- **Comments that suggest risk** (suicide, self-harm, not being safe from
  someone) are put first, marked *Possible risk*, and ThriveSphere's inbox is
  emailed straight away with a link only. The writer is shown Samaritans and
  999 after sending. The moderator sees their email address to follow up
  under the safeguarding procedure. The checks are in
  `src/lib/blog-comment-rules.ts`; they never refuse a comment.
- Moderators can approve, hide (not published, or taken off the post) or
  delete a comment with its email, e.g. when someone asks for theirs to be
  removed. Hidden comments are deleted after 90 days by the hourly job.
- Spam: a hidden honeypot field, and at most five comments per connection in
  ten minutes (per server instance, like the enquiry form).
- The privacy and cookie policies say what's kept (version 1.3.0).

## Still to come

- AI help in the editor (topic ideas, rewrites, checks, titles, alt text).
- AI research and writing agents that draft a post from a brief, using
  trusted UK sources only.
