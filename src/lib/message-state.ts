/** Form result for secure messaging. Kept out of the "use server" module. */
export type MessageState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialMessageState: MessageState = { status: "idle", message: "" };
