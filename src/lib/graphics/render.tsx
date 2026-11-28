import "server-only";

import * as React from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { BrandKit } from "@/lib/brand-kit";
import { BRAND_COLOURS } from "@/lib/brand-tokens";
import { SIZES, fitFontSize, isLandscape, scaleFor, themeColours, type GraphicInput } from "./spec";

/**
 * Draws a template as a PNG with the brand's fonts and colours.
 *
 * The renderer understands flexbox only, so every box with more than one
 * child says `display: flex`. Fonts and the logo are read from disk once
 * (next.config.ts makes sure they are deployed with the routes that use them).
 */

type Font = { name: string; data: ArrayBuffer; weight: 500 | 600 | 700 | 800; style: "normal" };

const FONT_FILES: [string, Font["weight"]][] = [
  ["Montserrat-Medium.ttf", 500],
  ["Montserrat-SemiBold.ttf", 600],
  ["Montserrat-Bold.ttf", 700],
  ["Montserrat-ExtraBold.ttf", 800],
];

let fonts: Promise<Font[]> | null = null;
let logoImage: Promise<string> | null = null;

const toArrayBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export function brandFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    FONT_FILES.map(async ([file, weight]) => ({
      name: "Montserrat",
      data: toArrayBuffer(await readFile(join(process.cwd(), "src/assets/fonts", file))),
      weight,
      style: "normal" as const,
    }))
  );
  return fonts;
}

/** The full horizontal logo (symbol, "ThriveSphere", "MENTAL WELLBEING"), 2154 × 512. */
export function logoDataUrl(): Promise<string> {
  logoImage ??= readFile(join(process.cwd(), "public/images/logo/thrivesphere-logo.png")).then((b) => `data:image/png;base64,${b.toString("base64")}`);
  return logoImage;
}

const LOGO_ASPECT = 2154 / 512;

/** Everything a template needs, already looked up. */
export type ResolvedGraphic = {
  input: GraphicInput;
  kit: BrandKit;
  photo?: string | null;
  service?: { title: string; summary: string } | null;
  post?: { title: string; category: string; cover: string | null } | null;
};

export async function renderGraphic(r: ResolvedGraphic): Promise<Uint8Array> {
  const { width, height } = SIZES[r.input.size];
  const [loaded, logo] = await Promise.all([brandFonts(), logoDataUrl()]);
  const response = new ImageResponse(<Graphic r={r} logo={logo} />, { width, height, fonts: loaded });
  // Drawing happens when the body is read, so errors surface here.
  return new Uint8Array(await response.arrayBuffer());
}

/** A plain image for link previews (Open Graph), in the same style. */
export async function renderCard(o: { eyebrow: string; headline: string; body?: string; photo?: string | null; kit: BrandKit }) {
  return renderGraphic({
    input: { template: o.photo ? "photo" : "tip", size: "facebook", theme: "navy", values: { eyebrow: o.eyebrow, headline: o.headline, body: o.body ?? "", caption: o.headline } },
    kit: o.kit,
    photo: o.photo ?? null,
  });
}

// ---------------------------------------------------------------------------

function Graphic({ r, logo }: { r: ResolvedGraphic; logo: string }) {
  const { input } = r;
  const v = input.values;
  switch (input.template) {
    case "tip":
      return <TextLayout r={r} logo={logo} eyebrow={v.eyebrow} headline={v.headline} body={v.body} />;
    case "slide":
      return <TextLayout r={r} logo={logo} eyebrow={`Step ${v.number} of ${v.total}`} badge={v.number} headline={v.headline} body={v.body} />;
    case "awareness":
      return <TextLayout r={r} logo={logo} eyebrow={v.date} headline={v.day} body={v.message} crisis={r.kit.boilerplates.crisisLine} />;
    case "service":
      return <TextLayout r={r} logo={logo} eyebrow="Our services" headline={r.service?.title ?? ""} body={v.line || r.service?.summary} cta={v.cta} />;
    case "announcement":
      return <TextLayout r={r} logo={logo} eyebrow={v.eyebrow} headline={v.headline} when={v.when} body={v.details} cta={v.cta} />;
    case "photo":
      return <PhotoLayout r={r} logo={logo} photo={r.photo ?? null} headline={v.caption ?? v.headline} eyebrow={v.eyebrow} />;
    case "blog":
      return r.post?.cover ? (
        <PhotoLayout r={r} logo={logo} photo={r.post.cover} eyebrow={r.post.category} headline={r.post.title} footnote="Read it on our blog" />
      ) : (
        <TextLayout r={r} logo={logo} eyebrow={r.post?.category} headline={r.post?.title ?? ""} body="New on the ThriveSphere blog" />
      );
  }
}

