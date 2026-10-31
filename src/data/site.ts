export const brand = {
  name: "ThriveSphere Wellbeing",
  short: "ThriveSphere",
  tagline: "Supporting Your Wellbeing. Strengthening Your Resilience.",
  email: "hello@thrivsphere.org",
  location: "United Kingdom · Online wellbeing support",
  /** One-line positioning. Non-clinical — see `scopeOfPractice` below. */
  positioning:
    "Online non-clinical mental wellbeing support, psychoeducation, coping skills education, emotional resilience and personal wellbeing development.",
  audienceLine: "For adults aged 18 years and above.",
  /** Shown wherever booking is mentioned. Individual schedules are never published. */
  availabilityLine:
    "Flexible online appointments, including evenings and weekends, subject to availability.",
};

/**
 * The legal entity behind the trading name.
 *
 * ThriveSphere Wellbeing is not a separately registered company, so the
 * website must name the company that is — the trading disclosure rules expect
 * its name, number and registered office on the site. The address was checked
 * against Companies House on 31 October 2026.
 */
export const legal = {
  companyName: "3G AND PAT HEALTHCARE LIMITED",
  companyNumber: "11615975",
  jurisdiction: "England and Wales",
  registeredOffice: "9 Shapland, Tadpole Garden Village, Swindon, Wiltshire, SN25 2SD",
  /** The owner's own wording for the footer. */
  statement:
    "ThriveSphere Wellbeing is a trading name of 3G AND PAT HEALTHCARE LIMITED. Registered in England and Wales. Company Registration Number: 11615975.",
};

/** Primary nav — the homepage links the owner listed (checklist §3). */
export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
  { label: "About Us", href: "/about" },
  { label: "Our Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact Us", href: "/contact" },
];

/** The call to action beside the nav, and on every "book" button. */
export const bookCta: NavItem = { label: "Book an Appointment", href: "/book" };

/**
 * Scope of practice — what ThriveSphere is and is not.
 * ThriveSphere is a non-clinical service: it does not assess, diagnose or treat.
 * Surfaced on About, Services and Book, and inside the intake flow.
 */
export const scopeOfPractice = {
  isTitle: "What ThriveSphere is",
  is: [
    "A non-clinical wellbeing education and support service",
    "Wellbeing Needs Reviews and personalised emotional wellbeing support",
    "Psychoeducation and practical coping skills",
    "Resilience, personal development and workplace wellbeing",
    "Signposting to the right specialist service when you need one",
  ],
  isNotTitle: "What ThriveSphere is not",
  isNot: [
    "An emergency mental health service",
    "A clinical or medical service — we do not assess, diagnose or treat",
    "A substitute for your GP, NHS mental health services or medication",
    "A counselling or psychotherapy service",
    "A provider of occupational health medical assessments or fitness-for-work reports",
  ],
  note: "If your needs fall outside what we offer, we will say so and help you find the right support.",
};

/** Every public policy — rendered in the sidebar on each policy page. */
export const policyLinks = [
  { label: "Service Boundaries (Scope of Practice)", href: "/scope-of-practice" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "Consent Policy", href: "/consent" },
  { label: "Privacy Policy (UK GDPR)", href: "/privacy" },
  { label: "Confidentiality", href: "/confidentiality" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Safeguarding Policy", href: "/safeguarding" },
  { label: "Domestic Abuse & Safe Disclosure", href: "/domestic-abuse" },
  { label: "Suicide, Self-Harm & Crisis", href: "/crisis" },
  { label: "Cancellation and Refunds", href: "/payments" },
  { label: "Complaints Procedure", href: "/complaints" },
  { label: "Equality, Diversity & Inclusion", href: "/edi" },
  { label: "Accessibility Statement", href: "/accessibility" },
];

/** The policy pages the owner listed for review (checklist §14), for the footer. */
export const footerPolicyLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "Cancellation and Refunds", href: "/payments" },
  { label: "Confidentiality", href: "/confidentiality" },
  { label: "Service Boundaries", href: "/scope-of-practice" },
  { label: "Complaints Procedure", href: "/complaints" },
  { label: "Safeguarding Information", href: "/safeguarding" },
];

