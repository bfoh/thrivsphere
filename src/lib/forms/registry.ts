/**
 * Every form template the service has used, old versions included.
 *
 * Adding a worksheet is a new template file registered here (and its entry in
 * `WORKSHEET_LIBRARY`). Rewording one is a new version registered alongside
 * the old: stored answers name the version they were given against, and must
 * keep finding it.
 */

import type { FormTemplate } from "./types";
import type { PractitionerGuide } from "./guides/worksheet-5";
import { supervisionV1 } from "./templates/supervision-v1";
import { worksheet5V1 } from "./templates/worksheet-5-v1";
import { worksheet5Guide } from "./guides/worksheet-5";
import { SUPERVISION_KEY, WORKSHEET_LIBRARY } from "./library";

export const TEMPLATES: readonly FormTemplate[] = [supervisionV1, worksheet5V1];

const GUIDES: readonly PractitionerGuide[] = [worksheet5Guide];

export function getTemplate(key: string, version: number): FormTemplate | null {
  return TEMPLATES.find((t) => t.key === key && t.version === version) ?? null;
}

/** The version new records are started on. */
export function latestTemplate(key: string): FormTemplate | null {
  const versions = TEMPLATES.filter((t) => t.key === key);
  if (!versions.length) return null;
  return versions.reduce((a, b) => (b.version > a.version ? b : a));
}

export function supervisionTemplate(): FormTemplate {
  const t = latestTemplate(SUPERVISION_KEY);
  if (!t) throw new Error("The supervision sheet template is not registered.");
  return t;
}

/** A worksheet that can be set for a client, at its latest version. */
export function worksheetTemplate(key: string): FormTemplate | null {
  const t = latestTemplate(key);
  return t && t.audience === "client" ? t : null;
}

export function getGuide(key: string): PractitionerGuide | null {
  return GUIDES.find((g) => g.templateKey === key) ?? null;
}

/** The library, in worksheet order, with what each entry needs to be listed. */
export function worksheetLibrary() {
  return WORKSHEET_LIBRARY.map((w) => ({
    ...w,
    template: worksheetTemplate(w.key),
    hasGuide: getGuide(w.key) !== null,
  })).filter((w): w is typeof w & { template: FormTemplate } => w.template !== null);
}