type Layout = { r: ResolvedGraphic; logo: string; eyebrow?: string; headline: string; body?: string; when?: string; cta?: string; crisis?: string; badge?: string; footnote?: string };

function TextLayout({ r, logo, eyebrow, headline, body, when, cta, crisis, badge }: Layout) {
  const { width, height } = SIZES[r.input.size];
  const u = scaleFor(r.input.size);
  const c = themeColours(r.input.theme);
  const pad = 84 * u;
  // Instagram covers the top and bottom of a story with its own controls.
  const padY = r.input.size === "story" ? 250 : pad;
  const inner = width - pad * 2;
  const footer = 110 * u;
  const extras = (eyebrow ? 70 * u : 0) + (when ? 70 * u : 0) + (cta ? 110 * u : 0) + (crisis ? 150 * u : 0) + (badge ? 140 * u : 0);
  const room = height - padY * 2 - footer - extras;
  const headH = body ? room * 0.56 : room * 0.9;
  const bodyH = room * 0.36;
  const headSize = fitFontSize(headline, { width: inner, height: headH, max: 96 * u, min: 40 * u, lineHeight: 1.15, charWidth: 0.62 });
  const bodySize = body ? fitFontSize(body, { width: inner, height: bodyH, max: 42 * u, min: 26 * u, lineHeight: 1.45, charWidth: 0.56 }) : 0;

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: c.background, padding: `${padY}px ${pad}px`, fontFamily: "Montserrat", position: "relative" }}>
      <Decor u={u} accent={c.dark ? BRAND_COLOURS.teal : c.accent} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {badge && (
          <div style={{ display: "flex", width: 120 * u, height: 120 * u, borderRadius: 9999, background: BRAND_COLOURS.gold, color: BRAND_COLOURS.navy, alignItems: "center", justifyContent: "center", fontSize: 64 * u, fontWeight: 800, marginBottom: 28 * u }}>
            {badge}
          </div>
        )}
        {eyebrow && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 26 * u }}>
            <div style={{ display: "flex", width: 56 * u, height: 6 * u, borderRadius: 9999, background: c.accent, marginRight: 18 * u }} />
            <div style={{ display: "flex", fontSize: 28 * u, fontWeight: 700, letterSpacing: 3 * u, color: c.eyebrow, textTransform: "uppercase" }}>{eyebrow}</div>
          </div>
        )}
        <div style={{ display: "flex", fontSize: headSize, fontWeight: 800, lineHeight: 1.15, color: c.heading, letterSpacing: -0.5 * u }}>{headline}</div>
        {when && <div style={{ display: "flex", marginTop: 26 * u, fontSize: 34 * u, fontWeight: 700, color: c.heading }}>{when}</div>}
        {body && <div style={{ display: "flex", marginTop: 30 * u, fontSize: bodySize, fontWeight: 500, lineHeight: 1.45, color: c.body, whiteSpace: "pre-wrap" }}>{body}</div>}
        {cta && (
          <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 40 * u, padding: `${18 * u}px ${34 * u}px`, borderRadius: 9999, background: BRAND_COLOURS.gold, color: BRAND_COLOURS.navy, fontSize: 30 * u, fontWeight: 800 }}>
            {cta}
          </div>
        )}
        {crisis && (
          <div style={{ display: "flex", marginTop: 36 * u, padding: `${20 * u}px ${28 * u}px`, borderRadius: 20 * u, background: BRAND_COLOURS.white, color: BRAND_COLOURS.navy, fontSize: 25 * u, fontWeight: 600, lineHeight: 1.4, border: `${2 * u}px solid ${c.accent}` }}>
            {crisis}
          </div>
        )}
      </div>
      <Footer u={u} logo={logo} kit={r.kit} colour={c.body} outline={!c.dark} />
    </div>
  );
}

