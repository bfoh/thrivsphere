"use client";

import * as React from "react";
import Image from "next/image";
import { assetUrl } from "@/lib/library/assets";
import type { SlideRef } from "@/lib/library/types";

/**
 * Teaching slides: one at a time with the arrow keys, every slide as a
 * thumbnail, the speaker notes underneath where the deck has them, and a
 * full-screen mode for presenting to a client.
 *
 * The slide number is kept in the address (`?slide=7`), so a link from
 * search opens on the right slide and a refresh stays where you were.
 */

type Props = { slides: SlideRef[]; aspect: number; title: string; initialSlide: number };

/** "EXPLAIN: …" and "SAY: …" lines in the notes start with their label in bold. */
function NotesText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => (
        <p key={i}>
          {block.split("\n").map((line, j) => {
            const m = line.match(/^([A-Z][A-Z0-9 &/'’()-]{1,40}):\s*(.*)$/);
            return (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {m ? (
                  <>
                    <strong>{m[1]}:</strong> {m[2]}
                  </>
                ) : (
                  line
                )}
              </React.Fragment>
            );
          })}
        </p>
      ))}
    </>
  );
}

export function SlideViewer({ slides, aspect, title, initialSlide }: Props) {
  const [index, setIndex] = React.useState(Math.min(Math.max(initialSlide - 1, 0), slides.length - 1));
  const [presenting, setPresenting] = React.useState(false);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const stripRef = React.useRef<HTMLOListElement>(null);
  const count = slides.length;
  const slide = slides[index];
  const hasNotes = slides.some((s) => s.notes);

  const go = React.useCallback((to: number) => setIndex(Math.min(Math.max(to, 0), count - 1)), [count]);

  // Keep ?slide= in the address without adding a history entry per slide.
  React.useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("slide", String(index + 1));
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
    stripRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    // Fetch the neighbours now, so the next slide appears instantly.
    for (const n of [index + 1, index - 1]) {
      if (slides[n]) new window.Image().src = assetUrl(slides[n].image);
    }
  }, [index, slides]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["ArrowRight", "PageDown"].includes(e.key) || (presenting && (e.key === " " || e.key === "Enter"))) {
        e.preventDefault();
        go(index + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key) || (presenting && e.key === "Backspace")) {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(count - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, count, presenting]);

  React.useEffect(() => {
    const onChange = () => setPresenting(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const present = async () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen?.().catch(() => undefined);
  };

  const width = 1920;
  const height = Math.round(width / aspect);

  return (
    <div className="lib-slides" style={{ "--aspect": String(aspect) } as React.CSSProperties}>
      <div
        ref={stageRef}
        className={`lib-stage${presenting ? " is-presenting" : ""}`}
        onClick={(e) => {
          if (!presenting) return;
          const box = e.currentTarget.getBoundingClientRect();
          go(e.clientX - box.left < box.width / 3 ? index - 1 : index + 1);
        }}
      >
        <div className="lib-stage-frame" style={{ aspectRatio: String(aspect) }}>
          <Image
            key={slide.image}
            src={assetUrl(slide.image)}
            alt={`Slide ${index + 1} of ${count}${slide.title ? `: ${slide.title}` : ""}`}
            width={width}
            height={height}
            unoptimized
            priority
            draggable={false}
          />
        </div>
        {!presenting && (
          <>
            <button type="button" className="lib-stage-nav is-prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
              ‹
            </button>
            <button type="button" className="lib-stage-nav is-next" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label="Next slide">
              ›
            </button>
          </>
        )}
        {presenting && (
          <span className="lib-stage-count" aria-hidden>
            {index + 1} / {count}
          </span>
        )}
      </div>

      <div className="lib-stage-bar">
        <span className="lib-stage-pos" aria-live="polite">
          <strong>
            Slide {index + 1} of {count}
          </strong>
          {slide.title && <span className="lib-stage-title"> · {slide.title}</span>}
        </span>
        <span className="lib-stage-actions">
          <span className="lib-hint">← → to move</span>
          <button type="button" className="pill pill-teal lib-btn lib-btn-sm" onClick={present}>
            Present full screen
          </button>
        </span>
      </div>

      <ol ref={stripRef} className="lib-strip" aria-label={`${title}: all slides`}>
        {slides.map((s, i) => (
          <li key={s.thumb}>
            <button
              type="button"
              data-i={i}
              className={`lib-thumb${i === index ? " is-current" : ""}`}
              aria-current={i === index ? "true" : undefined}
              aria-label={`Slide ${i + 1}${s.title ? `: ${s.title}` : ""}`}
              title={s.title ?? `Slide ${i + 1}`}
              onClick={() => go(i)}
            >
              <span className="lib-thumb-img" style={{ aspectRatio: String(aspect) }}>
                <Image src={assetUrl(s.thumb)} alt="" width={400} height={Math.round(400 / aspect)} unoptimized />
              </span>
              <span className="lib-thumb-n">{i + 1}</span>
            </button>
          </li>
        ))}
      </ol>

      {hasNotes && (
        <section className="lib-notes card" aria-labelledby="lib-notes-h">
          <h2 id="lib-notes-h">
            Speaker notes <span>· slide {index + 1}</span>
          </h2>
          {slide.notes ? <NotesText text={slide.notes} /> : <p className="lib-notes-none">No notes for this slide.</p>}
        </section>
      )}
    </div>
  );
}
