/** Form result for the expense form. Kept out of the "use server" module. */
export type ExpenseFormState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialExpenseState: ExpenseFormState = { status: "idle", message: "" };
