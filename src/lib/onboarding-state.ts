/**
 * Form result shape for the registration steps.
 *
 * Lives outside the `"use server"` action module because such a file may only
 * export async functions.
 */
export type OnboardingFormState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export const initialOnboardingState: OnboardingFormState = { status: "idle", message: "" };
