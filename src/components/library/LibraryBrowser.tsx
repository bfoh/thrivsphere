"use client";

import * as React from "react";
import Link from "next/link";
import { MATERIAL_KINDS, type MaterialKind, type Series, type SeriesKey } from "@/lib/library/catalogue";
import { prepareIndex, queryTokens, search, type CollectionResult, type Hit, type PreparedEntry } from "@/lib/library/search";
import type { SearchIndex } from "@/lib/library/types";
import { collectionHref, lookupFor, materialHref, type CollectionCard } from "@/lib/library/view";
import { Cover, KIND_TONE, KindBadge } from "./shared";

/**
 * Browse the library by series, or search it.
 *
 * The search index (every guide's text, every slide and its speaker notes)
 * is fetched the first time someone starts typing and then searched in the
 * browser, so results change with each key press. The query is kept in the
 * address bar, so a search can be shared or returned to with Back.
 */

const SHORT: Record<MaterialKind, string> = {
  "practitioner-guide": "Guide",
  presentation: "Slides",
  "learning-guide": "Learning guide",
  "activity-worksheet": "Activity",
  "review-form": "Review form",
};

type Props = {
  series: Series[];
  cards: CollectionCard[];
  /** The search index's file name, so the browser can keep its copy until a new build. */
  searchVersion: string;
  initialQuery: string;
};