/** Checklist §2. */
export const mission =
  "To provide compassionate, accessible and personalised wellbeing education and support, empowering individuals to strengthen emotional resilience, develop practical coping strategies and improve their everyday wellbeing.";

/** Checklist §2. */
export const values = [
  "Compassion",
  "Confidentiality",
  "Professionalism",
  "Dignity",
  "Inclusivity",
  "Respect",
  "Empowerment",
  "Person-centred support",
];

/** Checklist §3 — the homepage heading and introduction, as worded by the owner. */
export const homeIntro = {
  heading: "Supporting Your Wellbeing. Strengthening Your Resilience.",
  paragraphs: [
    "At ThriveSphere Wellbeing, we understand that life's challenges can affect emotional wellbeing, confidence, relationships and the ability to cope with everyday demands.",
    "We provide professional, compassionate and personalised online wellbeing support to help individuals understand their emotional wellbeing, develop practical coping strategies and strengthen resilience. Our experienced Registered Mental Health Nurses bring extensive professional knowledge to providing supportive, evidence-informed wellbeing education tailored to individual needs.",
    "We aim to create a welcoming, confidential and respectful environment where individuals feel heard, understood and empowered to make positive changes.",
  ],
};

/**
 * What people come to us with (checklist §4B). Deliberately non-clinical —
 * these are everyday challenges, not conditions or diagnoses.
 */
export const audience = [
  "Everyday stress and worry",
  "Low mood and emotional difficulties",
  "Relationship and family pressures",
  "Difficult life experiences and transitions",
  "Low confidence and self-esteem",
  "Emotional overwhelm",
  "Challenges with personal boundaries",
];

export type Service = {
  /** Stable key — the `services.slug` column. */
  slug: string;
  icon: string;
  title: string;
  /** One line for the homepage card, drawn from the checklist's wording. */
  summary: string;
  desc: string;
  points: string[];
  /** A boundary or clarification shown beneath the points. */
  note?: string;
};

/**
 * Our services (checklist §4).
 *
 * The seed for the `services` table; the public pages read the table, so the
 * owner can edit these from the admin area after launch.
 */
export const services: Service[] = [
  {
    slug: "wellbeing-needs-review",
    icon: "compass",
    title: "Wellbeing Needs Review",
    summary: "A structured, non-clinical conversation exploring your wellbeing concerns, strengths, coping strategies and personal goals.",
    desc: "A structured, non-clinical conversation exploring the client's current wellbeing concerns, everyday challenges, strengths, existing coping strategies, support needs and personal goals. The review helps us identify appropriate wellbeing education, practical support and next steps.",
    points: [],
  },
  {
    slug: "emotional-wellbeing-support",
    icon: "heart",
    title: "Emotional Wellbeing Support",
    summary: "Personalised support for individuals navigating emotional challenges.",
    desc: "Personalised support for individuals navigating emotional challenges such as:",
    points: audience,
  },
  {
    slug: "psychoeducation-and-coping-skills",
    icon: "book",
    title: "Psychoeducation and Coping Skills",
    summary: "Practical education to help individuals better understand their emotional wellbeing and develop skills for everyday challenges.",
    desc: "Practical education to help individuals better understand their emotional wellbeing and develop skills for everyday challenges. This may include:",
    points: [
      "Understanding thoughts, feelings and behaviours",
      "Stress awareness and management",
      "Emotional awareness and regulation",
      "Grounding and relaxation techniques",
      "Mindfulness and present-moment awareness",
      "Self-compassion and confidence-building",
      "Problem-solving and decision-making",
      "Assertiveness and communication",
      "Healthy boundaries",
      "Sleep and self-care education",
      "Managing everyday worry and difficult emotions",
    ],
    note: "We may draw on evidence-informed educational principles from CBT, DBT, ACT, solution-focused approaches and other relevant wellbeing strategies. These approaches are used to support learning and coping skills development, not as formal psychotherapy.",
  },
  {
    slug: "resilience-and-personal-development",
    icon: "sun",
    title: "Resilience and Personal Development",
    summary: "Emotional resilience, confidence, healthy coping habits and practical strategies for navigating change.",
    desc: "Support to build:",
    points: [
      "Emotional resilience",
      "Greater self-awareness",
      "Confidence and self-esteem",
      "Healthy coping habits",
      "Personal wellbeing goals",
      "Positive routines",
      "Stronger interpersonal boundaries",
      "Practical strategies for navigating change",
    ],
  },
  {
    slug: "workplace-wellbeing",
    icon: "briefcase",
    title: "Workplace Wellbeing",
    summary: "Workplace stress, work-life balance, professional pressures, and resilience and burnout prevention.",
    desc: "Support with:",
    points: [
      "Workplace stress",
      "Emotional wellbeing at work",
      "Work-life balance",
      "Workplace relationships and communication",
      "Managing professional pressures",
      "Resilience and burnout prevention",
      "Understanding general workplace wellbeing and occupational health processes",
    ],
    note: "The service does not include formal occupational health medical assessments or fitness-for-work reports.",
  },
];

