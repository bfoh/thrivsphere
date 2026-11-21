/** Result of a discount action in the admin dashboard. Kept out of the "use server" module. */
export type DiscountAdminState = {
  status: "idle" | "ok" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export const initialDiscountAdminState: DiscountAdminState = { status: "idle", message: "" };

/** Result of checking a discount code before paying. */
export type CodeCheckState = {
  status: "idle" | "ok" | "error";
  message: string;
  /** The code as checked, so the pay form can send it on. */
  code?: string;
  listPence?: number;
  pricePence?: number;
  label?: string;
};

export const initialCodeCheckState: CodeCheckState = { status: "idle", message: "" };