function PhotoLayout({ r, logo, photo, eyebrow, headline, footnote }: Layout & { photo: string | null }) {
  const { width, height } = SIZES[r.input.size];
  const u = scaleFor(r.input.size);
  const c = themeColours(r.input.theme);
  const side = isLandscape(r.input.size);
  const pad = 64 * u;
  const photoW = side ? Math.round(width * 0.52) : width;
  const photoH = side ? height : Math.round(height * (r.input.size === "story" ? 0.62 : 0.6));
  const panelW = side ? width - photoW : width;
  const panelH = side ? height : height - photoH;
  const textH = panelH - pad * 2 - 100 * u - (eyebrow ? 60 * u : 0) - (footnote ? 50 * u : 0);
  const size = fitFontSize(headline, { width: panelW - pad * 2, height: textH, max: 64 * u, min: 30 * u, lineHeight: 1.2, charWidth: 0.6 });

  return (
    <div style={{ width, height, display: "flex", flexDirection: side ? "row" : "column", background: c.background, fontFamily: "Montserrat" }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={photoW} height={photoH} style={{ width: photoW, height: photoH, objectFit: "cover", objectPosition: "50% 25%" }} />
      ) : (
        <div style={{ display: "flex", width: photoW, height: photoH, background: BRAND_COLOURS.sage }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", width: panelW, height: panelH, padding: pad, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow && <div style={{ display: "flex", fontSize: 26 * u, fontWeight: 700, letterSpacing: 3 * u, color: c.eyebrow, textTransform: "uppercase", marginBottom: 18 * u }}>{eyebrow}</div>}
          <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.2, color: c.heading }}>{headline}</div>
          {footnote && <div style={{ display: "flex", marginTop: 18 * u, fontSize: 26 * u, fontWeight: 600, color: c.body }}>{footnote}</div>}
        </div>
        <Footer u={u} logo={logo} kit={r.kit} colour={c.body} outline={!c.dark} compact />
      </div>
    </div>
  );
}

function Decor({ u, accent }: { u: number; accent: string }) {
  return (
    <>
      <div style={{ position: "absolute", right: -170 * u, top: -170 * u, width: 520 * u, height: 520 * u, borderRadius: 9999, background: accent, opacity: 0.16, display: "flex" }} />
      <div style={{ position: "absolute", left: -140 * u, bottom: -220 * u, width: 440 * u, height: 440 * u, borderRadius: 9999, background: accent, opacity: 0.1, display: "flex" }} />
    </>
  );
}

function Footer({ u, logo, colour, compact = false, outline = false }: { u: number; logo: string; kit: BrandKit; colour: string; compact?: boolean; outline?: boolean }) {
  const k = compact ? 0.85 : 1;
  const h = 56 * u * k;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 36 * u }}>
      <div style={{ display: "flex", alignItems: "center", background: BRAND_COLOURS.white, borderRadius: 9999, padding: `${12 * u * k}px ${28 * u * k}px ${12 * u * k}px ${20 * u * k}px`, border: outline ? `${1.5 * u}px solid rgba(31,58,95,0.14)` : "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={h * LOGO_ASPECT} height={h} />
      </div>
      {!compact && <div style={{ display: "flex", fontSize: 25 * u, fontWeight: 600, color: colour }}>thrivsphere.org</div>}
    </div>
  );
}
