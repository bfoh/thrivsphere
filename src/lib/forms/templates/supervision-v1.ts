import type { FormTemplate } from "../types";
import { SUPERVISION_KEY, WORKSHEET_LIBRARY, worksheetLabel } from "../library";

/**
 * Supervision & Next Session Planning Sheet, version 1.
 *
 * The owner's sheet, section for section, with her wording kept. Additions are
 * listed in docs/resources.md for her sign-off; in short they follow the
 * Proctor supervision model (adding the restorative "how are you" element as
 * §7), NMC/BACP record keeping (factual, attributable, written knowing the
 * client may read it), and the evidence on between-session practice (review
 * what was agreed last time before planning anything new).
 *
 * The header — client, session, practitioner, supervision date — is held in
 * columns rather than answers, so the record can be found by them.
 */

export const CONCERN_OPTIONS = ["risk", "signposting", "scope"] as const;

export const supervisionV1: FormTemplate = {
  key: SUPERVISION_KEY,
  version: 1,
  title: "Supervision & Next Session Planning Sheet",
  audience: "staff",
  summary: "Review a completed session together and plan the next one.",
  sections: [
    {
      id: "context",
      title: "Before you start",
      items: [
        {
          kind: "info",
          id: "recordNote",
          tone: "note",
          body: [
            "Write factually and briefly. This sheet is part of the client's record, and clients can ask to see what we hold about them.",
            "Save a draft at any point. When the sheet is finalised it is locked; corrections are added as amendments, as with session notes.",
          ],
        },
        {
          kind: "text",
          id: "present",
          label: "Who took part in this discussion",
          hint: "For example: practitioner and supervisor.",
          maxLength: 200,
        },
      ],
    },
    {
      id: "review",
      title: "1. Review of the Session",
      items: [
        { kind: "textarea", id: "mainIssue", label: "Main issue / goal discussed", rows: 3, required: true },
        { kind: "textarea", id: "progress", label: "Positive progress or achievement", rows: 3 },
        {
          kind: "choice",
          id: "lastPractice",
          label: "Between-session practice agreed last time",
          hint: "Review it before planning anything new — it shows the client their effort mattered.",
          display: "radio",
          options: [
            { value: "completed", label: "Completed" },
            { value: "partly", label: "Partly" },
            { value: "not_yet", label: "Not yet" },
            { value: "not_applicable", label: "None was agreed" },
          ],
        },
        {
          kind: "textarea",
          id: "lastPracticeNotes",
          label: "What helped or got in the way?",
          rows: 2,
          showWhen: { field: "lastPractice", includesAny: ["completed", "partly", "not_yet"] },
        },
        { kind: "textarea", id: "activityUsed", label: "Activity / approach used", rows: 2 },
        { kind: "textarea", id: "clientResponse", label: "How did the client respond?", rows: 3 },
        { kind: "textarea", id: "agreedAction", label: "Client's agreed action between sessions", rows: 2 },
        {
          kind: "rating",
          id: "goalRating",
          label: "Client's own rating of progress towards their goal (optional)",
          hint: "Ask the client rather than estimating it for them. A conversation aid, not a clinical measure.",
          minLabel: "0 – not started",
          maxLabel: "10 – achieved",
        },
      ],
    },
    {
      id: "discussion",
      title: "2. Joint Case Discussion",
      intro: "Keep what was said or observed separate from interpretation — \"the client said…\" rather than \"the client is…\".",
      items: [
        { kind: "textarea", id: "needsNow", label: "What do we understand about the client's needs now?", rows: 3 },
        {
          kind: "choice",
          id: "goalChanged",
          label: "Has the client's priority or goal changed?",
          display: "radio",
          options: [
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
          ],
        },
        {
          kind: "textarea",
          id: "goalNow",
          label: "What is it now?",
          rows: 2,
          showWhen: { field: "goalChanged", equals: "yes" },
          requiredWhen: { field: "goalChanged", equals: "yes" },
        },
        { kind: "textarea", id: "strengths", label: "Strengths / protective factors to build on", rows: 2 },
      ],
    },
    {
      id: "safety",
      title: "3. Safety, Scope & Signposting",
      items: [
        {
          kind: "checkboxes",
          id: "safety",
          label: "Tick all that apply",
          required: true,
          exclusive: "none",
          options: [
            { value: "none", label: "No new concern identified" },
            { value: "risk", label: "Risk / safeguarding concern – further action required" },
            { value: "signposting", label: "Additional professional support / signposting may be needed" },
            { value: "scope", label: "Needs may be outside ThriveSphere scope – review before continuing" },
          ],
        },
        {
          kind: "info",
          id: "crisis",
          tone: "safety",
          title: "If there is an immediate risk to life, act now and finish this sheet afterwards.",
          body: [
            "Emergency 999 or A&E · NHS 111, option 2, for urgent mental health help · Samaritans 116 123, free, 24/7 · Text SHOUT to 85258.",
            "Record the concern on the client's record the same day and tell the Designated Safeguarding Lead.",
          ],
          showWhen: { field: "safety", includesAny: ["risk"] },
        },
        {
          kind: "info",
          id: "safetyLinks",
          tone: "plain",
          body: ["Ticking a box here does not raise a concern or a referral on its own. Use the record to do that:"],
          links: [
            { label: "Raise a safeguarding concern", href: "/admin/clients/:clientId#safeguarding" },
            { label: "Record a referral or signpost", href: "/admin/clients/:clientId#referrals" },
            { label: "Scope of practice", href: "/scope-of-practice" },
          ],
          showWhen: { field: "safety", includesAny: [...CONCERN_OPTIONS] },
        },
        {
          kind: "textarea",
          id: "safetyDetails",
          label: "Details / agreed action if required",
          rows: 3,
          requiredWhen: { field: "safety", includesAny: [...CONCERN_OPTIONS] },
        },
        {
          kind: "staff",
          id: "safetyOwner",
          label: "Who will act on it",
          showWhen: { field: "safety", includesAny: [...CONCERN_OPTIONS] },
          requiredWhen: { field: "safety", includesAny: [...CONCERN_OPTIONS] },
        },
        {
          kind: "date",
          id: "safetyBy",
          label: "By when",
          showWhen: { field: "safety", includesAny: [...CONCERN_OPTIONS] },
          requiredWhen: { field: "safety", includesAny: [...CONCERN_OPTIONS] },
        },
      ],
    },
    {
      id: "prepare",
      title: "4. Prepare the Next Personalised Session",
      items: [
        { kind: "textarea", id: "focus", label: "Agreed focus", rows: 3 },
        { kind: "textarea", id: "whyFits", label: "Why this fits the client's goal", rows: 2 },
        { kind: "textarea", id: "mainActivity", label: "Main activity / skill / psychoeducation to prepare", rows: 2 },
        {
          kind: "choice",
          id: "worksheet",
          label: "Worksheet from the library",
          hint: "It can be set for the client from their record.",
          display: "select",
          options: WORKSHEET_LIBRARY.map((w) => ({ value: w.key, label: worksheetLabel(w) })),
        },
        { kind: "text", id: "resource", label: "Workbook page / visual / resource needed", maxLength: 300 },
        { kind: "textarea", id: "prompts", label: "Useful prompts / questions", rows: 3 },
        { kind: "textarea", id: "inSessionPractice", label: "Practice during the session", rows: 2 },
        {
          kind: "textarea",
          id: "betweenPractice",
          label: "Possible between-session practice to agree with client",
          hint: "Small and specific; explain why it helps; agree it with the client rather than set it; review it next time.",
          rows: 2,
        },
      ],
    },
    {
      id: "tasks",
      title: "5. Who Will Prepare What?",
      items: [
        {
          kind: "tasks",
          id: "tasks",
          label: "Preparation tasks",
          hint: "When the sheet is finalised, each task appears on the Resources page of the person responsible, with its own Done tick.",
          maxRows: 6,
        },
      ],
    },
    {
      id: "plan",
      title: "6. Agreed Next-Session Plan",
      items: [
        { kind: "textarea", id: "keyDecision", label: "Key decision / plan", rows: 3, required: true },
        { kind: "textarea", id: "reviewAgain", label: "Anything to review again after the next session", rows: 2 },
        {
          kind: "choice",
          id: "progressReview",
          label: "Is a progress review due?",
          display: "radio",
          options: [
            { value: "not_yet", label: "Not yet" },
            { value: "next_session", label: "At the next session" },
            { value: "now", label: "Now — arrange one" },
          ],
        },
      ],
    },
    {
      id: "reflection",
      title: "7. Practitioner Reflection (optional)",
      intro:
        "This sits on the client's record, where colleagues with access can read it. Keep it professional; take anything personal to your supervisor directly.",
      items: [
        {
          kind: "textarea",
          id: "learning",
          label: "One learning point from this discussion",
          hint: "If you use it for CPD or revalidation, write it up there without anything that identifies the client.",
          rows: 2,
        },
        { kind: "textarea", id: "supportNeeded", label: "Support you'd like from supervision or the team", rows: 2 },
      ],
    },
  ],
};
