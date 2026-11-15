import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { assetUrl } from "@/lib/library/assets";
import { kindMeta } from "@/lib/library/catalogue";
import { findCollection, getLibrary } from "@/lib/library/manifest";
import { collectionHref, extentOf, LIBRARY_HOME, materialHref, summaryParts } from "@/lib/library/view";
import { BackLink } from "@/components/admin/BackLink";
import { Cover, KindBadge, fileSize, originalType, plural } from "@/components/library/shared";
import { NotPublished } from "@/components/library/NotPublished";

type Params = { params: Promise<{ collection: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { collection } = await params;
  const library = await getLibrary();
  const col = library ? findCollection(library, collection) : null;
  return {
    title: col ? `${col.label ? `${col.label}: ` : ""}${col.title} · Library` : "Resource library",
    robots: { index: false, follow: false },
  };
}

/**
 * One resource and its materials, in the order a session uses them:
 * prepare with the practitioner guide, teach with the slides, explain with
 * the learning guide, practise with the activity worksheet.
 */
export default async function CollectionPage({ params }: Params) {
  const { collection: slug } = await params;
  await requireCapability("library:read", { entity: "library", entityId: slug, action: "view", detail: `opened library resource ${slug}` });
  const library = await getLibrary();
  if (!library) return <NotPublished />;
  const col = findCollection(library, slug);
  if (!col) notFound();

  const series = library.series.find((s) => s.key === col.series);
  const siblings = library.collections.filter((c) => c.series === col.series);
  const at = siblings.findIndex((c) => c.slug === col.slug);
  const prev = at > 0 ? siblings[at - 1] : null;
  const next = at < siblings.length - 1 ? siblings[at + 1] : null;

  const deck = col.materials.find((m) => m.format === "slides");
  const slides = col.materials.filter((m) => m.format === "slides").reduce((n, m) => n + m.pageCount, 0);
  const pages = col.materials.filter((m) => m.format !== "slides").reduce((n, m) => n + m.pageCount, 0);
  const lead = deck ?? col.materials[0];

  return (
    <div className="lib-page">
      <BackLink href={LIBRARY_HOME} label="Resource library" />

      <section className="lib-col-hero card">
        <div className="lib-col-hero-text">
          {series && <span className="eyebrow">{series.title}</span>}
          {col.label && <div className="lib-col-label">{col.label}</div>}
          <h1>{col.title}</h1>
          <Summary summary={col.summary} fallback={series?.blurb ?? null} />
          <p className="lib-col-facts">
            {plural(col.materials.length, "material")}
            {slides > 0 && ` · ${plural(slides, "slide")}`}
            {pages > 0 && ` · ${plural(pages, "page")} to print`}
          </p>
          <div className="lib-actions">
            <Link href={materialHref(col.slug, lead.id)} className="pill pill-teal lib-btn">
              {lead.format === "slides" ? "Open the slides" : `Open the ${kindMeta(lead.kind).label.toLowerCase()}`}
            </Link>
            {deck && lead !== col.materials[0] && (
              <Link href={materialHref(col.slug, col.materials[0].id)} className="lib-btn-quiet">
                Read the {kindMeta(col.materials[0].kind).label.toLowerCase()} first
              </Link>
            )}
          </div>
        </div>
        <Link href={materialHref(col.slug, lead.id)} className={`lib-col-cover${lead.format === "slides" ? "" : " is-portrait"}`} aria-label={`Open ${lead.title}`}>
          <Cover asset={col.cover} alt="" width={640} priority />
        </Link>
      </section>

      {col.onlineWorksheetKey && (
        <aside className="lib-callout">
          <strong>Also online.</strong> Clients can complete this worksheet in their portal: set it from the
          client&apos;s record, and their answers come back to you to review.{" "}
          <Link href={`/admin/resources/worksheets/${col.onlineWorksheetKey}`}>About the online worksheet</Link>
        </aside>
      )}

      <h2 className="lib-h2">Session materials</h2>
      <ol className="lib-steps">
        {col.materials.map((m) => {
          const notes = m.format === "slides" ? m.slides.filter((s) => s.notes).length : 0;
          return (
            <li key={m.id} className="lib-step card">
              <Link href={materialHref(col.slug, m.id)} className={`lib-step-thumb${m.format === "slides" ? "" : " is-portrait"}`} tabIndex={-1} aria-hidden>
                <Cover asset={m.cover} alt="" width={360} />
              </Link>
              <div className="lib-step-body">
                <KindBadge kind={m.kind} step />
                <h3>
                  <Link href={materialHref(col.slug, m.id)}>{m.title}</Link>
                </h3>
                {m.subtitle && <p className="lib-step-sub">{m.subtitle}</p>}
                <p className="lib-step-meta">
                  {extentOf(m)}
                  {m.words > 0 && ` · ${plural(m.words, "word")}`}
                  {notes > 0 && ` · speaker notes`}
                </p>
                <div className="lib-actions">
                  <Link href={materialHref(col.slug, m.id)} className="pill pill-teal lib-btn lib-btn-sm">
                    {m.format === "slides" ? "View slides" : "Read"}
                  </Link>
                  <a href={assetUrl(m.pdf.asset, m.pdf.name)} className="lib-btn-quiet" download>
                    Download PDF <span className="lib-size">{fileSize(m.pdf.bytes)}</span>
                  </a>
                  {m.original.asset !== m.pdf.asset && (
                    <a href={assetUrl(m.original.asset, m.original.name)} className="lib-btn-quiet" download>
                      {originalType(m.original.name)} original <span className="lib-size">{fileSize(m.original.bytes)}</span>
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {(prev || next) && (
        <nav className="lib-pager" aria-label={`Other ${series?.title.toLowerCase() ?? "resources"}`}>
          {prev ? (
            <Link href={collectionHref(prev.slug)} className="lib-pager-link">
              <span className="lib-pager-dir">← Previous</span>
              <span className="lib-pager-title">{prev.label ? `${prev.label}: ` : ""}{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={collectionHref(next.slug)} className="lib-pager-link is-next">
              <span className="lib-pager-dir">Next →</span>
              <span className="lib-pager-title">{next.label ? `${next.label}: ` : ""}{next.title}</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/** The resource's aim in its own words: a sentence, or the bullet list it opens with. */
function Summary({ summary, fallback }: { summary: string | null; fallback: string | null }) {
  const parts = summaryParts(summary);
  if (!parts) return fallback ? <p className="lib-col-summary">{fallback}</p> : null;
  if ("text" in parts) return <p className="lib-col-summary">{parts.text}</p>;
  return (
    <ul className="lib-col-aims">
      {parts.bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}
