/**
 * The Brand Kit: how ThriveSphere looks and sounds, in one place.
 *
 * Every piece of marketing, and every AI task, reads the approved kit. It is
 * versioned like a blog post: admins edit a draft, the founder approves it,
 * and only the approved version is used.
 *
 * Pure: no database, nothing server-only, so the editor can check a draft as
 * it is typed.
 */

import { brand, legal, mission, scopeOfPractice, values } from "../data/site";
import { BRAND_COLOURS, WORDMARK } from "./brand-tokens";

export type KitWord = { avoid: string; instead: string; why: string };
export type KitAudience = { name: string; needs: string; angle: string };
export type KitPillar = { name: string; share: number; covers: string };
export type KitCta = { label: string; path: string };
export type KitReply = { title: string; text: string };

export const BOILERPLATES = [
  { key: "short", label: "One line", hint: "For bios and image captions. Up to 150 characters.", max: 150 },
  { key: "medium", label: "Short paragraph", hint: "For LinkedIn and Google Business Profile. Up to 750 characters.", max: 750 },
  { key: "long", label: "About us", hint: "For newsletters and partners.", max: 2000 },
  { key: "nonClinical", label: "What we are and aren't", hint: "Goes with anything about a service.", max: 500 },
  { key: "notCrisis", label: "Not a crisis service", hint: "Goes with anything about difficult feelings.", max: 400 },
  { key: "crisisLine", label: "Crisis line", hint: "Must include Samaritans 116 123 and 999.", max: 300 },
  { key: "legalLine", label: "Legal line", hint: "The company behind the trading name.", max: 300 },
  { key: "credentials", label: "Approved credentials", hint: "The only way to describe the team's qualifications.", max: 300 },
] as const;

export type BoilerplateKey = (typeof BOILERPLATES)[number]["key"];

export type BrandKit = {
  identity: { mission: string; positioning: string; promise: string; values: string[] };
  voice: { personality: string[]; do: string[]; dont: string[] };
  words: KitWord[];
  boilerplates: Record<BoilerplateKey, string>;
  audiences: KitAudience[];
  pillars: KitPillar[];
  hashtags: string[];
  ctas: KitCta[];
  visual: { wordmark: { thrive: string; sphere: string; wellbeing: string }; imageStyle: string; photoRules: string[] };
  replies: KitReply[];
};

export const KIT_LIMITS = {
  text: 2000,
  line: 300,
  listItems: 40,
  hashtags: 30,
  replies: 12,
  replyText: 1500,
};

/** Where a call to action may send people: pages that exist and keep campaign tags. */
export const CTA_PATHS = ["/book", "/contact", "/services", "/pricing", "/blog", "/about", "/how-it-works", "/newsletter"];

// ---------------------------------------------------------------------------
// The first draft, from the website's own wording

