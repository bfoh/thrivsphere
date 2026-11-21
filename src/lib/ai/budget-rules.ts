/**
 * The monthly limit on AI spending. Pure, so it can be shown and tested.
 * Set AI_MONTHLY_BUDGET_USD to change it; the default is $50.
 */
export const DEFAULT_MONTHLY_BUDGET_USD = 50;

export function monthlyBudgetUsd(env: string | undefined = process.env.AI_MONTHLY_BUDGET_USD): number {
  const n = Number(env);
  return Number.isFinite(n) && n > 0 && n <= 5000 ? n : DEFAULT_MONTHLY_BUDGET_USD;
}

export const usd = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(0)}`;
