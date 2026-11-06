/** Form results for supervision sheets and worksheets. Kept out of the "use server" modules. */
export type ResourceFormState = {
  status: "idle" | "ok" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
  /** The draft's new revision after a save, so the next save is checked against it. */
  revision?: number;
  /** Where to go next, e.g. a newly created sheet. */
  redirectTo?: string;
  /** Section 3 flagged a concern, so the form offers the safeguarding route. */
  concernFlagged?: boolean;
};

export const initialResourceState: ResourceFormState = { status: "idle", message: "" };
