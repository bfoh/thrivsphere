/** Form results for booking and availability actions. */
export type BookingState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialBookingState: BookingState = { status: "idle", message: "" };
