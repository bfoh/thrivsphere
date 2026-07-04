export type HLPart = {
  t: string;
  size: number;
  weight?: number;
  italic?: boolean;
  color: string;
};

/**
 * Reference-style "fancy headline": flowing lines of mixed spans —
 * small italic accent words + giant caps words — for a distinctive,
 * non-generic heading.
 */
export function FancyHeadline({ lines }: { lines: HLPart[][] }) {
  return (
    <h2 className="fancyHL">
      {lines.map((line, li) => (
        <span className="fancyHL-line" key={li}>
          {line.map((p, i) => {
            // fluid size: scales down on small screens, capped at the design size
            const min = Math.round(p.size * 0.62);
            const vw = (p.size / 5.4).toFixed(1);
            return (
              <span
                key={i}
                style={{
                  fontSize: `clamp(${min}px, ${vw}vw, ${p.size}px)`,
                  fontWeight: p.weight ?? 900,
                  fontStyle: p.italic ? "italic" : "normal",
                  color: p.color,
                  lineHeight: 0.98,
                }}
              >
                {p.t}
              </span>
            );
          })}
        </span>
      ))}
    </h2>
  );
}
