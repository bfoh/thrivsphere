"use client";

import * as React from "react";

/**
 * The client record's section bar. It stays under the top bar as you scroll
 * and lights up the section you're reading, so a long record never leaves you
 * wondering where you are or how to get back to the notes.
 *
 * Plain links to anchors, so it works before scripts load and the browser's
 * back button returns to where you were.
 */
export function RecordNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = React.useState(items[0]?.id);
  const bar = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // The section whose top has passed just under the bars is the one being read.
      const line = (bar.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let current = items[0]?.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }
      // At the very bottom, the last section counts even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = items[items.length - 1]?.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  // Keep the lit-up link in view when the bar scrolls sideways on a phone.
  React.useEffect(() => {
    const link = bar.current?.querySelector<HTMLElement>('[aria-current="location"]');
    const strip = bar.current;
    if (!link || !strip) return;
    const l = link.offsetLeft;
    const r = l + link.offsetWidth;
    if (l < strip.scrollLeft || r > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: l - 16, behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav ref={bar} className="adm-recordnav no-print" aria-label="Sections of this record">
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} aria-current={item.id === active ? "location" : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
