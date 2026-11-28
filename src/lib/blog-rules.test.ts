import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS,
  afterEdit,
  autoExcerpt,
  approvalStands,
  awaitingDecision,
  canArchive,
  canPublish,
  canReview,
  canSubmit,
  canUnpublish,
  changedFields,
  checklistComplete,
  contentFindings,
  diffParagraphs,
  formatSources,
  isTrustedHost,
  isValidSlug,
  parseBrief,
  parseContent,
  parseSources,
  readingTime,
  reviewProblems,
  scheduleProblem,
  slugify,
  tidyPastedText,
  uniqueSlug,
  wordCount,
  type BlogContent,
  type PostState,
  type ReviewerActor,
} from "./blog-rules";
import { contentHash } from "./blog-hash";

const patience: ReviewerActor = { userId: "patience", role: "founder", status: "active" };
const lucy: ReviewerActor = { userId: "lucy", role: "practitioner", status: "active" };
const sam: ReviewerActor = { userId: "sam", role: "practitioner", status: "active" };

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

const content = (over: Partial<BlogContent> = {}): BlogContent => ({
  title: "Three minutes of calm",
  category: "Mindfulness",
  excerpt: "A short practice for busy days.",
  metaDescription: null,
  body: words(300),
  sources: [],
  coverImage: null,
  coverAlt: null,
  ...over,
});

const post = (over: Partial<PostState> = {}): PostState => ({
  status: "draft",
  currentVersionId: "v2",
  approvedVersionId: null,
  publishedVersionId: null,
  ...over,
});

describe("canReview", () => {
  it("lets the founder approve her own post", () => {
    assert.deepEqual(canReview({ actor: patience, isReviewer: false, authorId: "patience", versionCreatedBy: "patience" }), { allowed: true });
  });

  it("lets a named reviewer approve someone else's post", () => {
    assert.deepEqual(canReview({ actor: lucy, isReviewer: true, authorId: "patience", versionCreatedBy: "patience" }), { allowed: true });
  });

  it("refuses a named reviewer on her own post", () => {
    const d = canReview({ actor: lucy, isReviewer: true, authorId: "lucy", versionCreatedBy: "patience" });
    assert.equal(d.allowed, false);
  });

  it("refuses a named reviewer on a version she made", () => {
    const d = canReview({ actor: lucy, isReviewer: true, authorId: "patience", versionCreatedBy: "lucy" });
    assert.equal(d.allowed, false);
  });

  it("refuses a practitioner who hasn't been named a reviewer", () => {
    const d = canReview({ actor: sam, isReviewer: false, authorId: "patience", versionCreatedBy: "patience" });
    assert.equal(d.allowed, false);
  });

  it("refuses an admin who hasn't been named a reviewer", () => {
    const d = canReview({ actor: { userId: "a", role: "admin", status: "active" }, isReviewer: false, authorId: "x", versionCreatedBy: "x" });
    assert.equal(d.allowed, false);
  });

  it("refuses a blocked founder and a client, whatever the flag says", () => {
    assert.equal(canReview({ actor: { ...patience, status: "suspended" }, isReviewer: true, authorId: "x", versionCreatedBy: "x" }).allowed, false);
    assert.equal(canReview({ actor: { userId: "c", role: "client", status: "active" }, isReviewer: true, authorId: "x", versionCreatedBy: "x" }).allowed, false);
  });
});

describe("checklistComplete", () => {
  it("needs all four confirmations", () => {
    assert.equal(checklistComplete({ read: true, facts: true, safe: true }), false);
    assert.equal(checklistComplete({ read: true, facts: true, safe: true, private: true }), true);
    assert.equal(checklistComplete({ read: true, facts: true, safe: true, private: false }), false);
  });
});

