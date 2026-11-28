/** Form result for the blog screens. Kept out of the "use server" module. */
export type BlogFormState = {
  status: "idle" | "ok" | "error";
  message: string;
  /**
   * The editor's text was saved, even if a later step (sending for review,
   * publishing) then said no. The editor stops calling it unsaved.
   */
  saved?: boolean;
};

export const initialBlogState: BlogFormState = { status: "idle", message: "" };
