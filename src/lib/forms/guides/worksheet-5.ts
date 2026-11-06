import { WORKSHEET_5_KEY } from "../library";

/**
 * Worksheet 5 practitioner guide.
 *
 * The owner's guide is kept word for word (sections marked `owner`). The rest
 * is added for her sign-off: an accurate account of the evidence, when not to
 * use the worksheet, how to introduce it, adaptations, ThriveSphere's own
 * escalation steps and what to record. Wording here is original — the DBT
 * handouts the approach draws on are copyrighted.
 */

export type GuideSection = {
  heading: string;
  /** The owner's own text, unchanged. */
  owner?: boolean;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
  tone?: "plain" | "safety";
};

export type PractitionerGuide = { templateKey: string; title: string; sections: GuideSection[]; disclaimer: string };

export const worksheet5Guide: PractitionerGuide = {
  templateKey: WORKSHEET_5_KEY,
  title: "Worksheet 5 — Practitioner Guide",
  sections: [
    {
      heading: "Purpose",
      owner: true,
      paragraphs: [
        "Help clients develop awareness of emotional intensity and recognise opportunities to respond before feelings become overwhelming.",
      ],
    },
    {
      heading: "Evidence-informed foundation",
      owner: true,
      paragraphs: [
        "Emotion regulation research, emotional awareness, self-monitoring and skills-based approaches used in CBT and DBT.",
      ],
    },
    {
      heading: "What the evidence says, in brief",
      bullets: [
        "Putting feelings into words (\"affect labelling\") has been shown to reduce the intensity of emotional responses (Lieberman et al., 2007). The emotion words in section 1 are there for this reason.",
        "Breaking an emotional episode into parts — what happened, the thoughts, body sensations, urges and what the person actually did — follows the model of emotions taught in DBT skills training (Linehan, 2015).",
        "0–10 ratings are personal and subjective, like the Subjective Units of Distress scale. They show change for one person over time. They are not for comparing people or judging how serious something is.",
        "Between-session practice is more likely to happen when the reason for it is explained, it is agreed together, it is written down and it is reviewed at the next session (Kazantzis and colleagues).",
        "ThriveSphere uses this worksheet as an educational wellbeing activity. It is not therapy.",
      ],
    },
    {
      heading: "Before you start",
      bullets: [
        "Allow about 20–30 minutes in a session. Alternatively, do sections 1 and 2 together and let the client finish the rest at home.",
        "Read the client's risk flags and recent notes first.",
        "Don't start it, or stop it, if the client is in crisis or very distressed, or if the only situations they can think of involve trauma they haven't chosen to talk about.",
      ],
    },
    {
      heading: "Introducing it",
      paragraphs: [
        "\"We're going to look at how strong feelings can get, and the early signs that they're building. There are no right answers and you can skip anything. Let's pick a situation that feels OK to think about. It doesn't have to be the hardest one.\"",
      ],
    },
    {
      heading: "Suggested use",
      owner: true,
      steps: [
        "Invite the client to choose a manageable recent experience.",
        "Help them identify and rate the emotion without judging it.",
        "Explore physical sensations, thoughts and behavioural urges.",
        "Identify early warning signs and factors that increased or reduced intensity.",
        "Collaboratively select one realistic response to practise.",
        "Review the client’s experience during a subsequent session.",
      ],
    },
    {
      heading: "Practitioner considerations",
      owner: true,
      bullets: [
        "Avoid assuming that high emotional intensity always indicates poor coping.",
        "Do not pressure clients to revisit traumatic experiences.",
        "Adapt exercises for clients who find it difficult to identify or describe emotions.",
        "If significant distress or safety concerns emerge, stop the exercise and follow the appropriate safeguarding or escalation procedure.",
      ],
    },
    {
      heading: "Adapting it",
      bullets: [
        "Difficulty naming emotions: start with the body questions, or use the word list and ask which word is closest.",
        "Neurodivergent clients: go one question at a time. Accept written or typed answers, and concrete descriptions (\"I wanted to leave\") in place of emotion words.",
        "Literacy or language: do it together out loud and type the client's answers in for them, using \"Enter answers\" on their record. Offer an interpreter if one is needed.",
        "Culture: emotions are named and shown differently across cultures and families. Use the client's own words rather than steering them to the list.",
      ],
    },
    {
      heading: "If distress or a safety concern comes up",
      tone: "safety",
      steps: [
        "Stop the exercise and attend to the person.",
        "If there is an immediate risk to life, call 999 or help them to. Otherwise share: NHS 111, option 2, for urgent mental health help; Samaritans on 116 123; or text SHOUT to 85258.",
        "Raise a safeguarding concern on the client's record the same day and tell the Designated Safeguarding Lead.",
        "Note it in section 3 of the supervision sheet, so the next session is planned around it.",
      ],
    },
    {
      heading: "Expected learning outcome",
      owner: true,
      paragraphs: [
        "The client can recognise at least one early warning sign of increasing emotional intensity and identify a practical response they are willing to try.",
      ],
    },
    {
      heading: "Progress review",
      owner: true,
      paragraphs: [
        "Explore whether the client is recognising changes in emotional intensity earlier and whether their chosen response is helpful.",
      ],
    },
    {
      heading: "Recording it",
      bullets: [
        "The client's answers are saved on their record, so there's no need to copy them into the session note.",
        "In the session note, summarise: that Worksheet 5 was used, the early warning sign and response the client chose, and any practice agreed for between sessions.",
        "Clients can ask to see everything we hold about them. Write as though they will read it.",
      ],
    },
  ],
  disclaimer:
    "This worksheet is an educational wellbeing resource, not a diagnostic or validated clinical assessment tool.",
};
