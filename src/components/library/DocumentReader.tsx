"use client";

import * as React from "react";
import { queryTokens } from "@/lib/library/search";
import type { DocSection } from "@/lib/library/types";

/**
 * A Word document, shown as the owner laid it out, with its contents beside
 * it and a find box that highlights every match. Opened from a search result,
 * the words searched for are already highlighted and the page is at the
 * first match in the section that was found.
 *
 * The document's HTML was built from the owner's file at publish time and
 * every piece of its text escaped then; it is placed as given and never
 * re-rendered, so the highlights added here are safe to add and remove.
 */

type Props = {
  html: string;
  contents: DocSection[];
  columnInches: number;
  header: string | null;
  footer: string | null;
  initialQuery: string;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches each searched word at the start of a word, as the library search does. */
function matcher(query: string): RegExp | null {
  const tokens = queryTokens(query).filter((t) => t.length > 1 || /\d/.test(t));
  if (!tokens.length) return null;
  const parts = tokens.map((t) => (/^\d+$/.test(t) ? `${t}(?!\\d)` : `${escapeRe(t)}[\\p{L}\\p{N}]*`));
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join("|")})`, "giu");
}

function clearMarks(root: HTMLElement) {
  const marks = root.querySelectorAll("mark.lib-find");
  const parents = new Set<Node>();
  marks.forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
    parents.add(parent);
  });
  parents.forEach((p) => p.normalize());
}

function markAll(root: HTMLElement, re: RegExp): HTMLElement[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  const marks: HTMLElement[] = [];
  for (const node of nodes) {
    const text = node.data;
    re.lastIndex = 0;
    const found = [...text.matchAll(re)];
    if (!found.length) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const m of found) {
      const start = m.index ?? 0;
      if (start > pos) frag.append(text.slice(pos, start));
      const mark = document.createElement("mark");
      mark.className = "lib-find";
      mark.textContent = m[0];
      frag.append(mark);
      marks.push(mark);
      pos = start + m[0].length;
    }
    if (pos < text.length) frag.append(text.slice(pos));
    node.parentNode?.replaceChild(frag, node);
  }
  return marks;
}

export function DocumentReader({ html, contents, columnInches, header, footer, initialQuery }: Props) {
  const docRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState(initialQuery);
  const [marks, setMarks] = React.useState<HTMLElement[]>([]);
  const [current, setCurrent] = React.useState(0);
  const [active, setActive] = React.useState<string | null>(null);
  const arrived = React.useRef(false);

  // Highlight matches whenever the query changes.
  React.useEffect(() => {
    const root = docRef.current;
    if (!root) return;
    const timer = window.setTimeout(() => {
      clearMarks(root);
      const re = query.trim() ? matcher(query) : null;
      const found = re ? markAll(root, re) : [];
      setMarks(found);

      let first = 0;
      if (!arrived.current) {
        // Arriving from search: start at the first match in the section that was found.
        arrived.current = true;
        const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
        if (target && found.length) {
          const after = found.findIndex((m) => target === m || !!(target.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING));
          first = after === -1 ? 0 : after;
        } else if (target) {
          target.scrollIntoView({ block: "start" });
        }
      }
      setCurrent(first);
      if (found.length && query.trim()) found[first].scrollIntoView({ block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    marks.forEach((m, i) => m.classList.toggle("is-current", i === current));
  }, [marks, current]);

  const go = (step: number) => {
    if (!marks.length) return;
    const next = (current + step + marks.length) % marks.length;
    setCurrent(next);
    marks[next].scrollIntoView({ block: "center", behavior: "smooth" });
  };

  // Which section is on screen, for the contents panel.
  React.useEffect(() => {
    if (!contents.length) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let id: string | null = null;
        for (const s of contents) {
          const el = document.getElementById(s.id);
          if (el && el.getBoundingClientRect().top < 140) id = s.id;
        }
        setActive(id);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [contents]);

  // Cmd/Ctrl+F goes to this find box: it searches the document, not the page around it.
  const findRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        findRef.current?.focus();
        findRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="lib-reader">
      <aside className="lib-side">
        <div className="lib-find-box">
          <label htmlFor="lib-find" className="visually-hidden">
            Find in this document
          </label>
          <input
            ref={findRef}
            id="lib-find"
            type="search"
            value={query}
            placeholder="Find in this document"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                go(e.shiftKey ? -1 : 1);
              } else if (e.key === "Escape") setQuery("");
            }}
          />
          {query.trim() && (
            <div className="lib-find-nav">
              <span aria-live="polite">{marks.length ? `${current + 1} of ${marks.length}` : "No matches"}</span>
              <button type="button" onClick={() => go(-1)} disabled={!marks.length} aria-label="Previous match">
                ↑
              </button>
              <button type="button" onClick={() => go(1)} disabled={!marks.length} aria-label="Next match">
                ↓
              </button>
            </div>
          )}
        </div>

        {contents.length > 0 && (
          <details className="lib-toc" open>
            <summary>Contents</summary>
            <ol>
              {contents.map((s) => (
                <li key={s.id} className={`lvl-${s.level}${active === s.id ? " is-active" : ""}`}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </details>
        )}
      </aside>

      <article className="lib-paper" style={{ ["--col" as string]: `${columnInches}in` }}>
        {header && <div className="lib-paper-margin">{header}</div>}
        <div ref={docRef} dangerouslySetInnerHTML={{ __html: html }} />
        {footer && <div className="lib-paper-margin is-foot">{footer}</div>}
      </article>
    </div>
  );
}
