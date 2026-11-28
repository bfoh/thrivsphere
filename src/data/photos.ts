import type { StaticImageData } from "next/image";

import patiencePortrait from "@/assets/photos/patience-barning-t-portrait.jpg";
import lucyPortrait from "@/assets/photos/lucy-john-portrait.jpg";
import patienceOnline from "@/assets/photos/patience-online-wellbeing-session.jpg";
import lucyOnline from "@/assets/photos/lucy-online-wellbeing-session.jpg";
import patienceOneToOne from "@/assets/photos/patience-one-to-one-online-session.jpg";
import patienceWorkplace from "@/assets/photos/patience-workplace-wellbeing-session.jpg";
import lucyActionPlan from "@/assets/photos/lucy-wellbeing-action-plan-session.jpg";

/**
 * Photographs used on the public site, with their alt text.
 *
 * The practitioners are Patience and Lucy, who approved these images of
 * themselves. Everyone shown on a laptop screen is illustrative, so alt text
 * describes them only as people on a video call and never as clients.
 *
 * Statically imported, so next/image knows each file's size (no layout shift),
 * serves resized WebP copies for each screen, and shows a blurred preview
 * while a photo loads. The untouched originals are kept outside the repository
 * (resources/photos), with their Content Credentials.
 *
 * Kept apart from src/data/site.ts because scripts and tests import that file
 * under plain Node, which cannot import images.
 */
export type Photo = { src: StaticImageData; alt: string };

/** Seated portraits for Meet Our Team, keyed by team member slug. */
export const teamPhotos: Record<string, Photo> = {
  "patience-barning-t": {
    src: patiencePortrait,
    alt: "Patience Barning T, Founder and Lead Wellbeing Consultant at ThriveSphere Wellbeing, seated in a bright consulting room",
  },
  "lucy-john": {
    src: lucyPortrait,
    alt: "Lucy John, Wellbeing Consultant and Registered Mental Health Nurse at ThriveSphere Wellbeing, seated in a bright consulting room",
  },
};

/** Homepage, beside the introduction to personalised online support. */
export const homeIntroPhoto: Photo = {
  src: patienceOnline,
  alt: "Patience Barning T, Registered Mental Health Nurse, leading a one-to-one online wellbeing session on a video call",
};

/** Our Services, keyed by service slug. Services without a photo show none. */
export const servicePhotos: Partial<Record<string, Photo>> = {
  "emotional-wellbeing-support": {
    src: lucyOnline,
    alt: "Lucy John, Registered Mental Health Nurse, offering one-to-one emotional wellbeing support on a video call",
  },
  "psychoeducation-and-coping-skills": {
    src: patienceOneToOne,
    alt: "Patience Barning T listening attentively during a one-to-one online session with an older woman on a video call",
  },
  "workplace-wellbeing": {
    src: patienceWorkplace,
    alt: "Patience Barning T leading an online workplace wellbeing session for a team of four employees on a video call",
  },
};

/**
 * Our Services, beside "What to expect in your sessions": guided learning,
 * worksheets and practical skills, as the owner's photo brief (point 5) asked.
 */
export const whatToExpectPhoto: Photo = {
  src: lucyActionPlan,
  alt: "Lucy John going through a My Wellbeing Action Plan worksheet with a man on a video call",
};