/** The topics offered on the enquiry and booking-request forms. */
export const enquiryTopics = [...services.map((s) => s.title), "Not sure yet"];

/** How our service works (checklist §5). */
export const howItWorks = {
  steps: [
    {
      title: "Enquiry or booking",
      text: "Clients contact ThriveSphere through the website or book an initial appointment.",
    },
    {
      title: "Initial Wellbeing Needs Review",
      text: "A 50-minute online conversation exploring concerns, coping strategies, strengths and personal wellbeing goals.",
    },
    {
      title: "Personalised Wellbeing Action Plan",
      text: "The practitioner and client agree suitable wellbeing goals, educational approaches and practical strategies.",
    },
    {
      title: "Ongoing Wellbeing Support",
      text: "Clients attend individual 50-minute sessions or purchase an optional package. Support is tailored to their goals and may include psychoeducation, coping skills, emotional resilience and practical wellbeing strategies.",
    },
    {
      title: "Progress Review",
      text: "Progress is reviewed periodically, and the client and practitioner agree whether to continue, adjust goals or conclude support.",
    },
  ],
  important:
    "ThriveSphere does not restrict clients to a fixed four-week or six-week programme. Support may continue for as long as it remains appropriate, beneficial and mutually agreed.",
};

export type TeamMember = {
  slug: string;
  name: string;
  role: string;
  /** Shown in the avatar until a photograph is supplied. */
  initials: string;
  /**
   * Path under /public, e.g. "/images/team/patience.jpg". Optional so a
   * photograph can be added later without touching the design.
   */
  photo?: string;
  credentials: string[];
  bio: string[];
};

/** Meet our team (checklist §2). */
export const team: TeamMember[] = [
  {
    slug: "patience-barning-t",
    name: "Patience Barning T",
    role: "Founder & Lead Wellbeing Consultant",
    initials: "PB",
    credentials: [
      "BA Psychology & Sociology — University of Ghana, Legon",
      "BSc Mental Health Nursing — Bournemouth University",
      "Postgraduate Diploma in Specialist Community Public Health Nursing (Occupational Health)",
      "Registered Mental Health Nurse",
      "Specialist Occupational Health Nurse",
    ],
    bio: [
      "Patience is an experienced Registered Mental Health Nurse and Specialist Occupational Health Nurse with extensive experience providing mental health support in both face-to-face and remote settings. Her academic background in psychology, sociology, mental health nursing and occupational health provides a broad understanding of emotional wellbeing, personal circumstances, social influences and workplace challenges.",
      "She brings a compassionate, practical and person-centred approach to supporting individuals with emotional wellbeing, coping skills, self-esteem, confidence, stress management and resilience. Through ThriveSphere Wellbeing, she aims to empower individuals with practical knowledge and skills to support their everyday wellbeing.",
    ],
  },
  {
    slug: "lucy-johns",
    name: "Lucy Johns",
    role: "Wellbeing Consultant & Registered Mental Health Nurse",
    initials: "LJ",
    credentials: ["Registered Mental Health Nurse"],
    bio: [
      "Lucy is an experienced Registered Mental Health Nurse with extensive professional experience supporting individuals in both remote and face-to-face mental health settings. She brings a compassionate and person-centred approach to helping individuals navigate emotional challenges, develop practical coping strategies, strengthen resilience and improve their everyday wellbeing. Her work at ThriveSphere focuses on emotional wellbeing education, practical skills development, psychoeducation and personalised support.",
    ],
  },
];

