import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { getLibrary } from "@/lib/library/manifest";
import { toCards } from "@/lib/library/view";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import { NotPublished } from "@/components/library/NotPublished";

export const metadata: Metadata = { title: "Resource library", robots: { index: false, follow: false } };

/**
 * The resource library: every practitioner guide, teaching presentation and
 * client material, grouped into the resources they belong to and searchable
 * down to a single slide or paragraph.
 */
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await requireCapability("library:read", { entity: "library", action: "view", detail: "opened the resource library" });
  const library = await getLibrary();
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q ?? "").slice(0, 200);

  const cards = library ? toCards(library) : [];
  const materials = cards.reduce((n, c) => n + c.materials.length, 0);

  return (
    <div className="lib-page">
      <header className="lib-hero">
        <span className="eyebrow">Practitioner resources</span>
        <h1>Resource library</h1>
        <p>
          The guides, teaching presentations and client materials for every session — open them here, present the
          slides, or download a copy to print or share.
          {library && (
            <span className="lib-hero-count">
              {" "}
              {cards.length} resources · {materials} materials
            </span>
          )}
        </p>
      </header>

      {library ? (
        <LibraryBrowser series={library.series} cards={cards} searchVersion={library.search} initialQuery={query} />
      ) : (
        <NotPublished />
      )}
    </div>
  );
}
