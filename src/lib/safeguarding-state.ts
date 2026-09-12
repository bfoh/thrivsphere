/** Form result shape for safeguarding actions. Kept out of the "use server" module. */
export type SafeguardingState = {
  status: "idle" | "ok" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export const initialSafeguardingState: SafeguardingState = { status: "idle", message: "" };
