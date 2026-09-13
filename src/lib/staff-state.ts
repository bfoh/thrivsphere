/** Form result for staff management. Kept out of the "use server" module. */
export type StaffFormState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialStaffState: StaffFormState = { status: "idle", message: "" };
