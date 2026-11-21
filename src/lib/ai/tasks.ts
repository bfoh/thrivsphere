/**
 * What AI help can do, one entry per button.
 *
 * Each task says who may use it, what it receives (checked before anything
 * is sent), what it must send back (a fixed shape, so the page can show it
 * reliably), and how hard the model should think. AI never saves or
 * publishes anything: results only fill the editor, where a person decides.
 */
import { z } from "zod";
import type { Capability } from "../authz";

export type Effort = "low" | "medium" | "high";

export const MODEL = "claude-opus-5-5";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/);

// ---------------------------------------------------------------------------
// Inputs: limits keep requests (and costs) small.

const postText = z.object({
  postId: uuid.optional(),
  title: z.string().trim().max(200),
  category: z.string().trim().max(60).default(""),
  body: z.string().trim().min(80, "Write a little more of the post first.").max(60_000),
});

import { REWRITE_STYLES, type RewriteStyle } from "./styles";

export { REWRITE_STYLES, type RewriteStyle };

const INPUTS = {
  "blog-titles": postText,
  "blog-summary": postText,
  "blog-review": postText.extend({ excerpt: z.string().trim().max(400).default(""), sources: z.string().max(6000).default("") }),
  "blog-rewrite": z.object({
    postId: uuid.optional(),
    title: z.string().trim().max(200).default(""),
    passage: z.string().trim().min(20, "Select a sentence or paragraph to rewrite.").max(4000, "Select a shorter passage (a few paragraphs at most)."),
    style: z.enum(["warmer", "plainer", "shorter", "professional"]),
  }),
  "image-alt": z.object({ assetId: uuid }),
};

// ---------------------------------------------------------------------------
// Outputs: plain shapes (no length rules), tidied in code afterwards.

const OUTPUTS = {
  "blog-titles": z.object({ options: z.array(z.object({ title: z.string(), why: z.string() })) }),
  "blog-summary": z.object({ summary: z.string(), searchDescription: z.string() }),
  "blog-review": z.object({
    overall: z.string(),
    issues: z.array(z.object({ severity: z.enum(["must_fix", "consider"]), quote: z.string(), problem: z.string(), suggestion: z.string() })),
  }),
  "blog-rewrite": z.object({ rewritten: z.string(), note: z.string() }),
  "image-alt": z.object({ altText: z.string(), showsPeople: z.boolean(), hasText: z.boolean() }),
};

export type TaskKey = keyof typeof INPUTS;
export type TaskInput<K extends TaskKey> = z.infer<(typeof INPUTS)[K]>;
export type TaskOutput<K extends TaskKey> = z.infer<(typeof OUTPUTS)[K]>;

type TaskSettings = { label: string; capability: Capability; entity: string; effort: Effort; maxTokens: number };

export const TASKS: Record<TaskKey, TaskSettings> = {
  "blog-titles": { label: "Suggest titles", capability: "blog:write", entity: "blog_posts", effort: "low", maxTokens: 6000 },
  "blog-summary": { label: "Write the summary and search description", capability: "blog:write", entity: "blog_posts", effort: "low", maxTokens: 6000 },
  "blog-review": { label: "Check against our rules", capability: "blog:write", entity: "blog_posts", effort: "medium", maxTokens: 16000 },
  "blog-rewrite": { label: "Rewrite the selected text", capability: "blog:write", entity: "blog_posts", effort: "low", maxTokens: 8000 },
  "image-alt": { label: "Suggest a description", capability: "marketing:write", entity: "marketing_assets", effort: "low", maxTokens: 4000 },
};

export const isTaskKey = (k: string): k is TaskKey => k in TASKS;

export function parseTaskInput<K extends TaskKey>(task: K, raw: unknown): { ok: true; input: TaskInput<K> } | { ok: false; message: string } {
  const r = INPUTS[task].safeParse(raw);
  if (r.success) return { ok: true, input: r.data as TaskInput<K> };
  return { ok: false, message: r.error.issues[0]?.message ?? "That request wasn't complete." };
}

export const outputSchema = <K extends TaskKey>(task: K) => OUTPUTS[task];