export function LibraryBrowser({ series, cards, searchVersion, initialQuery }: Props) {
  const [query, setQuery] = React.useState(initialQuery);
  const [seriesFilter, setSeriesFilter] = React.useState<SeriesKey | null>(null);
  const [kindFilter, setKindFilter] = React.useState<MaterialKind | null>(null);
  const [index, setIndex] = React.useState<PreparedEntry[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  // The index is fetched once someone reaches for the search box, or on
  // arrival with ?q= (a shared link, or Back from a result).
  const [wanted, setWanted] = React.useState(initialQuery.trim().length > 0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const lookup = React.useMemo(() => lookupFor(cards), [cards]);
  const bySlug = React.useMemo(() => new Map(cards.map((c) => [c.slug, c])), [cards]);

  React.useEffect(() => {
    if (!wanted || index || failed) return;
    let live = true;
    fetch(`/api/admin/library/search?v=${encodeURIComponent(searchVersion)}`)
      .then((r) => (r.ok ? (r.json() as Promise<SearchIndex>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (live) setIndex(prepareIndex(data.entries));
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [wanted, index, failed, searchVersion]);

  const status = index ? "ready" : failed ? "failed" : wanted ? "loading" : "idle";

  // "/" jumps to the search box, as on most sites with search.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const deferred = React.useDeferredValue(query);
  const trimmed = deferred.trim();

  // Keep the search in the address bar without adding a history entry per key.
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [trimmed]);

  const results: CollectionResult[] | null = React.useMemo(() => {
    if (!trimmed || !index) return null;
    return search(index, trimmed, lookup, { series: seriesFilter, kind: kindFilter }, 40);
  }, [index, trimmed, lookup, seriesFilter, kindFilter]);

  const searching = trimmed.length > 0;
  const visibleSeries = series.filter((s) => !seriesFilter || s.key === seriesFilter);

  return (
    <div>
      <div className="lib-search card">
        <label htmlFor="lib-q" className="visually-hidden">
          Search the library
        </label>
        <span aria-hidden className="lib-search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={inputRef}
          id="lib-q"
          type="search"
          value={query}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search every guide, slide and worksheet — try “breathing”, “ws5” or “values”"
          onChange={(e) => {
            setQuery(e.target.value);
            setWanted(true);
          }}
          onFocus={() => setWanted(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
          className="lib-search-input"
        />
        {query ? (
          <button type="button" className="lib-search-clear" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search">
            ×
          </button>
        ) : (
          <kbd className="lib-kbd" aria-hidden>
            /
          </kbd>
        )}
      </div>

      <div className="lib-filters" role="group" aria-label="Filter the library">
        <FilterRow label="Series">
          <Chip on={!seriesFilter} onClick={() => setSeriesFilter(null)}>
            All
          </Chip>
          {series.map((s) => (
            <Chip key={s.key} on={seriesFilter === s.key} onClick={() => setSeriesFilter(seriesFilter === s.key ? null : s.key)}>
              {s.title}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Material">
          <Chip on={!kindFilter} onClick={() => setKindFilter(null)}>
            All
          </Chip>
          {MATERIAL_KINDS.map((k) => (
            <Chip key={k.kind} on={kindFilter === k.kind} onClick={() => setKindFilter(kindFilter === k.kind ? null : k.kind)} dot={KIND_TONE[k.kind].dot}>
              {k.plural}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <div aria-live="polite" className="visually-hidden">
        {searching && results ? `${results.length} ${results.length === 1 ? "resource matches" : "resources match"}` : ""}
      </div>

      {searching ? (
        <SearchResults
          query={trimmed}
          results={results}
          status={status}
          bySlug={bySlug}
          retry={() => setFailed(false)}
        />
      ) : kindFilter ? (
        <MaterialGrid cards={cards.filter((c) => !seriesFilter || c.series === seriesFilter)} kind={kindFilter} />
      ) : (
        visibleSeries.map((s) => {
          const inSeries = cards.filter((c) => c.series === s.key);
          if (!inSeries.length) return null;
          return (
            <section key={s.key} className="lib-series" aria-labelledby={`series-${s.key}`}>
              <div className="lib-series-head">
                <h2 id={`series-${s.key}`}>{s.title}</h2>
                <p>{s.blurb}</p>
              </div>
              <ul className="lib-grid">
                {inSeries.map((c) => (
                  <li key={c.slug}>
                    <CollectionTile card={c} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lib-filter-row">
      <span className="lib-filter-label">{label}</span>
      <div className="lib-filter-chips">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children, dot }: { on: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button type="button" className={`lib-chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      {dot && <span aria-hidden className="lib-kind-dot" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function CollectionTile({ card }: { card: CollectionCard }) {
  const counts = new Map<MaterialKind, number>();
  for (const m of card.materials) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
  return (
    <Link href={collectionHref(card.slug)} className="lib-tile">
      <span className={card.portrait ? "lib-tile-cover is-portrait" : "lib-tile-cover"}>
        <Cover asset={card.cover} alt="" width={480} />
      </span>
      <span className="lib-tile-body">
        {card.label && <span className="lib-tile-label">{card.label}</span>}
        <span className="lib-tile-title">{card.title}</span>
        {card.summary && <span className="lib-tile-summary">{card.summary}</span>}
        <span className="lib-tile-kinds">
          {[...counts].map(([kind, n]) => (
            <span key={kind} className="lib-mini" style={{ color: KIND_TONE[kind].fg }}>
              <span aria-hidden className="lib-kind-dot" style={{ background: KIND_TONE[kind].dot }} />
              {SHORT[kind]}
              {n > 1 ? ` ×${n}` : ""}
            </span>
          ))}
        </span>
      </span>
    </Link>
  );
}

/** Every material of one kind, across the library: "show me all the slides". */
function MaterialGrid({ cards, kind }: { cards: CollectionCard[]; kind: MaterialKind }) {
  const items = cards.flatMap((c) => c.materials.filter((m) => m.kind === kind).map((m) => ({ c, m })));
  if (!items.length) return <p className="lib-empty">Nothing of this type in the selected series.</p>;
  return (
    <ul className="lib-grid" style={{ marginTop: 8 }}>
      {items.map(({ c, m }) => (
        <li key={`${c.slug}/${m.id}`}>
          <Link href={materialHref(c.slug, m.id)} className="lib-tile">
            <span className={m.format === "slides" ? "lib-tile-cover" : "lib-tile-cover is-portrait"}>
              <Cover asset={m.cover} alt="" width={480} />
            </span>
            <span className="lib-tile-body">
              {c.label && <span className="lib-tile-label">{c.label}</span>}
              <span className="lib-tile-title">{c.title}</span>
              <span className="lib-tile-kinds">
                <KindBadge kind={m.kind} />
                <span className="lib-mini">{m.subtitle ?? (m.title !== MATERIAL_KINDS.find((k) => k.kind === m.kind)?.label ? m.title : m.extent)}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SearchResults({
  query,
  results,
  status,
  bySlug,
  retry,
}: {
  query: string;
  results: CollectionResult[] | null;
  status: "idle" | "loading" | "ready" | "failed";
  bySlug: Map<string, CollectionCard>;
  retry: () => void;
}) {
  if (status === "failed") {
    return (
      <p className="lib-empty">
        Search could not load just now.{" "}
        <button type="button" className="lib-linkbtn" onClick={retry}>
          Try again
        </button>
      </p>
    );
  }
  if (!results) return <p className="lib-empty">Searching…</p>;
  if (!results.length) {
    const tokens = queryTokens(query);
    return (
      <div className="lib-empty">
        <p style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--navy)" }}>Nothing matches “{query}”.</p>
        <p style={{ margin: 0 }}>
          {tokens.length > 1 ? "Every word has to appear, so try fewer words. " : ""}
          You can also search by number — “ws5”, “act 2” — or clear the filters.
        </p>
      </div>
    );
  }
  return (
    <>
      <p className="lib-count">
        {results.length} {results.length === 1 ? "resource matches" : "resources match"} “{query}”
      </p>
      <ol className="lib-results">
        {results.map((r) => {
          const card = bySlug.get(r.slug);
          if (!card) return null;
          const hits = r.hits.filter((h) => h.materialId !== null);
          return (
            <li key={r.slug} className="lib-result card">
              <Link href={collectionHref(card.slug)} className="lib-result-head">
                <span className={card.portrait ? "lib-result-thumb is-portrait" : "lib-result-thumb"}>
                  <Cover asset={card.cover} alt="" width={240} />
                </span>
                <span>
                  {card.label && <span className="lib-tile-label">{card.label}</span>}
                  <span className="lib-result-title">{card.title}</span>
                </span>
              </Link>
              {hits.length > 0 && (
                <ul className="lib-hits">
                  {hits.map((h) => (
                    <HitRow key={`${h.materialId}:${h.at}`} hit={h} card={card} query={query} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function HitRow({ hit, card, query }: { hit: Hit; card: CollectionCard; query: string }) {
  const material = card.materials.find((m) => m.id === hit.materialId);
  if (!material) return null;
  return (
    <li>
      <Link href={materialHref(card.slug, material.id, hit.at, query)} className="lib-hit">
        <span className="lib-hit-top">
          <KindBadge kind={material.kind} />
          <span className="lib-hit-where">{hit.label ?? (material.title !== SHORT[material.kind] ? material.title : null)}</span>
        </span>
        {hit.snippet && (
          <span className="lib-snippet">
            {hit.snippet.map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <React.Fragment key={i}>{s.text}</React.Fragment>))}
          </span>
        )}
      </Link>
    </li>
  );
}
