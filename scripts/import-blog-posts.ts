/**
 * Move the four articles that were written into the website's code into the
 * blog database, as published posts.
 *
 * They were live before reviews began, so they arrive marked as not yet
 * reviewed: the founder sees each one in Blog with a prompt to review it.
 * With --hold they come off the website instead and wait for review.
 *
 * Safe to run twice: a post whose address already exists is skipped.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/import-blog-posts.ts [--dry-run] [--hold]
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { blogPostVersions, blogPosts } from "../src/db/schema";
import { contentHash } from "../src/lib/blog-hash";
import { zonedTimeToUtc } from "../src/lib/time";
import type { BlogContent } from "../src/lib/blog-rules";

type Legacy = { slug: string; category: string; title: string; excerpt: string; date: string; body: string };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "12 June 2026" → midday that day, UK time. */
function parseDate(s: string): Date {
  const [d, m, y] = s.split(" ");
  const month = MONTHS.indexOf(m) + 1;
  if (!month) throw new Error(`Unreadable date: ${s}`);
  return zonedTimeToUtc(`${y}-${String(month).padStart(2, "0")}-${d.padStart(2, "0")}`, "12:00", "Europe/London");
}

const LEGACY: Legacy[] = 
[
  {
    "slug": "building-resilience-gently",
    "category": "Resilience",
    "title": "Small steps, real change: building resilience gently",
    "excerpt": "Resilience isn't about being strong all the time — it's about the small, kind choices we make each day. Here's how to begin.",
    "date": "12 June 2026",
    "body": "Resilience is often misunderstood. We picture it as toughness — pushing through, never faltering. In truth, resilience is softer and steadier than that. It's the quiet capacity to bend without breaking, and to find our way back after hard days.\n\n## It's built, not born\n\nResilience isn't a fixed trait you either have or don't. It grows through small, repeated experiences of coping — noticing you got through something, and learning you can again.\n\n## Where to begin\n\n- Name one feeling honestly each day, without judging it\n- Do one small thing that future-you will thank you for\n- Let yourself rest — recovery is part of strength\n- Reach for connection, even a short message to someone kind\n\n## Be patient with the process\n\nSome days will feel like going backwards. That's not failure — it's how growth actually looks. Every gentle choice to keep going is resilience in action.\n\nIf you'd like support building your own resilience, our Resilience and Personal Development support is a good place to start."
  },
  {
    "slug": "what-healthy-love-feels-like",
    "category": "Healthy Relationships",
    "title": "What healthy love actually feels like",
    "excerpt": "After an unhealthy relationship, it can be hard to know what safe feels like. These are the quiet signs of respect and care.",
    "date": "28 May 2026",
    "body": "After an unhealthy relationship, safety can feel unfamiliar — even uncomfortable at first. When you're used to walking on eggshells, calm can feel like something is missing. It isn't. It's what healthy feels like.\n\n## The quiet signs of respect\n\n- You can disagree without fear\n- Your 'no' is heard and honoured\n- You feel free to see friends and family\n- Your feelings are met with curiosity, not defensiveness\n- You feel more yourself, not less\n\n## Healthy love is steady, not intense\n\nIntensity can be mistaken for love, but constant highs and lows are often a sign of instability. Healthy love tends to feel calmer — dependable, warm, and safe.\n\n## Relearning takes time\n\nIf trust feels hard, that's understandable. Rebuilding your sense of what's healthy is a journey, and you're allowed to take it slowly, with support around you."
  },
  {
    "slug": "three-minutes-of-calm",
    "category": "Mindfulness",
    "title": "Three minutes of calm you can find anywhere",
    "excerpt": "You don't need a quiet room or an hour of free time. Try this micro-practice between the moments of a busy day.",
    "date": "9 May 2026",
    "body": "We often think we need the perfect conditions to feel calm — silence, space, time. But calm can be found in the small gaps of an ordinary day, in just a few minutes.\n\n## A three-minute reset\n\n- **Minute one:** notice your breath, without changing it\n- **Minute two:** slow the out-breath, letting your shoulders drop\n- **Minute three:** name one thing you're grateful for right now\n\n## Anchor it to something you already do\n\nTry it while the kettle boils, before you open your laptop, or in the car before you drive off. Attaching calm to an existing habit makes it far easier to keep.\n\nSmall moments of calm, repeated often, gently retrain the nervous system toward steadiness."
  },
  {
    "slug": "rediscovering-yourself-after-a-life-transition",
    "category": "Recovery",
    "title": "Rediscovering yourself after a life transition",
    "excerpt": "Separation, loss or change can leave us unsure of who we are. Reconnecting with your identity is a journey worth taking.",
    "date": "21 April 2026",
    "body": "Big transitions — separation, loss, a change in health or role — can leave us feeling unmoored. When so much of our identity was tied to a relationship or routine, we can be left asking: who am I now?\n\n## Give yourself permission to not know yet\n\nYou don't have to have it figured out. Identity isn't rebuilt overnight; it's rediscovered gradually, through small acts of curiosity about what you enjoy and value.\n\n## Gentle ways to reconnect\n\n- Revisit an interest you set aside\n- Notice what energises you and what drains you\n- Spend time with people who reflect your strengths back to you\n- Let go of who you 'should' be, and get curious about who you are\n\n## You are still here\n\nTransitions change our circumstances, but they don't erase us. Underneath the change, your values and your worth remain. Reconnecting with them is a journey worth taking — and you don't have to take it alone."
  }
]
;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const hold = process.argv.includes("--hold");
  const db = getDb();

  for (const p of LEGACY) {
    const [existing] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, p.slug)).limit(1);
    if (existing) {
      console.log(`skip   ${p.slug} (already in the blog)`);
      continue;
    }
    const content: BlogContent = {
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      metaDescription: null,
      body: p.body,
      sources: [],
      coverImage: null,
      coverAlt: null,
    };
    const date = parseDate(p.date);
    if (dryRun) {
      console.log(`would  ${p.slug} · ${date.toISOString()} · ${p.body.length} characters`);
      continue;
    }
    const [post] = await db
      .insert(blogPosts)
      .values({ slug: p.slug, status: hold ? "in_review" : "published", authorId: null, createdAt: date, updatedAt: new Date(), submittedAt: hold ? new Date() : null })
      .returning({ id: blogPosts.id });
    const [version] = await db
      .insert(blogPostVersions)
      .values({ postId: post.id, number: 1, ...content, contentHash: contentHash(content), origin: "imported", note: "Moved from the website's code", createdBy: null, createdAt: date })
      .returning({ id: blogPostVersions.id });
    await db
      .update(blogPosts)
      .set({
        currentVersionId: version.id,
        ...(hold ? {} : { publishedVersionId: version.id, firstPublishedAt: date, publishedAt: date }),
      })
      .where(eq(blogPosts.id, post.id));
    console.log(`added  ${p.slug}${hold ? " (waiting for review, not on the website)" : " (on the website, not yet reviewed)"}`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
