/** Form result for the session-note form. Kept out of the "use server" module. */
export type NoteFormState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialNoteState: NoteFormState = { status: "idle", message: "" };
