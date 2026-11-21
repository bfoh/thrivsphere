/**
 * Readers' comments: what a comment must be, and what the moderator is told.
 *
 * Pure, so it can be tested on its own. Every comment is held until a member
 * of staff approves it. The checks here never refuse a comment for what it
 * says; they put the ones that suggest someone may be at risk at the top of
 * the queue and tell staff, and point out anything that would identify
 * someone if it were published.
 */

export const COMMENT_LIMITS = { name: 40, body: 2000, minBody: 3 };

export type CommentInput = { name: string; email: string; body: string; agreed: boolean };
export type ParsedComment = { name: string; email: string; body: string };

export type CommentErrors = Partial<Record<"name" | "email" | "body" | "agreed", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_LIKE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|co\.uk|uk|io|info|biz|ru|xyz)\b/i;

export function parseComment(input: CommentInput): { ok: true; value: ParsedComment } | { ok: false; errors: CommentErrors } {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const body = input.body.replace(/\r\n/g, "\n").trim().replace(/\n{3,}/g, "\n\n");
  const errors: CommentErrors = {};

  if (!name) errors.name = "Add a first name or nickname.";
  else if (name.length > COMMENT_LIMITS.name) errors.name = `Keep it under ${COMMENT_LIMITS.name} characters.`;
  else if (URL_LIKE.test(name) || name.includes("@")) errors.name = "Use a name rather than a web or email address.";

  if (!email) errors.email = "Add your email address. It's never shown.";
  else if (!EMAIL.test(email) || email.length > 200) errors.email = "Check your email address.";

  if (body.length < COMMENT_LIMITS.minBody) errors.body = "Write your comment.";
  else if (body.length > COMMENT_LIMITS.body) errors.body = `Keep it under ${COMMENT_LIMITS.body.toLocaleString("en-GB")} characters.`;

  if (!input.agreed) errors.agreed = "Please confirm you understand comments are public once approved.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, email, body } };
}

/** A check that notices something. `urgent` ones mean the writer may be at risk. */
type Check = { flag: string; urgent: boolean; pattern: RegExp };

const CHECKS: Check[] = [
  {
    flag: "Mentions suicide or ending their life",
    urgent: true,
    pattern:
      /\bsuicid|\bkill(?:ing)? my ?self\b|\bend(?:ing)? (?:my|it all|my own) ?life\b|\bend it all\b|\bwant(?:ed)? to die\b|\bbetter off (?:dead|without me)\b|\bno (?:reason|point) (?:to|in) (?:live|living|go on|going on)\b|\bcan'?t go on\b|\btake my (?:own )?life\b/i,
  },
  { flag: "Mentions self-harm", urgent: true, pattern: /\bself[- ]?harm|\bcut(?:ting)? my ?self\b|\bhurt(?:ing)? my ?self\b|\boverdos/i },
  {
    flag: "May not be safe from someone else",
    urgent: true,
    pattern: /\b(?:he|she|they|my (?:partner|husband|wife|boyfriend|girlfriend|ex)) (?:hits?|beats?|hurts?|threatens?|chokes?|strangles?) me\b|\bnot safe (?:at home|with (?:him|her|them))\b|\bscared (?:of|for) my life\b|\bafraid (?:he|she|they)(?:'ll| will) (?:hurt|kill)\b/i,
  },
  { flag: "Contains a phone number", urgent: false, pattern: /(?:\+44\s?|\b0)\d[\d\s-]{8,12}\d\b/ },
  { flag: "Contains an email address", urgent: false, pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { flag: "Contains a link", urgent: false, pattern: URL_LIKE },
  {
    flag: "Names a practitioner or describes sessions",
    urgent: false,
    pattern: /\bmy (?:session|practitioner|therapist|counsell?or)\b|\bat thrive ?sphere\b/i,
  },
];

export function commentFlags(body: string): { flags: string[]; needsAttention: boolean } {
  const hits = CHECKS.filter((c) => c.pattern.test(body));
  return { flags: hits.map((c) => c.flag), needsAttention: hits.some((c) => c.urgent) };
}

/** What a reader is told after sending. Help routes come first when the comment suggests risk. */
export function thankYou(needsAttention: boolean): string {
  return needsAttention
    ? "Thank you for sharing this. Comments are read by our team before they appear, but not straight away. If you're struggling right now, please call Samaritans free on 116 123, any time, or 999 if you're in danger."
    : "Thank you. Your comment will appear once our team has approved it.";
}

/** "3 likes", "1 like". */
export const likesLabel = (n: number) => `${n.toLocaleString("en-GB")} ${n === 1 ? "like" : "likes"}`;
export const commentsLabel = (n: number) => `${n.toLocaleString("en-GB")} ${n === 1 ? "comment" : "comments"}`;
