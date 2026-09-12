/** Form result for document upload. Kept out of the "use server" module. */
export type DocumentState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialDocumentState: DocumentState = { status: "idle", message: "" };
