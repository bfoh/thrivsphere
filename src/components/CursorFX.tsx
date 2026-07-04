"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor highlight — exact replica of the reference site's cursorHighlight:
 * a 75px translucent disc + white ring that trails the pointer with a soft lag,
 * grows when hovering interactive elements, and publishes a normalised pointer
 * offset (--mx/--my) for gentle background parallax.
 * Disabled for coarse pointers and reduced-motion users.
 */
export function CursorFX() {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduce) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: target.x, y: target.y };
    let raf = 0;
    const root = document.documentElement;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const el = wrap.current;
      if (el) {
        const interactive = (e.target as Element | null)?.closest(
          'a,button,[role="button"],input,select,textarea,summary,label,.chip,details'
        );
        el.classList.toggle("is-active", !!interactive);
      }
    };

    const tick = () => {
      // soft trailing lag, like the reference orb
      pos.x = lerp(pos.x, target.x, 0.18);
      pos.y = lerp(pos.y, target.y, 0.18);
      if (wrap.current) {
        wrap.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      }
      root.style.setProperty("--mx", ((target.x / window.innerWidth - 0.5) * 2).toFixed(3));
      root.style.setProperty("--my", ((target.y / window.innerHeight - 0.5) * 2).toFixed(3));
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, []);

  return (
    <div ref={wrap} className="cursorFX" aria-hidden>
      <div className="cursorFX-disc" />
      <div className="cursorFX-ring" />
    </div>
  );
}