/** Short facts, all drawn from the checklist. */
export const impact = [
  { stat: "RMN", label: "Registered Mental Health Nurses" },
  { stat: "Online", label: "Evenings and weekends, subject to availability" },
  { stat: "50 min", label: "Individual sessions" },
  { stat: "18+", label: "Adults aged 18 and above" },
];

export type Plan = {
  /** Stable key — the `price_plans.slug` column. Never rename: orders refer to it. */
  slug: string;
  name: string;
  /** Shown under the price, e.g. "50 minutes". */
  unit: string;
  /** Amount in pence — the seed value only; the live price is in the database. */
  amountPence: number;
  /** Sessions credited to the client's account on payment. */
  sessions: number;
  blurb: string;
  features: string[];
  featured?: boolean;
  cta: string;
};

/**
 * Pricing and packages (checklist §6).
 *
 * The seed for the `price_plans` table. The public pricing page and checkout
 * both read the table, so prices are changed from the admin area — this array
 * only supplies the presentation (unit, features, button label) by slug.
 */
export const plans: Plan[] = [
  {
    slug: "initial-consultation",
    name: "Initial Wellbeing Needs Review",
    unit: "50 minutes",
    amountPence: 3000,
    sessions: 1,
    blurb: "A structured, non-clinical conversation exploring your wellbeing concerns, strengths, coping strategies and personal goals.",
    features: [
      "A 50-minute online conversation",
      "Explore your concerns, strengths and coping strategies",
      "Agree your personal wellbeing goals",
      "Charged separately from the packages",
    ],
    cta: "Book your review",
  },
  {
    slug: "individual-session",
    name: "Individual Wellbeing Support Session",
    unit: "50 minutes",
    amountPence: 4000,
    sessions: 1,
    blurb: "Personalised one-to-one wellbeing support, tailored to your goals.",
    features: [
      "A 50-minute online session",
      "Tailored to your goals",
      "No package needed — book one session at a time",
    ],
    cta: "Book a session",
  },
  {
    slug: "package-4",
    name: "Four-session package",
    unit: "Four 50-minute sessions",
    amountPence: 15000,
    sessions: 4,
    blurb: "Four 50-minute sessions, paid together.",
    features: [
      "Four 50-minute online sessions",
      "Book at your own pace",
      "Optional — individual sessions are always available",
    ],
    cta: "Buy four sessions",
  },
  {
    slug: "package-6",
    name: "Six-session package",
    unit: "Six 50-minute sessions",
    amountPence: 22500,
    sessions: 6,
    blurb: "Six 50-minute sessions, paid together.",
    features: [
      "Six 50-minute online sessions",
      "Book at your own pace",
      "Optional — individual sessions are always available",
    ],
    cta: "Buy six sessions",
  },
];

export type Resource = {
  slug: string;
  icon: string;
  category: string;
  title: string;
  desc: string;
  type: string;
  body: string[];
};