describe("post workflow", () => {
  it("publishes only the version that was approved", () => {
    assert.equal(canPublish(post({ status: "approved", approvedVersionId: "v2" })), true);
    assert.equal(canPublish(post({ status: "approved", approvedVersionId: "v1" })), false, "approval of an older version");
    assert.equal(canPublish(post({ status: "draft", approvedVersionId: "v2" })), false);
    assert.equal(canPublish(post({ status: "in_review" })), false);
    assert.equal(canPublish(post({ status: "scheduled", approvedVersionId: "v2" })), true);
  });

  it("clears the approval and any schedule when the post is edited", () => {
    const edited = { ...post({ status: "approved", approvedVersionId: "v2" }), ...afterEdit(), currentVersionId: "v3" };
    assert.equal(edited.status, "draft");
    assert.equal(edited.approvedVersionId, null);
    assert.equal(approvalStands(edited), false);
    assert.equal(canPublish(edited), false);
    assert.equal(afterEdit().scheduledFor, null);
  });

  it("keeps a live post live while its next version is edited", () => {
    const live = post({ status: "published", currentVersionId: "v1", approvedVersionId: "v1", publishedVersionId: "v1" });
    const edited = { ...live, ...afterEdit(), currentVersionId: "v2" };
    assert.equal(edited.publishedVersionId, "v1");
    assert.equal(canUnpublish(edited), true);
    assert.equal(canArchive(edited), false, "a live post is unpublished, not archived");
  });

  it("submits drafts and sent-back posts only", () => {
    assert.equal(canSubmit(post({ status: "draft" })), true);
    assert.equal(canSubmit(post({ status: "changes_requested" })), true);
    assert.equal(canSubmit(post({ status: "in_review" })), false);
    assert.equal(canSubmit(post({ status: "published" })), false);
  });

  it("asks for a decision on a post that went live before reviews began", () => {
    const imported = post({ status: "published", currentVersionId: "v1", approvedVersionId: "v1", publishedVersionId: "v1" });
    assert.equal(awaitingDecision(imported, false), true);
    assert.equal(awaitingDecision(imported, true), false);
    assert.equal(awaitingDecision(post({ status: "in_review" }), false), true);
    assert.equal(awaitingDecision(post({ status: "draft" }), false), false);
  });

  it("schedules only a little way ahead and within a year", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    assert.equal(scheduleProblem(new Date("2026-11-22T09:00:00Z"), now), null);
    assert.ok(scheduleProblem(new Date("2026-11-21T12:01:00Z"), now));
    assert.ok(scheduleProblem(new Date("2028-01-01T00:00:00Z"), now));
    assert.ok(scheduleProblem(new Date("nonsense"), now));
  });
});

describe("contentHash", () => {
  it("changes with anything a reader would see", () => {
    const base = contentHash(content());
    assert.equal(contentHash(content()), base);
    assert.notEqual(contentHash(content({ title: "Four minutes of calm" })), base);
    assert.notEqual(contentHash(content({ body: words(301) })), base);
    assert.notEqual(contentHash(content({ coverAlt: "A cup of tea" })), base);
    assert.notEqual(contentHash(content({ sources: [{ title: "NHS", publisher: null, url: "https://www.nhs.uk", accessed: null }] })), base);
  });
});

describe("slugs", () => {
  it("makes a readable address from a title", () => {
    assert.equal(slugify("Small steps, real change: building resilience gently"), "small-steps-real-change-building-resilience-gently");
    assert.equal(slugify("Café & calm — a guide"), "cafe-and-calm-a-guide");
    assert.equal(isValidSlug("three-minutes-of-calm"), true);
    assert.equal(isValidSlug("Three minutes"), false);
    assert.equal(isValidSlug("-calm"), false);
  });

  it("finds the first free slug", () => {
    assert.equal(uniqueSlug("calm", []), "calm");
    assert.equal(uniqueSlug("calm", ["calm", "calm-2"]), "calm-3");
    assert.equal(uniqueSlug("", []), "post");
  });
});

describe("reading time", () => {
  it("counts words, not markdown", () => {
    assert.equal(wordCount("## Heading\n\n- one **two** [three](https://x.org)"), 4);
    assert.equal(readingTime(words(1000)), "5 min read");
    assert.equal(readingTime("Hi"), "1 min read");
  });
});

describe("diffParagraphs", () => {
  it("shows what was added and removed", () => {
    const d = diffParagraphs("One.\n\nTwo.\n\nThree.", "One.\n\nTwo, changed.\n\nThree.\n\nFour.");
    assert.deepEqual(d, [
      { kind: "same", text: "One." },
      { kind: "removed", text: "Two." },
      { kind: "added", text: "Two, changed." },
      { kind: "same", text: "Three." },
      { kind: "added", text: "Four." },
    ]);
  });

  it("names the other fields that changed", () => {
    assert.deepEqual(changedFields(content(), content({ title: "New", coverAlt: "Tea" })), ["Title", "Cover photo description"]);
  });
});

