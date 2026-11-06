/**
 * Template keys and the worksheet library list.
 *
 * Kept apart from the registry so the supervision template can offer "pick a
 * worksheet" without importing the registry that imports it. A test checks
 * this list matches the client templates the registry actually holds.
 */

export const SUPERVISION_KEY = "supervision-session-planning";
export const WORKSHEET_5_KEY = "worksheet-5-emotional-intensity";

export const WORKSHEET_LIBRARY: { key: string; number: number; title: string }[] = [
  { key: WORKSHEET_5_KEY, number: 5, title: "Understanding the Intensity of My Emotions" },
];

export const worksheetLabel = (w: { number: number; title: string }) => `Worksheet ${w.number}: ${w.title}`;