export const resources: Resource[] = [
  {
    slug: "grounding-techniques-for-anxious-moments",
    icon: "book",
    category: "Guide",
    title: "Grounding techniques for anxious moments",
    desc: "A simple 5-4-3-2-1 practice to steady your nervous system when anxiety rises.",
    type: "Guide · 3 min read",
    body: [
      "When anxiety rises, our attention narrows and the body braces as if under threat. Grounding gently brings you back to the present, signalling to your nervous system that you are safe right now.",
      "## The 5-4-3-2-1 practice",
      "Wherever you are, slow your breathing and notice, one sense at a time:",
      "- **5 things you can see** — colours, shapes, light",
      "- **4 things you can feel** — your feet on the floor, the chair, the air",
      "- **3 things you can hear** — near and far",
      "- **2 things you can smell** — or two smells you like",
      "- **1 thing you can taste** — or one slow, deliberate breath",
      "## Making it a habit",
      "Grounding works best when it's familiar. Try it once a day when you feel calm, so it's ready when you need it most. There is no right or wrong — go at your own pace, and be kind to yourself.",
      "If anxiety is frequently overwhelming, you don't have to manage it alone. Our one-to-one wellbeing support can help you build a personalised toolkit.",
    ],
  },
  {
    slug: "recognising-coercive-control",
    icon: "shield",
    category: "Awareness",
    title: "Recognising coercive control",
    desc: "Understand the subtle patterns of coercive control and where to find help.",
    type: "Article · 5 min read",
    body: [
      "Coercive control is a pattern of behaviour used to dominate and isolate a person. It can be hard to name because it often builds slowly and hides behind care or concern.",
      "## Signs to look for",
      "- Monitoring your movements, messages or spending",
      "- Isolating you from friends, family or support",
      "- Controlling what you wear, eat, or where you go",
      "- Making you feel you're 'walking on eggshells'",
      "- Undermining your confidence or sense of reality",
      "## This is not your fault",
      "Coercive control is a form of abuse and, in the UK, it is a criminal offence. What you're experiencing is real, and support is available — confidentially and without judgement.",
      "Coercive control affects people of every gender. If you are in immediate danger call 999. For confidential advice, the National Domestic Abuse Helpline is free, 24/7, on 0808 2000 247; men can also contact the Men's Advice Line on 0808 8010 327. ThriveSphere can walk alongside you and signpost specialist services.",
    ],
  },
  {
    slug: "10-minute-calming-breath-practice",
    icon: "lotus",
    category: "Mindfulness",
    title: "10-minute calming breath practice",
    desc: "A guided practice to reduce stress and reconnect with the present.",
    type: "Practice · 10 min",
    body: [
      "Slow, steady breathing is one of the quickest ways to calm the body. This simple practice can be done sitting or lying down, whenever you have ten quiet minutes.",
      "## The practice",
      "Settle into a comfortable position and let your shoulders soften.",
      "- Breathe in gently through your nose for a count of 4",
      "- Allow a soft pause for a count of 2",
      "- Breathe out slowly through your mouth for a count of 6",
      "- Repeat, letting each out-breath be a little longer than the in-breath",
      "## If your mind wanders",
      "That's completely normal — minds wander. Each time you notice, simply guide your attention back to the breath, without judgement. The returning is the practice.",
      "Longer out-breaths gently activate the body's rest-and-restore response. With regular practice, calm becomes easier to reach.",
    ],
  },
  {
    slug: "rebuilding-self-worth-after-abuse",
    icon: "spark",
    category: "Confidence",
    title: "Rebuilding self-worth after abuse",
    desc: "Gentle, practical steps to reconnect with your value and strengths.",
    type: "Workbook · 6 min read",
    body: [
      "Abuse can chip away at how we see ourselves. Rebuilding self-worth is not about becoming someone new — it's about reconnecting with the person who was always there.",
      "## Start small and specific",
      "- Notice one thing you did today that took courage or care",
      "- Speak to yourself as you would to a good friend",
      "- Reclaim small choices — a meal, a song, how you spend an hour",
      "## Reconnect with your strengths",
      "Think of a time you got through something hard. The qualities that carried you then are still yours now. Write them down where you can see them.",
      "Healing isn't linear, and progress can be quiet. Be patient with yourself. Working alongside a supportive wellbeing practitioner or coach can help you rebuild confidence at a pace that feels safe.",
    ],
  },
  {
    slug: "setting-healthy-boundaries",
    icon: "users",
    category: "Relationships",
    title: "Setting healthy boundaries",
    desc: "How to recognise, communicate and protect your boundaries with care.",
    type: "Guide · 4 min read",
    body: [
      "Boundaries are the limits that keep relationships respectful and safe. They aren't walls to keep people out — they're the way we look after ourselves while staying connected.",
      "## Noticing your boundaries",
      "Your feelings are a guide. Resentment, exhaustion or unease often point to a boundary that needs care.",
      "## Communicating clearly and kindly",
      "- Keep it simple: 'I'm not able to do that.'",
      "- Name the need, not the blame: 'I need some quiet this evening.'",
      "- You don't owe a long explanation",
      "## Holding them with compassion",
      "People used to fewer limits may push back at first. That doesn't mean your boundary is wrong. Consistency, not force, is what makes boundaries hold.",
    ],
  },
  {
    slug: "weekly-wellbeing-planner",
    icon: "sun",
    category: "Self-care",
    title: "Your weekly wellbeing planner",
    desc: "Build small, sustainable self-care habits, one week at a time.",
    type: "Printable · Template",
    body: [
      "Self-care works best in small, repeatable doses. Rather than an overwhelming overhaul, this planner helps you weave gentle habits into the week you already have.",
      "## Five simple prompts",
      "- **Move:** one small way to move your body",
      "- **Rest:** one moment of genuine rest",
      "- **Connect:** one person to reach out to",
      "- **Nourish:** one nourishing meal or drink",
      "- **Joy:** one thing that brings you joy",
      "## How to use it",
      "Pick just one or two prompts to start. Tick them off as you go — not to be perfect, but to notice the care you're already giving yourself. Small, kind, repeated choices add up.",
    ],
  },
];

