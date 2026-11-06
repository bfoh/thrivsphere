import type { FormTemplate, ScalarField } from "../types";
import { WORKSHEET_5_KEY } from "../library";

/**
 * Worksheet 5: Understanding the Intensity of My Emotions, version 1.
 *
 * The owner's questions and wording throughout. Additions, listed in
 * docs/resources.md for her sign-off:
 *  - a "how to use this" note on choice, privacy and what the worksheet is not
 *    (trauma-informed practice: choice, safety, transparency);
 *  - emotion words to choose from, since naming a feeling helps (affect
 *    labelling), alongside the owner's free-text question;
 *  - optional personal anchors for the 0–10 scale, which is personal by design;
 *  - "What did you actually do?" next to "What did you feel like doing?", to
 *    separate the urge from the action;
 *  - the crisis routes written out in the Overwhelming row;
 *  - up to three practice entries rather than one.
 *
 * Nothing is required: the client can skip any question, but has to answer at
 * least one before sending it.
 */

export const EMOTION_WORDS = [
  "Angry",
  "Annoyed",
  "Frustrated",
  "Anxious",
  "Worried",
  "Scared",
  "Sad",
  "Low",
  "Lonely",
  "Hurt",
  "Ashamed",
  "Embarrassed",
  "Guilty",
  "Jealous",
  "Disappointed",
  "Overwhelmed",
  "Numb",
] as const;

const practiceFields: ScalarField[] = [
  { kind: "textarea", id: "situation", label: "Situation", rows: 2, maxLength: 1500 },
  { kind: "text", id: "emotion", label: "Emotion", maxLength: 200 },
  { kind: "rating", id: "before", label: "Intensity before responding", minLabel: "0", maxLabel: "10" },
  { kind: "textarea", id: "tried", label: "What I tried", rows: 2, maxLength: 1500 },
  { kind: "rating", id: "after", label: "Intensity afterwards", minLabel: "0", maxLabel: "10" },
  { kind: "textarea", id: "learned", label: "What I learned", rows: 2, maxLength: 1500 },
];

