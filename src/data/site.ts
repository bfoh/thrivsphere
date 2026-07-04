export const brand = {
  name: "ThrivSphere Wellbeing CIC",
  short: "ThrivSphere",
  tagline: "Empowering Wellbeing. Building Resilience. Inspiring Hope.",
  email: "hello@thrivsphere.org.uk",
  location: "United Kingdom · Online Wellbeing Platform",
};

/** Unified nav item: either scrolls to a home section, or links to a route. */
export type NavItem = { label: string; section?: string; href?: string };

export const nav: NavItem[] = [
  { label: "About", section: "about" },
  { label: "Services", section: "services" },
  { label: "Programme", section: "programme" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "Blog", href: "/blog" },
];

export const policyLinks = [
  { label: "Privacy Policy (UK GDPR)", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Safeguarding Policy", href: "/safeguarding" },
  { label: "Confidentiality Statement", href: "/confidentiality" },
  { label: "Accessibility Statement", href: "/accessibility" },
  { label: "Terms & Conditions", href: "/terms" },
];

export const values = [
  "Compassion",
  "Respect",
  "Empowerment",
  "Inclusion",
  "Hope",
  "Integrity",
  "Confidentiality",
  "Accessibility",
  "Professionalism",
  "Community",
];

export const audience = [
  "Emotional abuse",
  "Coercive control",
  "Unhealthy relationships",
  "Separation or divorce",
  "Anxiety",
  "Depression",
  "Stress & burnout",
  "Low confidence",
  "Social isolation",
  "Life transitions",
  "Mental health challenges",
  "Recovery & healing",
];

export type Service = {
  icon: string;
  title: string;
  desc: string;
};

export const services: Service[] = [
  {
    icon: "heart",
    title: "One-to-One Emotional Wellbeing Support",
    desc: "Confidential individual sessions offering emotional support, guidance and practical tools to improve wellbeing and resilience.",
  },
  {
    icon: "compass",
    title: "Wellbeing Coaching",
    desc: "Goal-focused coaching to build confidence, develop resilience, strengthen emotional wellbeing and support personal growth.",
  },
  {
    icon: "users",
    title: "Women's Wellbeing Circle",
    desc: "Facilitated online peer support groups — a safe space for discussion, encouragement and shared learning.",
  },
  {
    icon: "lotus",
    title: "Mindfulness & Wellbeing Sessions",
    desc: "Guided mindfulness to reduce stress, support emotional regulation, encourage relaxation and promote resilience.",
  },
  {
    icon: "book",
    title: "Wellbeing Education",
    desc: "Programmes covering emotional resilience, healthy relationships, coercive control awareness, boundaries and self-care.",
  },
  {
    icon: "briefcase",
    title: "Workplace Wellbeing Support",
    desc: "Education and coaching to maintain wellbeing while working, returning to work or balancing life's responsibilities.",
  },
  {
    icon: "webinar",
    title: "Educational Webinars",
    desc: "Evidence-informed webinars delivered by professionals and guest speakers, open to our growing community.",
  },
  {
    icon: "library",
    title: "Resource Centre",
    desc: "A digital wellbeing library of articles, downloadable guides, videos, exercises and trusted self-help resources.",
  },
];

export const educationTopics = [
  "Emotional wellbeing",
  "Anxiety & depression",
  "Emotional resilience",
  "Healthy relationships",
  "Emotional abuse awareness",
  "Coercive control awareness",
  "Self-care",
  "Confidence building",
  "Healthy boundaries",
  "Personal growth",
];

export const programme = {
  name: "ThrivSphere Women's Wellbeing & Resilience Programme",
  aim: "To support women experiencing emotional abuse, anxiety, depression, social isolation, unhealthy relationships and life transitions through accessible, remote wellbeing services.",
  objectives: [
    "Improve emotional wellbeing",
    "Strengthen resilience",
    "Build confidence",
    "Promote healthy coping strategies",
    "Reduce isolation",
    "Encourage mindfulness",
    "Support recovery & long-term wellbeing",
  ],
  activities: [
    "Monthly Wellbeing Circle",
    "One-to-one emotional wellbeing support",
    "Wellbeing coaching",
    "Mindfulness sessions",
    "Educational webinars",
    "Guest speaker events",
    "Downloadable resources",
    "Community discussions",
  ],
  outcomes: [
    "Feel more confident",
    "Improve emotional wellbeing",
    "Develop healthier coping strategies",
    "Build resilience",
    "Feel less isolated",
    "Improve self-awareness",
    "Feel empowered to move forward positively",
  ],
};

export const founder = {
  name: "Patience Barning T",
  titles: ["Registered Mental Health Nurse (RMN)", "SCPHN · Occupational Health Nurse"],
  bio: [
    "ThrivSphere Wellbeing CIC was founded by Patience Barning T, a Registered Mental Health Nurse and Specialist Community Public Health / Occupational Health Nurse with a deep commitment to women's emotional, mental and social wellbeing.",
    "Drawing on years of clinical and community experience, Patience created ThrivSphere as a safe, confidential and compassionate online space where women can access wellbeing education, one-to-one support, coaching, mindfulness and peer connection — regardless of where they are in the world.",
    "Her vision is simple and powerful: that every woman navigating emotional abuse, anxiety, isolation or life transition can find a place to heal, grow and thrive.",
  ],
};

export const impact = [
  { stat: "100%", label: "Confidential & compassionate" },
  { stat: "Online", label: "Accessible anywhere in the UK" },
  { stat: "Women-first", label: "Growing to support all in time" },
  { stat: "CIC", label: "Community Interest Company" },
];

export type Plan = {
  name: string;
  price: string;
  unit: string;
  blurb: string;
  features: string[];
  featured?: boolean;
  cta: string;
};

export const plans: Plan[] = [
  {
    name: "Wellbeing Circle",
    price: "£12",
    unit: "per month",
    blurb: "Facilitated monthly peer support and community connection.",
    features: [
      "Monthly online Wellbeing Circle",
      "Community discussion space",
      "Access to recorded webinars",
      "Downloadable wellbeing guides",
    ],
    cta: "Join the Circle",
  },
  {
    name: "One-to-One Support",
    price: "£45",
    unit: "per 50-min session",
    blurb: "Confidential individual emotional wellbeing support & coaching.",
    features: [
      "1:1 emotional wellbeing session",
      "Personalised wellbeing plan",
      "Practical tools & resources",
      "Secure online video sessions",
      "Flexible evening availability",
    ],
    featured: true,
    cta: "Book a session",
  },
  {
    name: "Resilience Programme",
    price: "£120",
    unit: "6-week programme",
    blurb: "Our flagship structured journey to lasting resilience.",
    features: [
      "6 guided weekly sessions",
      "Mindfulness & coaching blend",
      "Wellbeing Circle membership",
      "Workbook & progress tracking",
      "Priority booking",
    ],
    cta: "Start the programme",
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
      "If you are in immediate danger call 999. For confidential advice, the National Domestic Abuse Helpline is free, 24/7, on 0808 2000 247. ThrivSphere can also walk alongside you and signpost specialist services.",
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
      "Healing isn't linear, and progress can be quiet. Be patient with yourself. Working alongside a supportive therapist or coach can help you rebuild confidence at a pace that feels safe.",
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
      "If you'd like support building your own resilience, our Wellbeing & Resilience Programme is a warm, structured place to start.",
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

export const faqs = [
  { q: "Is ThrivSphere a crisis service?", a: "No. We are an outpatient wellbeing service and do not provide crisis, emergency or fitness-for-work assessments. In an emergency call 999, or Samaritans on 116 123." },
  { q: "Are sessions confidential?", a: "Yes. Confidentiality is central to everything we do and is handled in line with UK GDPR and our Confidentiality Policy, with safeguarding exceptions where there is a risk of serious harm." },
  { q: "Do I have to use my full name?", a: "No. You're welcome to share only what feels comfortable. A first name is enough to begin." },
  { q: "Where are sessions held?", a: "All sessions are online via secure video, so you can access support from anywhere in the UK." },
  { q: "Who can access ThrivSphere?", a: "Currently women aged 18+. Our long-term vision is to extend support to men experiencing similar challenges." },
];
