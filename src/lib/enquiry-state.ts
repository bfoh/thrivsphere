/**
 * Shared shape for the enquiry/booking form result.
 *
 * Kept out of the `"use server"` action module on purpose: a "use server" file
 * may only export async functions, so the initial-state object and its type
 * have to live somewhere neutral that both client and server can import.
 */
export type EnquiryState = {
  status: "idle" | "ok" | "error";
  message: string;
  /** Field-level validation messages, keyed by input name. */
  fieldErrors?: Record<string, string>;
};

export const initialEnquiryState: EnquiryState = { status: "idle", message: "" };
