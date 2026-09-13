/** Form result for HR forms. Kept out of the "use server" module. */
export type HrFormState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialHrState: HrFormState = { status: "idle", message: "" };
