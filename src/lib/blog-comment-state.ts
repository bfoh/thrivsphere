import type { CommentErrors } from "./blog-comment-rules";

/** A reader's comment form. Kept out of the "use server" module. */
export type CommentFormState = {
  status: "idle" | "ok" | "error";
  message: string;
  errors?: CommentErrors;
  values?: { name: string; email: string; body: string };
};

export const initialCommentState: CommentFormState = { status: "idle", message: "" };
