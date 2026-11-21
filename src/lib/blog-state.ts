/** Form result for the blog screens. Kept out of the "use server" module. */
export type BlogFormState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialBlogState: BlogFormState = { status: "idle", message: "" };
