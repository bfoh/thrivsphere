/**
 * How people found ThriveSphere.
 *
 * Two sources, neither of which stores anything on the visitor's device:
 *  - what they tell us ("How did you hear about us?", optional), and
 *  - the tracking tags on the link they arrived by (utm_source and friends),
 *    read from the address of the form page itself.
 *
 * Campaign links therefore point straight at /book or /contact so the tags are
 * still in the address when the form is sent. Pure, so it can be tested alone.
 */

export const HEARD_VIA = [
  ["search_engine", "Search engine (e.g. Google)"],
  ["google_maps", "Google Maps"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["linkedin", "LinkedIn"],
  ["blog", "An article on our blog"],
  ["newsletter", "Our newsletter"],
  ["friend_or_family", "A friend or family member"],
  ["employer_or_hr", "My employer or HR"],
  ["health_professional", "A GP or health professional"],
  ["event_or_talk", "An event or talk"],
  ["other", "Somewhere else"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

export type HeardVia = (typeof HEARD_VIA)[number][0];

const HEARD_VIA_KEYS = new Set<string>(HEARD_VIA.map(([k]) => k));
export const heardViaLabel = (k: string | null | undefined) => HEARD_VIA.find(([key]) => key === k)?.[1] ?? null;

export const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

/** Tags are lower-case words: anything else is dropped rather than stored. */
export function sanitiseUtm(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase().replace(/[\s+]+/g, "-");
  if (!v || v.length > 64 || !/^[a-z0-9_.-]+$/.test(v)) return null;
  return v;
}

/** A path on this site, without its query: "/book", "/blog/three-minutes-of-calm". */
export function sanitisePath(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.length > 200) return null;
  const path = v.split(/[?#]/)[0];
  return /^\/[A-Za-z0-9/_.-]*$/.test(path) ? path : null;
}

/** The site someone came from, if it wasn't this one: "www.instagram.com" → "instagram.com". */
export function referrerHost(referrer: string | null | undefined, ownHost: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "").replace(/^l\.|^lm\.|^m\./, "");
    const own = (ownHost ?? "").toLowerCase().replace(/^www\./, "").split(":")[0];
    if (!host || host === own || host === "localhost") return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

export type Attribution = {
  heardVia: HeardVia | null;
  heardViaDetail: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  landingPath: string | null;
  referrerHost: string | null;
};

/**
 * Read the attribution fields a form sent. Returns null when there is
 * nothing worth keeping, so most enquiries without tags add no row.
 */
export function parseAttribution(get: (name: string) => string, ownHost?: string | null): Attribution | null {
  const raw = get("heardVia");
  const heardVia = HEARD_VIA_KEYS.has(raw) ? (raw as HeardVia) : null;
  const detail = heardVia === "other" ? get("heardViaDetail").trim().replace(/\s+/g, " ").slice(0, 80) || null : null;
  const a: Attribution = {
    heardVia,
    heardViaDetail: detail,
    utmSource: sanitiseUtm(get("utm_source")),
    utmMedium: sanitiseUtm(get("utm_medium")),
    utmCampaign: sanitiseUtm(get("utm_campaign")),
    utmContent: sanitiseUtm(get("utm_content")),
    landingPath: sanitisePath(get("landingPath")),
    referrerHost: referrerHost(get("referrer"), ownHost),
  };
  const worthKeeping = a.heardVia || a.utmSource || a.utmMedium || a.utmCampaign || a.utmContent || a.referrerHost;
  return worthKeeping ? a : null;
}

/** "Instagram · campaign spring-calm (instagram / social)". For staff screens. */
export function describeAttribution(a: Partial<Attribution> | null | undefined): string | null {
  if (!a) return null;
  const parts: string[] = [];
  const heard = heardViaLabel(a.heardVia);
  if (heard) parts.push(a.heardVia === "other" && a.heardViaDetail ? `${heard}: ${a.heardViaDetail}` : heard);
  const tags = [a.utmSource, a.utmMedium].filter(Boolean).join(" / ");
  if (a.utmCampaign) parts.push(`campaign ${a.utmCampaign}${tags ? ` (${tags})` : ""}`);
  else if (tags) parts.push(`link tagged ${tags}`);
  if (a.referrerHost) parts.push(`came from ${a.referrerHost}`);
  return parts.length ? parts.join(" · ") : null;
}
