import * as React from "react";
import { PageWatermark } from "./PageWatermark";

type Aura = "warm" | "teal" | "sage";

const auraVar: Record<Aura, string> = {
  warm: "var(--aura-warm)",
  teal: "var(--aura-teal)",
  sage: "var(--aura-sage)",
};

export function Section({
  id,
  aura = "warm",
  background,
  watermark,
  bleed,
  children,
}: {
  id: string;
  aura?: Aura;
  background?: string;
  watermark?: string;
  /** full-bleed element anchored to the section edges (e.g. a cutout image) */
  bleed?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="snap"
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        background: background ?? "var(--warm-white)",
        display: "flex",
      }}
    >
      <div className="aura-parallax" style={{ zIndex: 0 }}>
        <div className="auraAnim" style={{ backgroundImage: auraVar[aura] }} />
      </div>
      {watermark && <PageWatermark word={watermark} tone={aura === "teal" ? "light" : "dark"} />}
      {bleed}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "120px 48px 110px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
        className="section-inner"
      >
        {children}
      </div>
    </section>
  );
}
