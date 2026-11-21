/**
 * What an AI request cost, from the token counts the API reports.
 *
 * Prices are US dollars per million tokens, as published for each model
 * (checked 21 November 2026). Thinking is billed as output. Kept in
 * millionths of a dollar so totals add up exactly.
 */
export const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number; checked: string }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, checked: "2026-11-21" },
};

export type TokenUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** Millionths of a dollar. An unknown model is costed at the dearest known price, never as free. */
export function costMicroUsd(model: string, u: TokenUsage): number {
  const p = PRICES[model] ?? Object.values(PRICES).reduce((a, b) => (b.output > a.output ? b : a));
  return Math.round(u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite);
}