export type Post = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  read: string;
  body: string[];
};

export const posts: Post[] = [
  {
    slug: "building-resilience-gently",
    category: "Resilience",
    title: "Small steps, real change: building resilience gently",
    excerpt: "Resilience isn't about being strong all the time — it's about the small, kind choices we make each day. Here's how to begin.",
    date: "12 June 2026",
    read: "5 min read",
    body: [
      "Resilience is often misunderstood. We picture it as toughness — pushing through, never faltering. In truth, resilience is softer and steadier than that. It's the quiet capacity to bend without breaking, and to find our way back after hard days.",
      "## It's built, not born",
      "Resilience isn't a fixed trait you either have or don't. It grows through small, repeated experiences of coping — noticing you got through something, and learning you can again.",
      "## Where to begin",
      "- Name one feeling honestly each day, without judging it",
      "- Do one small thing that future-you will thank you for",
      "- Let yourself rest — recovery is part of strength",
      "- Reach for connection, even a short message to someone kind",
      "## Be patient with the process",
      "Some days will feel like going backwards. That's not failure — it's how growth actually looks. Every gentle choice to keep going is resilience in action.",
      "If you'd like support building your own resilience, our Resilience and Personal Development support is a good place to start.",
    ],
  },
  {
    slug: "what-healthy-love-feels-like",
    category: "Healthy Relationships",
    title: "What healthy love actually feels like",
    excerpt: "After an unhealthy relationship, it can be hard to know what safe feels like. These are the quiet signs of respect and care.",
    date: "28 May 2026",
    read: "6 min read",
    body: [
      "After an unhealthy relationship, safety can feel unfamiliar — even uncomfortable at first. When you're used to walking on eggshells, calm can feel like something is missing. It isn't. It's what healthy feels like.",
      "## The quiet signs of respect",
      "- You can disagree without fear",
      "- Your 'no' is heard and honoured",
      "- You feel free to see friends and family",
      "- Your feelings are met with curiosity, not defensiveness",
      "- You feel more yourself, not less",
      "## Healthy love is steady, not intense",
      "Intensity can be mistaken for love, but constant highs and lows are often a sign of instability. Healthy love tends to feel calmer — dependable, warm, and safe.",
      "## Relearning takes time",
      "If trust feels hard, that's understandable. Rebuilding your sense of what's healthy is a journey, and you're allowed to take it slowly, with support around you.",
    ],
  },
  {
    slug: "three-minutes-of-calm",
    category: "Mindfulness",
    title: "Three minutes of calm you can find anywhere",
    excerpt: "You don't need a quiet room or an hour of free time. Try this micro-practice between the moments of a busy day.",
    date: "9 May 2026",
    read: "3 min read",
    body: [
      "We often think we need the perfect conditions to feel calm — silence, space, time. But calm can be found in the small gaps of an ordinary day, in just a few minutes.",
      "## A three-minute reset",
      "- **Minute one:** notice your breath, without changing it",
      "- **Minute two:** slow the out-breath, letting your shoulders drop",
      "- **Minute three:** name one thing you're grateful for right now",
      "## Anchor it to something you already do",
      "Try it while the kettle boils, before you open your laptop, or in the car before you drive off. Attaching calm to an existing habit makes it far easier to keep.",
      "Small moments of calm, repeated often, gently retrain the nervous system toward steadiness.",
    ],
  },
  {
    slug: "rediscovering-yourself-after-a-life-transition",
    category: "Recovery",
    title: "Rediscovering yourself after a life transition",
    excerpt: "Separation, loss or change can leave us unsure of who we are. Reconnecting with your identity is a journey worth taking.",
    date: "21 April 2026",
    read: "7 min read",
    body: [
      "Big transitions — separation, loss, a change in health or role — can leave us feeling unmoored. When so much of our identity was tied to a relationship or routine, we can be left asking: who am I now?",
      "## Give yourself permission to not know yet",
      "You don't have to have it figured out. Identity isn't rebuilt overnight; it's rediscovered gradually, through small acts of curiosity about what you enjoy and value.",
      "## Gentle ways to reconnect",
      "- Revisit an interest you set aside",
      "- Notice what energises you and what drains you",
      "- Spend time with people who reflect your strengths back to you",
      "- Let go of who you 'should' be, and get curious about who you are",
      "## You are still here",
      "Transitions change our circumstances, but they don't erase us. Underneath the change, your values and your worth remain. Reconnecting with them is a journey worth taking — and you don't have to take it alone.",
    ],
  },
];