describe("sources", () => {
  it("reads one source per line", () => {
    const r = parseSources("Breathing exercises | NHS | https://www.nhs.uk/x | 2026-11-20\nMind on stress | https://www.mind.org.uk/stress");
    assert.ok(r.ok);
    assert.deepEqual(r.sources, [
      { title: "Breathing exercises", publisher: "NHS", url: "https://www.nhs.uk/x", accessed: "2026-11-20" },
      { title: "Mind on stress", publisher: null, url: "https://www.mind.org.uk/stress", accessed: null },
    ]);
    assert.equal(parseSources(formatSources(r.sources)).ok, true);
  });

  it("reads references written the usual ways, not only the suggested layout", () => {
    const r = parseSources(
      [
        "Mind (2023) How to improve your self-esteem. Available at: https://www.mind.org.uk/self-esteem/ (Accessed: 20 November 2026).",
        "Clance, P. R. and Imes, S. A. (1978) The impostor phenomenon in high achieving women. Psychotherapy, 15(3), pp. 241-247.",
        "https://www.nhs.uk/mental-health/self-help/",
        "NHS | www.nhs.uk",
        "See (https://en.wikipedia.org/wiki/Impostor_syndrome_(psychology)).",
      ].join("\n")
    );
    assert.ok(r.ok);
    assert.deepEqual(r.sources[0], {
      title: "Mind (2023) How to improve your self-esteem. (Accessed: 20 November 2026).",
      publisher: null,
      url: "https://www.mind.org.uk/self-esteem/",
      accessed: null,
    });
    assert.equal(r.sources[1].url, null);
    assert.match(r.sources[1].title, /^Clance, P\. R\./);
    assert.deepEqual(r.sources[2], { title: "nhs.uk", publisher: null, url: "https://www.nhs.uk/mental-health/self-help/", accessed: null });
    assert.deepEqual(r.sources[3], { title: "NHS", publisher: null, url: "https://www.nhs.uk", accessed: null });
    assert.equal(r.sources[4].url, "https://en.wikipedia.org/wiki/Impostor_syndrome_(psychology)");
  });

  it("reads back what it wrote", () => {
    const text = "Mind (2023) Self-esteem. Available at: https://www.mind.org.uk/x\nA book with no link (2020).\nBreathing | NHS | https://www.nhs.uk/b | 2026-11-20";
    const first = parseSources(text);
    assert.ok(first.ok);
    const again = parseSources(formatSources(first.sources));
    assert.ok(again.ok);
    assert.deepEqual(again.sources, first.sources);
  });

  it("only ever links to a real web address", () => {
    const r = parseSources("NHS | javascript:alert(1)\nClick javascript:alert(1) here");
    assert.ok(r.ok);
    assert.deepEqual(r.sources.map((s) => s.url), [null, null]);
  });

  it("refuses an implausibly long list", () => {
    assert.equal(parseSources(Array.from({ length: 51 }, (_, i) => `Source ${i}`).join("\n")).ok, false);
  });

  it("knows the trusted sites, subdomains included", () => {
    assert.equal(isTrustedHost("nhs.uk"), true);
    assert.equal(isTrustedHost("digital.nhs.uk"), true);
    assert.equal(isTrustedHost("ons.gov.uk"), true);
    assert.equal(isTrustedHost("notnhs.uk"), false);
    assert.equal(isTrustedHost("nhs.uk.example.com"), false);
  });
});

