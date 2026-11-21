import type { KitProblem } from "./brand-kit";

export type MarketingFormState = { status: "idle" | "ok" | "error"; message: string; problems?: KitProblem[] };
export const initialMarketingState: MarketingFormState = { status: "idle", message: "" };
