/**
 * Scale arithmetic for the back office's column charts. Pure, so the axis can
 * be tested without rendering anything.
 */

/**
 * A clean axis for values up to `max`: steps of 1, 2, 2.5 or 5 × a power of
 * ten, about `target` of them, with the top tick at or above the largest
 * value. Counts never get fractional steps.
 */
export function niceScale(max: number, { target = 4, integer = false } = {}): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: integer ? target : 1, ticks: integer ? range(0, target, 1) : [0, 0.5, 1] };
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = step * Math.ceil(max / step);
  return { top, ticks: range(0, top, step) };
}

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  // Rounded so 0.1 + 0.2 never prints as 0.30000000000000004.
  for (let v = from; v <= to + step / 1e6; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/**
 * Which columns get their value printed on the cap: the latest and the
 * highest. Never every column — the table and the tooltips carry the rest.
 */
export function labelledColumns(values: number[]): Set<number> {
  const out = new Set<number>();
  if (values.length === 0) return out;
  const last = values.length - 1;
  if (values[last] > 0) out.add(last);
  let peak = 0;
  values.forEach((v, i) => {
    if (v > values[peak]) peak = i;
  });
  if (values[peak] > 0) out.add(peak);
  return out;
}

/** Axis money: £0, £50, £1.5K, £12K. Pence in, pounds out. */
export function axisPounds(pence: number): string {
  const pounds = pence / 100;
  if (pounds >= 1000) return `£${Number((pounds / 1000).toFixed(pounds >= 10000 ? 0 : 1))}K`;
  return `£${Number(pounds.toFixed(pounds < 10 && pounds % 1 ? 1 : 0))}`;
}