describe("contentFindings", () => {
  const messages = (c: BlogContent) => contentFindings(c).map((f) => f.message).join("\n");

  it("is quiet for a plain, sourced post", () => {
    assert.deepEqual(contentFindings(content()), []);
  });

  it("points at suicide, promises, diagnosis, medication and clients", () => {
    const m = messages(content({ body: `${words(200)} suicide. This will cure you. A diagnosis. Your medication. One of my clients said.` }));
    assert.match(m, /Samaritans/);
    assert.match(m, /Promises an outcome/);
    assert.match(m, /non-clinical/);
    assert.match(m, /medicines/);
    assert.match(m, /describe a client/);
  });

  it("spots links that aren't sources and sources off the trusted list", () => {
    const m = messages(
      content({
        body: `${words(200)} See [this](https://example.com/a) and [the NHS](https://www.nhs.uk/b) and [us](https://thrivsphere.org/book).`,
        sources: [
          { title: "NHS", publisher: null, url: "https://www.nhs.uk/b", accessed: null },
          { title: "Blog", publisher: null, url: "https://randomblog.net/x", accessed: null },
        ],
      })
    );
    assert.match(m, /example\.com isn't in the sources list/);
    assert.doesNotMatch(m, /nhs\.uk isn't in the sources/);
    assert.doesNotMatch(m, /thrivsphere/);
    assert.match(m, /randomblog\.net isn't one of the usual trusted sources/);
  });

  it("allows the helplines the site lists but not other numbers or emails", () => {
    assert.deepEqual(contentFindings(content({ body: `${words(200)} Call Samaritans on 116 123 or the helpline on 0808 2000 247.` })), []);
    assert.match(messages(content({ body: `${words(200)} Ring me on 07700 900123.` })), /phone number/);
    assert.match(messages(content({ body: `${words(200)} Email jo@example.com.` })), /email address/);
  });

  it("asks for sources when figures are quoted", () => {
    assert.match(messages(content({ body: `${words(200)} About 1 in 4 people.` })), /no sources/);
  });

  it("asks for a cover photo description", () => {
    assert.match(messages(content({ coverImage: "a.jpg" })), /screen readers/);
  });
});

describe("reviewProblems", () => {
  it("lists what's missing before review", () => {
    assert.deepEqual(reviewProblems(content()), []);
    assert.equal(reviewProblems(content({ excerpt: "", body: "Too short" })).length, 2);
  });
});

describe("forms", () => {
  it("reads the editor form", () => {
    const r = parseContent(
      { title: " Calm ", category: "Mindfulness", excerpt: "Short", body: "Hello\r\nthere", sources: "NHS | https://www.nhs.uk", coverAlt: "" },
      { coverImage: null }
    );
    assert.ok(r.ok);
    assert.equal(r.content.title, "Calm");
    assert.equal(r.content.body, "Hello\nthere");
    assert.equal(r.content.sources.length, 1);
    assert.equal(r.content.coverAlt, null);
  });

  it("counts a line break in a box as one character, as the box does", () => {
    // Browsers send each line break as CR LF. A summary that fills the box exactly must still save.
    const excerpt = `First line.\r\n${"x".repeat(LIMITS.excerpt - 12)}`;
    const r = parseContent({ title: "T", category: "Mindfulness", excerpt, body: "b" }, { coverImage: null });
    assert.ok(r.ok, r.ok ? "" : r.message);
    assert.equal(r.content.excerpt.length, LIMITS.excerpt);
  });

  it("says by how much something is too long", () => {
    const r = parseContent({ title: "T", category: "Mindfulness", excerpt: "x".repeat(LIMITS.excerpt + 41), body: "b" }, { coverImage: null });
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.message, new RegExp(`${LIMITS.excerpt + 41} characters`));
  });

  it("uses the opening of the post when the summary is left empty", () => {
    const r = parseContent(
      { title: "T", category: "Mindfulness", excerpt: "", body: "## Start here\n\nA **gentle** look at [stress](https://www.nhs.uk). More follows.\n\nSecond paragraph." },
      { coverImage: null }
    );
    assert.ok(r.ok);
    assert.equal(r.content.excerpt, "A gentle look at stress. More follows.");
    assert.deepEqual(reviewProblems({ ...r.content, body: "word ".repeat(200) }), []);
  });

  it("refuses an unknown category and a missing title", () => {
    assert.equal(parseContent({ title: "", category: "Mindfulness" }, { coverImage: null }).ok, false);
    assert.equal(parseContent({ title: "x", category: "Crypto" }, { coverImage: null }).ok, false);
  });

  it("reads a brief", () => {
    const r = parseBrief({ topic: "Sleep and stress", audience: "workplace", takeaway: "Small changes help", length: "short", notes: "" });
    assert.ok(r.ok);
    assert.equal(r.brief.length, "short");
    assert.equal(parseBrief({ topic: "" }).ok, false);
    assert.equal(parseBrief({ topic: "x", audience: "everyone" }).ok, false);
  });
});

describe("autoExcerpt", () => {
  it("cuts a long opening at a sentence, or failing that a word", () => {
    const sentences = `${"This is a sentence about wellbeing. ".repeat(10)}`;
    const a = autoExcerpt(sentences);
    assert.ok(a.length <= 220 && a.endsWith("."), a);
    const b = autoExcerpt("word ".repeat(100));
    assert.ok(b.length <= 221 && b.endsWith("…"), b);
    assert.equal(autoExcerpt("- only a list\n- here"), "");
  });
});

describe("tidyPastedText", () => {
  it("spaces paragraphs pasted from Word and keeps its bullet points", () => {
    const pasted = "Imposter syndrome is common.\r\nMany people feel it.\r\n•\tNoticing the thought\r\n•\tNaming it\r\n1. Breathe\r\nA closing line.";
    assert.equal(
      tidyPastedText(pasted),
      "Imposter syndrome is common.\n\nMany people feel it.\n\n- Noticing the thought\n- Naming it\n1. Breathe\n\nA closing line."
    );
  });

  it("leaves alone text that's one line or already has its paragraphs spaced", () => {
    assert.equal(tidyPastedText("Just a phrase"), null);
    assert.equal(tidyPastedText("Para one.\n\nPara two.\n- a list"), null);
  });
});
