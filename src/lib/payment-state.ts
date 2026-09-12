/** Form result for starting a checkout. Kept out of the "use server" module. */
export type PaymentState = { status: "idle" | "error"; message: string };
export const initialPaymentState: PaymentState = { status: "idle", message: "" };
