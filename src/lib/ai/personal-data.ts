/**
 * Nothing about clients, or anyone's contact details, is sent to an AI.
 *
 * A check on the text before any request. It errs towards stopping: staff
 * can take the detail out and try again. Helpline numbers (0800, 116 123)
 * and ThriveSphere's own addresses are allowed; mobiles and other people's
 * email addresses are not.
 */
import { brand } from "../../data/site";

const OWN_EMAILS = ["@thrivsphere.org", brand.email.toLowerCase()];

const CHECKS: { pattern: RegExp; what: string; allow?: (match: string) => boolean }[] = [
  { pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, what: "an email address", allow: (m) => OWN_EMAILS.some((o) => m.toLowerCase().endsWith(o)) },
  { pattern: /(?:\+44\s?7|\b07)\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g, what: "a mobile phone number" },
  { pattern: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, what: "what looks like an NHS number", allow: (m) => /^0[0-9]/.test(m) },
  { pattern: /\b(?:my|our|a|one of (?:my|our))\s+clients?\b(?:\s+(?:called|named|who|told|said|was|is|has|had))?/gi, what: "something about a client", allow: (m) => /^(?:a|our)\s+clients?$/i.test(m.trim()) },
  { pattern: /\bclient'?s?\s+name\b|\bdate of birth\b|\bDOB\b/gi, what: "personal details" },
];

/** The first kind of personal detail found, or null if the text looks clear. */
export function personalDataFound(text: string): string | null {
  for (const c of CHECKS) {
    for (const m of text.matchAll(c.pattern)) {
      if (!c.allow?.(m[0])) return c.what;
    }
  }
  return null;
}
