# Resource library

The resource library holds the owner's session materials, for staff to use
while they work. Every practitioner, supervisor, admin and founder can open
it from **Library** in the admin menu (`/admin/library`), or from the card at
the top of **Resources**. Clients cannot see it.

## What is in it

The files in `resources/` are grouped into 17 resources across four series:

| Series | Resources |
|---|---|
| Getting started | The Initial Wellbeing Needs Review: practitioner guide and the review & agreed support form |
| Emotional wellbeing worksheets | Worksheets 1 to 12 |
| ACT-informed resources | ACT resources 1 to 3 |
| Relationship difficulties | Relationship resource 1 |

Each worksheet, ACT and relationship resource has its materials in the order
a session uses them:

1. **Prepare:** the practitioner guide.
2. **Teach:** the teaching presentation. Worksheet 12 has two.
3. **Explain:** the client learning guide.
4. **Practise:** the client activity worksheet.

The grouping is set in `src/lib/library/catalogue.ts`. That file names each
file in `resources/` and says which resource and step it belongs to.

## Using it

- **Search** (press `/` anywhere on the library page). It searches the full
  text of every guide and worksheet, every slide and its speaker notes. It
  matches the start of words, so "breath" finds "breathing", and it reads
  numbers by resource, so "ws5", "worksheet 5" and "act 2" all work. You can
  filter by series or by kind of material. A result opens the guide at the
  right section with the words highlighted, or the deck at the right slide.
- **Guides and worksheets** show as pages in the browser, with a contents
  list. *Find in this document* (or Cmd/Ctrl+F) highlights every match.
- **Presentations** show slide by slide: use the arrow keys or the thumbnail
  strip. *Present full screen* fills the screen for a session; click the
  right of the slide (or press →) to go forward and the left to go back.
  Speaker notes show under the slide where the deck has them.
- **Download PDF** gives a print-ready copy of any material. *Word original*
  or *PowerPoint original* downloads the owner's file unchanged.
- Worksheet 5 can also be set for a client to complete online; its page in
  the library links to that.

Opening the library and each resource is recorded in **Activity**.

## How the files are kept private

This code repository is public, so none of the owner's content is in it. The
build turns the files into pages, pictures and PDFs, and the upload script
stores them in the business's **private** Vercel Blob store, under
`library/assets/`. Every file is served only through
`/api/admin/library/assets/…`, which checks the person is signed in as staff
first. That route only accepts library file names, so it cannot reach
client documents in the same store. The one thing committed is
`src/lib/library/version.ts`, which names the current build.

## Updating the library (developer)

On a Mac with Google Chrome installed:

1. Put the new or changed files in `resources/`. If a file is new, or its
   name changed, add it to `src/lib/library/catalogue.ts` and run `npm test`.
   The tests check that every slug is unique and every file is used once.
2. `npm run library:build` (8 to 10 minutes). It writes everything to
   `library-build/`, which git ignores. Read `library-build/report.md`, which
   lists what was built and anything that needs attention.
3. `npm run library:upload`. This uses `BLOB_READ_WRITE_TOKEN` from
   `.env.local`, so pull production's variables first
   (`vercel env pull .env.local`). Uploading only adds files. Nothing is
   overwritten or deleted, and it is safe to run again. At the end it updates
   `src/lib/library/version.ts`.
4. Commit `version.ts` (and any catalogue change) and push to `main`. The new
   library goes live with that deploy. To go back to the previous build,
   revert that commit.

The build uses macOS Quick Look to draw slides exactly as PowerPoint does.
For a deck Quick Look cannot open, it falls back to its own renderer and
says so in the report. That copy can differ from PowerPoint in small ways, so
check it on the site.

### Known issues in the current files (for the owner)

- **Relationship resource 1, teaching presentation:** Quick Look cannot open
  this deck, so it is drawn by the fallback renderer. Three things in the
  file itself need fixing in PowerPoint:
  - on slides 10 and 13, the text is longer than its box;
  - the text in the bottom bar has no colour of its own, so it shows white
    on the mint bar;
  - slide 3's heading has no font size, so it shows at 18pt, smaller than
    the text under it.

  Re-saving the deck from PowerPoint may also let Quick Look open it.