export const worksheet5V1: FormTemplate = {
  key: WORKSHEET_5_KEY,
  version: 1,
  title: "Worksheet 5: Understanding the Intensity of My Emotions",
  audience: "client",
  summary: "Recognise how strongly you feel an emotion, notice its early warning signs and choose a response.",
  minAnswered: 1,
  closing:
    "Remember: The aim is not to eliminate emotions, but to recognise them and respond in ways that support your wellbeing.",
  sections: [
    {
      id: "purpose",
      title: "Purpose",
      items: [
        {
          kind: "info",
          id: "purposeText",
          body: [
            "Emotions can vary in intensity. Sometimes we experience mild discomfort, while at other times our feelings become overwhelming.",
            "This worksheet helps you recognise how strongly you are feeling an emotion, notice its early warning signs and choose an appropriate response.",
          ],
        },
        {
          kind: "info",
          id: "howTo",
          tone: "note",
          title: "How to use this",
          body: [
            "There are no right or wrong answers, and you can skip any question.",
            "Choose a situation that feels manageable to think about. It doesn't need to be the hardest one.",
            "Your answers are saved in your account as you go. Your practitioner reads them once you send them, so you can talk them through together. They are kept confidential, unless we are worried about your safety or someone else's.",
            "No one is watching this worksheet between sessions. If you need help right now, use the numbers at the bottom of the page.",
          ],
        },
      ],
    },
    {
      id: "identify",
      title: "1. Identify the Emotion",
      intro: "Think about a recent situation when you experienced a strong emotion.",
      items: [
        {
          kind: "textarea",
          id: "whatHappened",
          label: "What happened?",
          hint: "Just the facts: where you were, who was there, what was said or done.",
          rows: 3,
          maxLength: 2000,
        },
        {
          kind: "checkboxes",
          id: "emotionWords",
          label: "What emotion did you experience?",
          hint: "Choose any words that fit. Naming a feeling can make it easier to manage.",
          options: EMOTION_WORDS.map((w) => ({ value: w.toLowerCase(), label: w })),
        },
        { kind: "text", id: "emotionOwnWords", label: "Or describe it in your own words", maxLength: 300 },
      ],
    },
    {
      id: "rate",
      title: "2. Rate the Intensity",
      items: [
        {
          kind: "rating",
          id: "intensity",
          label: "How strong was the emotion at the time? My rating:",
          minLabel: "0 = No intensity",
          maxLabel: "10 = Extremely intense",
        },
        {
          kind: "table",
          id: "intensityGuide",
          columns: ["Rating", "What it might feel like"],
          rows: [
            ["0–3", "Mild: noticeable but manageable"],
            ["4–6", "Moderate: affecting concentration or behaviour"],
            ["7–8", "Strong: difficult to manage or think clearly"],
            ["9–10", "Very intense: feeling overwhelmed"],
          ],
          caption: "These ranges are guides for personal reflection, not clinical categories.",
        },
        {
          kind: "info",
          id: "anchorsIntro",
          tone: "note",
          body: ["Optional: everyone's scale is different. Describing your own points can make the next rating easier."],
        },
        { kind: "text", id: "anchorLow", label: "For me, a 2 feels like…", maxLength: 300 },
        { kind: "text", id: "anchorMid", label: "For me, a 5 feels like…", maxLength: 300 },
        { kind: "text", id: "anchorHigh", label: "For me, a 9 feels like…", maxLength: 300 },
      ],
    },
    {
      id: "signs",
      title: "3. Recognise Your Warning Signs",
      items: [
        {
          kind: "textarea",
          id: "body",
          label: "What did you notice in your body?",
          hint: "Examples: muscle tension, faster heartbeat, restlessness, feeling hot.",
          rows: 2,
          maxLength: 1500,
        },
        { kind: "textarea", id: "thoughts", label: "What happened to your thoughts?", rows: 2, maxLength: 1500 },
        {
          kind: "textarea",
          id: "urges",
          label: "What did you feel like doing?",
          hint: "Examples: withdrawing, crying, arguing, leaving or seeking reassurance.",
          rows: 2,
          maxLength: 1500,
        },
        {
          kind: "textarea",
          id: "actions",
          label: "What did you actually do?",
          hint: "It's fine if this was different from what you felt like doing. Noticing the difference is useful.",
          rows: 2,
          maxLength: 1500,
        },
      ],
    },
    {
      id: "change",
      title: "4. Notice How the Emotion Changed",
      items: [
        { kind: "textarea", id: "firstSign", label: "What was the first sign that the emotion was becoming stronger?", rows: 2, maxLength: 1500 },
        { kind: "textarea", id: "madeStronger", label: "What made the emotion more intense?", rows: 2, maxLength: 1500 },
        { kind: "textarea", id: "helped", label: "What helped it become less intense, even slightly?", rows: 2, maxLength: 1500 },
      ],
    },
    {
      id: "respond",
      title: "5. Choose a Helpful Response",
      intro: "Consider what might help at different levels of emotional intensity.",
      items: [
        {
          kind: "table",
          id: "responses",
          columns: ["Intensity", "What I could try"],
          rows: [
            ["Mild", "Notice and name the emotion"],
            ["Moderate", "Pause, slow down and identify what I need"],
            ["Strong", "Step away safely, use a grounding activity or seek support"],
            [
              "Overwhelming",
              "Prioritise safety and contact appropriate support: 999 or A&E if you or someone else is in danger · NHS 111, option 2, for urgent mental health help · Samaritans 116 123 · text SHOUT to 85258",
            ],
          ],
        },
        {
          kind: "textarea",
          id: "helpfulAction",
          label: "When I notice my emotion becoming stronger, one helpful action I could take is:",
          rows: 2,
          maxLength: 1500,
        },
        { kind: "text", id: "supportContact", label: "Someone I could contact for support, if needed:", maxLength: 300 },
      ],
    },
    {
      id: "practice",
      title: "6. Practise During the Week",
      intro: "Choose an occasion to notice and record your emotional intensity. You can add up to three.",
      items: [
        { kind: "repeat", id: "practice", label: "Practice", itemLabel: "Occasion", maxItems: 3, fields: practiceFields },
      ],
    },
    {
      id: "learning",
      title: "My Key Learning",
      items: [
        { kind: "textarea", id: "earlySign", label: "One early warning sign I want to recognise sooner is:", rows: 2, maxLength: 1500 },
        { kind: "textarea", id: "responseToPractise", label: "One helpful response I want to practise is:", rows: 2, maxLength: 1500 },
      ],
    },
  ],
};