export function seedKit(): BrandKit {
  return {
    identity: {
      mission,
      positioning: brand.positioning,
      promise: brand.tagline,
      values: [...values],
    },
    voice: {
      personality: ["Warm", "Calm", "Professional", "Hopeful", "Plain-spoken"],
      do: [
        "Write in UK English, in short sentences, as one person speaking to another",
        "Describe what we offer and how it works, not what it will cure",
        "Use everyday words for everyday challenges: stress, worry, low mood, confidence",
        "Say who a service is for by describing the service, not the reader",
        "Offer one clear next step",
        "Include help routes whenever suicide, self-harm or crisis is mentioned",
      ],
      dont: [
        "Promise results, recovery or a cure",
        "Suggest we replace a GP, the NHS, medication or therapy",
        "Assume something about the reader's health (\"Are you anxious?\")",
        "Use clients' stories, quotes or reviews",
        "Use fear, guilt or urgency to sell (\"Don't wait until it's too late\")",
        "Use clinical labels we don't work with (diagnose, disorder, patient)",
      ],
    },
    words: [
      { avoid: "treat, treatment, cure, heal", instead: "support, education, coping skills", why: "ThriveSphere is non-clinical; health claims need evidence (ASA/CAP Code)." },
      { avoid: "therapy, therapist, counselling", instead: "wellbeing support, practitioner", why: "We are not a counselling or psychotherapy service." },
      { avoid: "patient", instead: "client, you", why: "Non-clinical service." },
      { avoid: "diagnose, assessment (clinical)", instead: "Wellbeing Needs Review", why: "We do not assess or diagnose." },
      { avoid: "guaranteed, proven to", instead: "designed to, many people find", why: "Outcome promises are not allowed without robust evidence." },
      { avoid: "suffering from", instead: "living with, experiencing", why: "Respectful, person-first language." },
      { avoid: "committed suicide", instead: "died by suicide", why: "Samaritans' media guidelines." },
      { avoid: "Blue Monday", instead: "(leave it out)", why: "A marketing invention that mental health charities ask people not to use." },
      { avoid: "Are you anxious? / Struggling with depression?", instead: "Support with worry and low mood", why: "Meta's rules on personal attributes, and kinder." },
      { avoid: "crazy, mental, insane, OCD (as a joke)", instead: "(leave it out)", why: "Stigmatising." },
    ],
    boilerplates: {
      short: "Online, non-clinical wellbeing support for adults across the UK, from Registered Mental Health Nurses.",
      medium:
        "ThriveSphere Wellbeing offers online, non-clinical wellbeing support for adults across the UK. Our Registered Mental Health Nurses help people understand their emotional wellbeing, learn practical coping strategies and strengthen resilience, in sessions that fit around work and family life, including evenings and weekends.",
      long: [
        "ThriveSphere Wellbeing provides compassionate, accessible and personalised wellbeing education and support for adults aged 18 and over across the UK.",
        "Sessions are online and start with a Wellbeing Needs Review: a structured, non-clinical conversation about what's going on, what already helps and what you'd like to change. From there we offer emotional wellbeing support, psychoeducation and coping skills, resilience and personal development, and workplace wellbeing for employers.",
        "Our team are Registered Mental Health Nurses. ThriveSphere is not a clinical, counselling or emergency service; if your needs fall outside what we offer, we will say so and help you find the right support.",
      ].join("\n\n"),
      nonClinical: `ThriveSphere is a non-clinical wellbeing service. ${scopeOfPractice.isNot[1]}, and we are not a substitute for your GP or NHS mental health services.`,
      notCrisis: "ThriveSphere is not an emergency or crisis service. If you are in immediate danger, call 999.",
      crisisLine: "If you need help right now: call 999 in an emergency, or Samaritans free, day or night, on 116 123.",
      legalLine: legal.statement,
      credentials: "Registered Mental Health Nurses",
    },
    audiences: [
      { name: "Adults looking after their wellbeing", needs: "Practical ways to cope with stress, worry and low mood", angle: "Small, practical steps; support that fits around life" },
      { name: "People considering support for the first time", needs: "To know what a session is like and that it's safe to ask", angle: "What happens in a Wellbeing Needs Review; no pressure" },
      { name: "People going through change", needs: "Steadiness through transitions, relationships and family pressures", angle: "Resilience and personal development" },
      { name: "Employers, HR and managers", needs: "Practical wellbeing support for staff, delivered online or on site", angle: "Workplace wellbeing sessions and talks; non-clinical, professional" },
    ],
    pillars: [
      { name: "Practical coping skills", share: 35, covers: "Tips and techniques people can use today" },
      { name: "Understanding wellbeing", share: 25, covers: "Plain explanations of stress, sleep, boundaries, confidence" },
      { name: "How ThriveSphere works", share: 20, covers: "Services, the first session, prices, booking, who we are" },
      { name: "Workplace wellbeing", share: 15, covers: "For employers and HR: sessions, talks, awareness days" },
      { name: "Community and awareness days", share: 5, covers: "Recognised days and signposting to other services" },
    ],
    hashtags: ["#ThriveSphereWellbeing", "#Wellbeing", "#MentalWellbeing", "#CopingSkills", "#Resilience", "#WorkplaceWellbeing", "#UKWellbeing"],
    ctas: [
      { label: "Book Initial Wellbeing Consultation – £30", path: "/book" },
      { label: "Request a Callback", path: "/book" },
      { label: "Get in touch", path: "/contact" },
      { label: "Read more on our blog", path: "/blog" },
    ],
    visual: {
      wordmark: { ...WORDMARK },
      imageStyle:
        "Soft, natural light; calm outdoor and home scenes, plants, water, open sky, simple objects; gentle teal, sage and warm white tones with a touch of gold; uncluttered, plenty of space for text; no people, no faces, no hands; no words or letters; no medical settings, pills or hospital imagery; nothing dark, distressing or dramatic.",
      photoRules: [
        "Only photos we own, licensed stock, or staff who have agreed in writing",
        "Never a client, or anything that could identify one",
        "No stock photos of people in visible distress (head in hands, crying)",
        "Leave space for text; keep the subject away from the edges",
        "Describe every image in its alt text",
      ],
    },
    replies: [
      {
        title: "Someone shares they're struggling",
        text: "Thank you for sharing this. We're sorry things feel hard right now. We can't offer support in comments, but you're welcome to contact us privately through thrivsphere.org/contact. If you need help right now, please call Samaritans free on 116 123, or 999 in an emergency.",
      },
      {
        title: "Someone may be at risk",
        text: "We're really concerned to read this. Please call 999 if you're in danger, or Samaritans free, any time, on 116 123. You can also text SHOUT to 85258. You don't have to go through this alone.",
      },
      {
        title: "Asking about prices",
        text: "Thanks for asking. Our prices are on thrivsphere.org/pricing, and the Initial Wellbeing Consultation is £30. If you'd like to talk it through first, you can request a callback at thrivsphere.org/book.",
      },
      {
        title: "Asking if we offer therapy or a diagnosis",
        text: "Thanks for your question. ThriveSphere offers non-clinical wellbeing support and education, so we don't diagnose or provide therapy. Your GP is the best first step for that, and we're happy to help you think about the right support: thrivsphere.org/contact.",
      },
      {
        title: "An employer enquiry",
        text: "Thank you for getting in touch. We'd be glad to talk about wellbeing support for your team. Please send us a few details at thrivsphere.org/contact and we'll come back to you.",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Checking a draft

export type KitProblem = { section: string; message: string };

const HEX = /^#[0-9a-f]{6}$/i;

export function kitProblems(kit: BrandKit): KitProblem[] {
  const out: KitProblem[] = [];
  const need = (section: string, value: string, label: string) => {
    if (!value.trim()) out.push({ section, message: `${label} is empty.` });
  };
  need("Identity", kit.identity.mission, "The mission");
  need("Identity", kit.identity.positioning, "The positioning line");
  for (const b of BOILERPLATES) {
    const v = kit.boilerplates[b.key] ?? "";
    need("Standard wording", v, b.label);
    if (v.length > b.max) out.push({ section: "Standard wording", message: `${b.label} is ${v.length} characters; keep it to ${b.max}.` });
  }
  const crisis = kit.boilerplates.crisisLine ?? "";
  if (!/116\s?123/.test(crisis) || !/\b999\b/.test(crisis)) {
    out.push({ section: "Standard wording", message: "The crisis line must include Samaritans 116 123 and 999." });
  }
  if (kit.pillars.length === 0) out.push({ section: "Content pillars", message: "Add at least one content pillar." });
  const total = kit.pillars.reduce((s, p) => s + p.share, 0);
  if (kit.pillars.length && total !== 100) out.push({ section: "Content pillars", message: `The pillars' shares add up to ${total}%; they should add up to 100%.` });
  for (const p of kit.pillars) {
    if (!Number.isInteger(p.share) || p.share < 0 || p.share > 100) out.push({ section: "Content pillars", message: `"${p.name}" needs a share between 0 and 100.` });
  }
  for (const c of kit.ctas) {
    if (!CTA_PATHS.includes(c.path)) out.push({ section: "Calls to action", message: `"${c.label}" points at ${c.path}; use one of ${CTA_PATHS.join(", ")}.` });
  }
  for (const h of kit.hashtags) {
    if (!/^#[A-Za-z0-9_]{2,50}$/.test(h)) out.push({ section: "Hashtags", message: `${h} isn't a hashtag (letters and numbers after #, no spaces).` });
  }
  for (const [k, v] of Object.entries(kit.visual.wordmark)) {
    if (!HEX.test(v)) out.push({ section: "Look", message: `The wordmark's ${k} colour must be written like #2f8a7e.` });
  }
  need("Look", kit.visual.imageStyle, "The image style");
  for (const r of kit.replies) {
    if (!r.title.trim() || !r.text.trim()) out.push({ section: "Saved replies", message: "Each saved reply needs a title and its text." });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The editor's form: lists are one item per line; rows are separated by "|".

export const lines = (text: string, max = KIT_LIMITS.listItems) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim().slice(0, KIT_LIMITS.line))
    .filter(Boolean)
    .slice(0, max);

const cells = (line: string) => line.split("|").map((c) => c.trim());

export const formatRows = (rows: string[][]) => rows.map((r) => r.join(" | ")).join("\n");

export function kitFormValues(kit: BrandKit): Record<string, string> {
  const v: Record<string, string> = {
    mission: kit.identity.mission,
    positioning: kit.identity.positioning,
    promise: kit.identity.promise,
    values: kit.identity.values.join("\n"),
    personality: kit.voice.personality.join("\n"),
    voiceDo: kit.voice.do.join("\n"),
    voiceDont: kit.voice.dont.join("\n"),
    words: formatRows(kit.words.map((w) => [w.avoid, w.instead, w.why])),
    audiences: formatRows(kit.audiences.map((a) => [a.name, a.needs, a.angle])),
    pillars: formatRows(kit.pillars.map((p) => [p.name, `${p.share}%`, p.covers])),
    hashtags: kit.hashtags.join(" "),
    ctas: formatRows(kit.ctas.map((c) => [c.label, c.path])),
    wordmarkThrive: kit.visual.wordmark.thrive,
    wordmarkSphere: kit.visual.wordmark.sphere,
    wordmarkWellbeing: kit.visual.wordmark.wellbeing,
    imageStyle: kit.visual.imageStyle,
    photoRules: kit.visual.photoRules.join("\n"),
  };
  for (const b of BOILERPLATES) v[`bp_${b.key}`] = kit.boilerplates[b.key] ?? "";
  kit.replies.forEach((r, i) => {
    v[`replyTitle${i}`] = r.title;
    v[`replyText${i}`] = r.text;
  });
  return v;
}

export function parseKitForm(get: (name: string) => string): BrandKit {
  const text = (n: string) => get(n).replace(/\r\n/g, "\n").trim().slice(0, KIT_LIMITS.text);
  const rows = (n: string, width: number) =>
    lines(get(n)).map((l) => {
      const c = cells(l);
      while (c.length < width) c.push("");
      return c;
    });
  const replies: KitReply[] = [];
  for (let i = 0; i < KIT_LIMITS.replies; i++) {
    const title = text(`replyTitle${i}`).slice(0, 120);
    const body = get(`replyText${i}`).trim().slice(0, KIT_LIMITS.replyText);
    if (title || body) replies.push({ title, text: body });
  }
  const boilerplates = Object.fromEntries(BOILERPLATES.map((b) => [b.key, text(`bp_${b.key}`)])) as Record<BoilerplateKey, string>;
  return {
    identity: { mission: text("mission"), positioning: text("positioning"), promise: text("promise"), values: lines(get("values")) },
    voice: { personality: lines(get("personality")), do: lines(get("voiceDo")), dont: lines(get("voiceDont")) },
    words: rows("words", 3).map(([avoid, instead, why]) => ({ avoid, instead, why })),
    boilerplates,
    audiences: rows("audiences", 3).map(([name, needs, angle]) => ({ name, needs, angle })),
    pillars: rows("pillars", 3).map(([name, share, covers]) => ({ name, share: Number(share.replace("%", "").trim()), covers })),
    hashtags: get("hashtags")
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith("#") ? h : `#${h}`))
      .slice(0, KIT_LIMITS.hashtags),
    ctas: rows("ctas", 2).map(([label, path]) => ({ label, path: path.replace(/^https?:\/\/(www\.)?thrivsphere\.org/, "") || "/" })),
    visual: {
      wordmark: {
        thrive: text("wordmarkThrive").toLowerCase(),
        sphere: text("wordmarkSphere").toLowerCase(),
        wellbeing: text("wordmarkWellbeing").toLowerCase(),
      },
      imageStyle: text("imageStyle"),
      photoRules: lines(get("photoRules")),
    },
    replies,
  };
}

/** Sections that differ between two versions, for the founder's review. */
export function changedSections(before: BrandKit | null, after: BrandKit): string[] {
  if (!before) return ["Everything (first version)"];
  const names: [keyof BrandKit, string][] = [
    ["identity", "Identity"],
    ["voice", "Voice and tone"],
    ["words", "Words to use and avoid"],
    ["boilerplates", "Standard wording"],
    ["audiences", "Audiences"],
    ["pillars", "Content pillars"],
    ["hashtags", "Hashtags"],
    ["ctas", "Calls to action"],
    ["visual", "Look"],
    ["replies", "Saved replies"],
  ];
  return names.filter(([k]) => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map(([, label]) => label);
}

// ---------------------------------------------------------------------------
// Approval: the founder alone approves the kit.

export function canApproveKit(actor: { role: string; status: string }): boolean {
  return actor.status === "active" && actor.role === "founder";
}

export type KitVersionRow = { id: string; number: number; contentHash: string; createdAt: Date };
export type KitApprovalRow = { versionId: string; contentHash: string; approvedAt: Date };

/** The newest version whose approval still matches it, and any newer draft. */
export function kitStatus(versions: KitVersionRow[], approvals: KitApprovalRow[]) {
  const sorted = [...versions].sort((a, b) => b.number - a.number);
  const approvedIds = new Set(approvals.filter((a) => sorted.some((v) => v.id === a.versionId && v.contentHash === a.contentHash)).map((a) => a.versionId));
  const approved = sorted.find((v) => approvedIds.has(v.id)) ?? null;
  const latest = sorted[0] ?? null;
  const draft = latest && latest.id !== approved?.id && !approvedIds.has(latest.id) ? latest : null;
  return { approved, draft, latest };
}

/** Colours a template may use: the site's palette plus the wordmark. */
export const palette = (kit: BrandKit | null) => ({ ...BRAND_COLOURS, wordmark: kit?.visual.wordmark ?? WORDMARK });
