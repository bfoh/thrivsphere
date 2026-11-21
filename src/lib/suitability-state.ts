/** Form result for recording a suitability decision. Kept out of the "use server" module. */
export type SuitabilityState = {
  status: "idle" | "ok" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export const initialSuitabilityState: SuitabilityState = { status: "idle", message: "" };
