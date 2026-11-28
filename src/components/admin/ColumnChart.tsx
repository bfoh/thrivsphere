import * as React from "react";
import { labelledColumns, niceScale } from "@/lib/chart";

/**
 * A column chart drawn in HTML and CSS on the server: no chart library and no
 * script, so it prints, works before anything loads and costs nothing.
 *
 * - One or two series. Two get a legend; one is named by the card's title.
 * - Each column is a hover and keyboard target with a tooltip listing every
 *   series, so nobody has to aim at a thin bar.
 * - Values are printed only on the latest and the highest column. The full
 *   figures sit in a table under the chart, so nothing depends on hovering.
 * - Colours are the chart palette in admin.css (checked for colour-blind
 *   separation and contrast), never the text colours.
 */
export type ChartColumn = {
  key: string;
  /** Under the column: "Nov". */
  label: string;
  /** In the tooltip and table: "November 2026". */
  fullLabel: string;
  values: number[];
  /** Figures for `extra`, in the tooltip and table but not drawn. */
  extras?: number[];
  /** The period being looked at, picked out under the axis. */
  current?: boolean;
};

export function ColumnChart({
  label,
  series,
  extra = [],
  columns,
  format,
  axisFormat = format,
  integer = false,
  height = 220,
}: {
  /** What the chart shows, for screen readers: "Settled income by month". */
  label: string;
  series: string[];
  /** Names of figures shown in the tooltip and table only. */
  extra?: string[];
  columns: ChartColumn[];
  format: (n: number) => string;
  axisFormat?: (n: number) => string;
  integer?: boolean;
  height?: number;
}) {
  const max = Math.max(0, ...columns.flatMap((c) => c.values));
  const { top, ticks } = niceScale(max, { integer });
  const single = series.length === 1;
  const labelled = single ? labelledColumns(columns.map((c) => c.values[0])) : new Set<number>();
  const pct = (v: number) => `${(v / top) * 100}%`;
  const describe = (c: ChartColumn) =>
    `${c.fullLabel}: ${[
      ...series.map((s, i) => (single && extra.length === 0 ? format(c.values[i]) : `${s} ${format(c.values[i])}`)),
      ...extra.map((x, xi) => `${x} ${format(c.extras?.[xi] ?? 0)}`),
    ].join(", ")}`;

  return (
    <figure className="adm-chart" data-dense={columns.length > 8 || undefined}>
      {!single && (
        <ul className="adm-chart-legend">
          {series.map((s, i) => (
            <li key={s}>
              <span className="adm-chart-key" data-series={i} aria-hidden="true" />
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="adm-chart-plot" style={{ height }}>
        <div className="adm-chart-axis" aria-hidden="true">
          {ticks.map((t) => (
            <div key={t} className="adm-chart-tick" style={{ bottom: pct(t) }}>
              <span>{axisFormat(t)}</span>
            </div>
          ))}
        </div>

        <ol className="adm-chart-cols" aria-label={label} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((c, ci) => (
            <li
              key={c.key}
              className="adm-chart-col"
              tabIndex={0}
              aria-label={describe(c)}
              data-current={c.current || undefined}
              data-edge={ci === 0 ? "start" : ci === columns.length - 1 ? "end" : undefined}
            >
              <div className="adm-chart-bars" aria-hidden="true">
                {c.values.map((v, si) => (
                  <span key={si} className="adm-chart-bar" data-series={si} data-zero={v === 0 || undefined} style={{ height: pct(v) }}>
                    {labelled.has(ci) && <em className="adm-chart-cap">{format(v)}</em>}
                  </span>
                ))}
              </div>
              <span className="adm-chart-xl" aria-hidden="true">
                {c.label}
              </span>
              <span className="adm-chart-tip" aria-hidden="true">
                <span className="adm-chart-tip-head">{c.fullLabel}</span>
                {series.map((s, si) => (
                  <span key={s} className="adm-chart-tip-row">
                    {!single && <span className="adm-chart-tip-key" data-series={si} />}
                    <strong>{format(c.values[si])}</strong>
                    {!single && <span>{s}</span>}
                  </span>
                ))}
                {extra.map((x, xi) => (
                  <span key={x} className="adm-chart-tip-row" data-extra>
                    {!single && <span className="adm-chart-tip-key" data-extra />}
                    <strong>{format(c.extras?.[xi] ?? 0)}</strong>
                    <span>{x}</span>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <details className="adm-chart-table">
        <summary>Show the figures</summary>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Period</th>
                {[...series, ...extra].map((s) => (
                  <th key={s} scope="col" style={{ textAlign: "right" }}>
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((c) => (
                <tr key={c.key}>
                  <td style={{ fontWeight: c.current ? 700 : 500, color: "var(--navy)" }}>{c.fullLabel}</td>
                  {[...c.values, ...extra.map((_, xi) => c.extras?.[xi] ?? 0)].map((v, i) => (
                    <td key={i} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {format(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