/** Frequently asked questions (checklist §12), as worded by the owner. */
export const faqs = [
  { q: "Who can use ThriveSphere?", a: "Adults aged 18 and above seeking practical support with emotional wellbeing, coping skills, resilience and everyday challenges." },
  { q: "Do I need a mental health diagnosis?", a: "No. A diagnosis is not required to access our wellbeing support." },
  { q: "Are your practitioners qualified?", a: "Yes. Our practitioners are experienced Registered Mental Health Nurses with professional backgrounds in face-to-face and remote mental health support." },
  { q: "Is ThriveSphere a counselling or psychotherapy service?", a: "No. We provide non-clinical wellbeing support, psychoeducation and practical coping skills development." },
  { q: "Can I have more than six sessions?", a: "Yes. Support is flexible and can continue according to individual needs, suitability and agreed goals." },
  { q: "Can I book without purchasing a package?", a: "Yes. Individual sessions are available, and packages are optional." },
  { q: "Do you offer evening and weekend appointments?", a: "Yes, subject to availability." },
  { q: "Are sessions confidential?", a: "We respect confidentiality and handle personal information securely, subject to clearly explained safeguarding and legal obligations." },
  { q: "What happens if I need urgent mental health support?", a: "ThriveSphere is not an emergency service. Clients requiring urgent or emergency support should contact appropriate local emergency or healthcare services." },
];

