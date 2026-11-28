import type { Metadata } from "next";
import { policies } from "@/data/policies";

/**
 * Search metadata for a policy page: its own title, its own description (the
 * policy's opening paragraph, in the owner's words) and its own canonical
 * address.
 *
 * Every public page must name itself as canonical. A page that names another
 * address — as all of them once named the homepage, through the root layout —
 * tells Google it is a duplicate of that address, and it is left out of search.
 */
export function policyMetadata(slug: string): Metadata {
  const p = policies[slug];
  return {
    title: p.title,
    description: p.intro,
    alternates: { canonical: `/${slug}` },
  };
}
