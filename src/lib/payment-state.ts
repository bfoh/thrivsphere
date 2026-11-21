/** Form result for starting a checkout. Kept out of the "use server" module. */
/** `ok` only when nothing needed paying (a 100% concession): booked straight away. */
export type PaymentState = { status: "idle" | "ok" | "error"; message: string };
export const initialPaymentState: PaymentState = { status: "idle", message: "" };