/**
 * Signposting directory — where we point people when their needs fall outside
 * ThriveSphere's scope. Rendered on Resources and Contact, and used inside the
 * Book flow. In Stage 2 this seeds the `signposting_directory` table and powers
 * the admin referral picker so recorded referrals map to real organisations.
 */
export type SignpostCategory =
  | "emergency"
  | "mental-health"
  | "domestic-abuse"
  | "safeguarding"
  | "practical";

export type Signpost = {
  name: string;
  category: SignpostCategory;
  phone?: string;
  url?: string;
  detail: string;
  /** Shown with visual priority — use for life-threatening situations. */
  urgent?: boolean;
};

export const signpostCategories: { key: SignpostCategory; label: string }[] = [
  { key: "emergency", label: "Emergency & crisis" },
  { key: "mental-health", label: "Mental health support" },
  { key: "domestic-abuse", label: "Domestic abuse & safety" },
  { key: "safeguarding", label: "Safeguarding" },
  { key: "practical", label: "Practical & financial" },
];

export const signposts: Signpost[] = [
  {
    name: "Emergency services",
    category: "emergency",
    phone: "999",
    detail: "If you or someone else is in immediate danger, or life is at risk, call 999 now.",
    urgent: true,
  },
  {
    name: "Samaritans",
    category: "emergency",
    phone: "116 123",
    url: "https://www.samaritans.org",
    detail: "Free, confidential, 24/7. For anyone struggling to cope, whatever you're going through.",
    urgent: true,
  },
  {
    name: "Shout",
    category: "emergency",
    phone: "Text SHOUT to 85258",
    url: "https://giveusashout.org",
    detail: "Free, confidential, 24/7 text support if you'd rather not speak to someone out loud.",
    urgent: true,
  },
  {
    name: "NHS 111 — mental health option",
    category: "mental-health",
    phone: "111 (select the mental health option)",
    url: "https://111.nhs.uk",
    detail: "24/7 NHS mental health advice and urgent support when it isn't a 999 emergency.",
  },
  {
    name: "Your GP",
    category: "mental-health",
    detail:
      "Your first route to NHS assessment, treatment and referral. ThriveSphere is not a substitute for your GP, and we'll often encourage you to speak to them.",
  },
  {
    name: "NHS Talking Therapies",
    category: "mental-health",
    url: "https://www.nhs.uk/nhs-services/mental-health-services/nhs-talking-therapies/",
    detail: "Free NHS talking therapy for anxiety and depression in England. You can refer yourself.",
  },
  {
    name: "Mind",
    category: "mental-health",
    phone: "0300 102 1234",
    url: "https://www.mind.org.uk",
    detail: "Information, advice and local services for anyone experiencing a mental health problem.",
  },
  {
    name: "National Domestic Abuse Helpline",
    category: "domestic-abuse",
    phone: "0808 2000 247",
    url: "https://www.nationaldahelpline.org.uk",
    detail: "Free, confidential, 24/7, run by Refuge. Support for anyone experiencing domestic abuse.",
  },
  {
    name: "Men's Advice Line",
    category: "domestic-abuse",
    phone: "0808 8010 327",
    url: "https://mensadviceline.org.uk",
    detail: "Confidential support for men experiencing domestic abuse.",
  },
  {
    name: "Galop",
    category: "domestic-abuse",
    phone: "0800 999 5428",
    url: "https://galop.org.uk",
    detail: "Support for LGBT+ people experiencing abuse, violence or hate crime.",
  },
  {
    name: "Local authority adult safeguarding",
    category: "safeguarding",
    detail:
      "If an adult at risk is being abused or neglected, contact the adult social care safeguarding team at their local council. In an emergency call 999.",
  },
  {
    name: "Citizens Advice",
    category: "practical",
    url: "https://www.citizensadvice.org.uk",
    detail: "Free, independent advice on money, housing, work, benefits and legal problems.",
  },
  {
    name: "Shelter",
    category: "practical",
    phone: "0808 800 4444",
    url: "https://england.shelter.org.uk",
    detail: "Housing and homelessness advice, including emergency housing.",
  },
];