/** The text of the request (the image, for alt text, is added by the caller). */
export function taskPrompt<K extends TaskKey>(task: K, input: TaskInput<K>): string {
  const i = input as Record<string, string>;
  const post = () => `Category: ${i.category || "not chosen"}\nWorking title: ${i.title || "none yet"}\n\n<post>\n${i.body}\n</post>`;
  switch (task) {
    case "blog-titles":
      return `Suggest five titles for this blog post. Each should be under 65 characters, so it shows in full in search results; specific, calm and honest about what the post gives the reader. No clickbait, no questions about the reader's health, no promises. Give a short reason for each, without repeating its length (the page shows that).\n\n${post()}`;
    case "blog-summary":
      return `Write two things for this blog post:\n1. summary: one or two sentences, at most 280 characters, shown under the title on the blog page.\n2. searchDescription: 120 to 155 characters, shown by search engines.\nBoth should say what the reader will find, in our voice, without promising results.\n\n${post()}`;
    case "blog-review":
      return `Check this draft blog post as a careful editor would before a reviewer approves it, against the rules and the Brand Kit. Look for:\n- claims to treat, cure or improve a condition, or promised outcomes\n- anything that discourages seeing a GP, using NHS services or taking medication\n- testimonials, quotes, or stories about clients or other real people\n- names, contact details or health details of anyone\n- suicide or self-harm content: does it follow Samaritans' guidance, and include the crisis line?\n- facts or figures not supported by the listed sources\n- words on the avoid list, and tone: fear, guilt, pressure, hype\n- anything confusing or unkind to someone who is struggling\nFor each issue, quote the exact words (briefly), say what the problem is, and suggest a fix. Use "must_fix" only for breaches of the rules; everything else is "consider". If nothing needs changing, return no issues. Give a two-sentence overall view in "overall".\n\nSummary: ${i.excerpt || "none yet"}\nSources listed:\n${i.sources || "none"}\n\n${post()}`;
    case "blog-rewrite": {
      const style = REWRITE_STYLES[i.style as RewriteStyle];
      return `Rewrite the passage below in our voice, ${style.instruction}. Keep its meaning and every fact exactly; don't add facts, claims, statistics or sources. Keep any Markdown formatting (headings, lists, links). Return the rewritten passage in "rewritten", and one short sentence on what you changed in "note".\n\nIt comes from a blog post titled: ${i.title || "untitled"}\n\n<passage>\n${i.passage}\n</passage>`;
    }
    case "image-alt":
      return `Write alt text for this image: what a screen reader reads aloud when it is posted on social media or the website. One sentence, at most 200 characters, describing what matters in the image. If it contains words, include them. Don't start with "Image of" or "Picture of". Also say whether it shows any people (or parts of people, such as hands) and whether it contains any text.`;
  }
  return "";
}

/** Tidy what came back: trim, and keep to the lengths the editor allows. */
export function tidyOutput<K extends TaskKey>(task: K, out: TaskOutput<K>): TaskOutput<K> {
  const cut = (s: string, n: number) => s.trim().slice(0, n);
  switch (task) {
    case "blog-titles": {
      const o = out as TaskOutput<"blog-titles">;
      return { options: o.options.slice(0, 6).map((x) => ({ title: cut(x.title, 120), why: cut(x.why, 300) })) } as TaskOutput<K>;
    }
    case "blog-summary": {
      const o = out as TaskOutput<"blog-summary">;
      return { summary: cut(o.summary, 300), searchDescription: cut(o.searchDescription, 155) } as TaskOutput<K>;
    }
    case "blog-review": {
      const o = out as TaskOutput<"blog-review">;
      return { overall: cut(o.overall, 800), issues: o.issues.slice(0, 25).map((x) => ({ severity: x.severity, quote: cut(x.quote, 400), problem: cut(x.problem, 500), suggestion: cut(x.suggestion, 800) })) } as TaskOutput<K>;
    }
    case "blog-rewrite": {
      const o = out as TaskOutput<"blog-rewrite">;
      return { rewritten: cut(o.rewritten, 6000), note: cut(o.note, 300) } as TaskOutput<K>;
    }
    case "image-alt": {
      const o = out as TaskOutput<"image-alt">;
      return { altText: cut(o.altText, 250), showsPeople: o.showsPeople, hasText: o.hasText } as TaskOutput<K>;
    }
  }
  return out;
}

/** The text a task sends, for the personal-details check. */
export function textOf(input: Record<string, unknown>): string {
  return Object.entries(input)
    .filter(([k, v]) => typeof v === "string" && !k.endsWith("Id"))
    .map(([, v]) => v as string)
    .join("\n");
}
