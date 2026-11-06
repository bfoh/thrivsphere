/**
 * Rules for supervision sheets and worksheets that are worth testing apart
 * from the database: who may move a record from one state to the next, and
 * what a printed sheet shows instead of a client's name.
 */

import { CONCERN_OPTIONS } from "./forms/templates/supervision-v1";
import type { Answers } from "./forms/types";

export type WorksheetStatus = "assigned" | "in_progress" | "submitted" | "reviewed" | "withdrawn";
export type WorksheetIntent = "save" | "submit" | "review" | "withdraw";

/**
 * The status a worksheet moves to, or null when the move is not allowed.
 *
 * Once submitted, a worksheet's answers are fixed: the client sent them, and
 * a practitioner reviewing them must be reading what was sent. Only staff
 * review or withdraw, and a worksheet already under way can be withdrawn but
 * not one that has been sent back.
 */
export function nextWorksheetStatus(
  current: WorksheetStatus,
  intent: WorksheetIntent,
  by: "client" | "staff"
): WorksheetStatus | null {
  const open = current === "assigned" || current === "in_progress";
  switch (intent) {
    case "save":
      return open ? "in_progress" : null;
    case "submit":
      return open ? "submitted" : null;
    case "review":
      return by === "staff" && current === "submitted" ? "reviewed" : null;
    case "withdraw":
      return by === "staff" && open ? "withdrawn" : null;
  }
}

export const WORKSHEET_STATUS_LABEL: Record<WorksheetStatus, string> = {
  assigned: "Not started",
  in_progress: "In progress",
  submitted: "Sent — awaiting review",
  reviewed: "Reviewed",
  withdrawn: "Withdrawn",
};

/** Whether a supervision sheet flags anything that needs following up (§3). */
export function sheetNeedsFollowUp(answers: Answers): boolean {
  const safety = answers.safety;
  return Array.isArray(safety) && safety.some((v) => (CONCERN_OPTIONS as readonly string[]).includes(v as string));
}

/**
 * Initials for a printed sheet, which identifies the client by initials and
 * reference rather than by name — the paper sheet asked for "Client
 * initials / ID", and a printout can be left on a desk.
 */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/[\s-]+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts.map((p) => `${[...p][0]!.toUpperCase()}.`).join("");
}

/** A short, stable reference for a record, for print and conversation. */
export function shortRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}
