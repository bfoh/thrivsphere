export type PolicySection = { heading: string; body?: string[]; bullets?: string[] };
export type Policy = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  /**
   * Semantic version of the policy text. Stage 2 pins every consent record to
   * the version the client actually accepted, so bumping this here is what
   * makes a re-consent prompt appear. Bump on any material wording change.
   */
  version: string;
  /** ISO date this version takes effect. */
  effectiveFrom: string;
  /**
   * `public` policies are published on the website. `internal` policies are
   * operating procedures surfaced only in the Stage 2 admin area.
   */
  audience: "public" | "internal";
  /** Shown in the client journey — consent screens reference these by slug. */
  requiresConsent?: boolean;
  sections: PolicySection[];
};

const updated = "Last reviewed: July 2026";
const V = "1.0.0";
const FROM = "2026-07-01";

export const policies: Record<string, Policy> = {
  privacy: {
    slug: "privacy",
    requiresConsent: true,
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Privacy Policy",
    eyebrow: "Privacy · UK GDPR",
    intro:
      "This policy explains how ThrivSphere Wellbeing CIC collects, uses and protects your personal information in line with UK GDPR and the Data Protection Act 2018.",
    sections: [
      { heading: "Who we are", body: [`ThrivSphere Wellbeing CIC is a UK-registered Community Interest Company and the data controller for the information you provide. You can contact us at hello@thrivsphere.org. ${updated}.`] },
      {
        heading: "What we collect",
        body: ["We only collect information you choose to share with us, which may include:"],
        bullets: ["Your name (a first name is enough) and contact details", "Information you provide in enquiry, booking or newsletter forms", "Session-related notes kept securely and confidentially", "Website analytics data (only with your consent)"],
      },
      {
        heading: "How we use your information",
        bullets: ["To respond to your enquiry and arrange your sessions", "To provide wellbeing support, coaching and resources", "To send newsletters you have subscribed to (you can unsubscribe anytime)", "To meet our safeguarding and legal responsibilities"],
      },
      { heading: "Lawful basis", body: ["We process your data on the basis of your consent, our legitimate interest in providing wellbeing services, and to meet legal obligations. Special category (health) data is processed only with your explicit consent or where necessary for the provision of care."] },
      { heading: "How we protect it", body: ["Your data is stored securely, access is restricted to those who need it, and we use reputable, GDPR-compliant service providers. We never sell your data."] },
      { heading: "Your rights", body: ["You have the right to access, correct, delete or restrict your data, to withdraw consent, and to complain to the Information Commissioner's Office (ICO). To exercise any right, email hello@thrivsphere.org."] },
      { heading: "Retention", body: ["We keep personal data only as long as necessary for the purposes above and in line with our Records Retention Policy, after which it is securely deleted."] },
    ],
  },
  cookies: {
    slug: "cookies",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Cookie Policy",
    eyebrow: "Cookies",
    intro: "This policy explains how ThrivSphere uses cookies and similar technologies on this website.",
    sections: [
      { heading: "What are cookies?", body: ["Cookies are small text files stored on your device that help websites function and understand how they are used."] },
      {
        heading: "How we use cookies",
        bullets: ["Essential cookies — required for the site to work and to remember your cookie choice.", "Analytics cookies (optional) — help us understand how the site is used so we can improve it. These are only set if you accept."],
      },
      { heading: "Managing cookies", body: ["When you first visit, you can choose 'Accept all' or 'Essential only'. You can change your mind at any time by clearing your browser storage, and you can control cookies through your browser settings."] },
      { heading: "Contact", body: [`If you have questions about our use of cookies, email hello@thrivsphere.org. ${updated}.`] },
    ],
  },
  safeguarding: {
    slug: "safeguarding",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Safeguarding Policy",
    eyebrow: "Safeguarding",
    intro: "The safety and wellbeing of the people we support is our highest priority. This statement summarises our commitment to safeguarding adults at risk.",
    sections: [
      { heading: "Our commitment", body: ["ThrivSphere Wellbeing CIC is committed to creating a safe, respectful environment and to protecting adults at risk of harm, abuse or neglect."] },
      {
        heading: "Our responsibilities",
        bullets: ["Treating everyone with dignity, respect and compassion", "Recognising and responding appropriately to safeguarding concerns", "Sharing information with relevant agencies where there is a risk of serious harm", "Ensuring staff and facilitators understand their safeguarding duties"],
      },
      { heading: "Confidentiality and its limits", body: ["We keep your information confidential. However, where we believe there is a serious risk of harm to you or another person, we may need to share information with appropriate services. Wherever possible we will discuss this with you first."] },
      { heading: "In an emergency", body: ["If you or someone else is in immediate danger, call 999. For urgent emotional support, contact Samaritans on 116 123 (free, 24/7). For domestic abuse, call the National Domestic Abuse Helpline on 0808 2000 247."] },
      { heading: "Raising a concern", body: [`If you have a safeguarding concern, please contact our Designated Safeguarding Lead at hello@thrivsphere.org. ${updated}.`] },
    ],
  },
  confidentiality: {
    slug: "confidentiality",
    requiresConsent: true,
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Confidentiality Statement",
    eyebrow: "Confidentiality",
    intro: "Confidentiality sits at the heart of everything we do. This statement explains how we protect what you share with us.",
    sections: [
      { heading: "Your privacy is respected", body: ["What you share in your sessions and communications with ThrivSphere is treated as confidential and handled with care, in line with professional standards and UK GDPR."] },
      {
        heading: "When confidentiality may be limited",
        body: ["There are rare circumstances where we may need to share information without your consent:"],
        bullets: ["Where there is a serious risk of harm to you or another person", "Where a child or adult at risk may be in danger", "Where we are required to do so by law"],
      },
      { heading: "Our promise", body: [`We will always aim to be open with you about confidentiality, and wherever possible we will talk to you before sharing any information. ${updated}.`] },
    ],
  },
  accessibility: {
    slug: "accessibility",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Accessibility Statement",
    eyebrow: "Accessibility",
    intro: "We want ThrivSphere to be usable and welcoming for everyone. Accessibility is one of our core values.",
    sections: [
      { heading: "Our aim", body: ["We are committed to meeting the Web Content Accessibility Guidelines (WCAG) 2.1 AA standard and to continuously improving the accessibility of our website and services."] },
      {
        heading: "What we do",
        bullets: ["Clear, readable typography and strong colour contrast", "Keyboard-navigable pages and descriptive links", "Responsive design that works on phones, tablets and computers", "Plain, compassionate language"],
      },
      { heading: "Need something in a different format?", body: [`If you have difficulty accessing any part of our site or services, please contact hello@thrivsphere.org and we will do our best to help. ${updated}.`] },
    ],
  },
  consent: {
    slug: "consent",
    requiresConsent: true,
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Consent Policy",
    eyebrow: "Consent",
    intro: "Nothing happens without your agreement. This policy explains what you are consenting to when you register with ThrivSphere, and how you can change your mind.",
    sections: [
      { heading: "Informed consent", body: ["Before your first session we ask you to confirm that you understand what ThrivSphere offers, what it does not offer, and how your information will be handled. We will never assume consent — you give it actively, and we record the version of each policy you agreed to."] },
      {
        heading: "What we ask you to confirm",
        bullets: ["That you are aged 18 or over", "That you understand ThrivSphere is a non-clinical wellbeing service and not a crisis, medical or therapy service", "That you understand the limits of confidentiality where there is a risk of serious harm", "That you agree to our Privacy Policy and how we handle your data", "That you accept our Terms & Conditions and Client Agreement"],
      },
      { heading: "Withdrawing consent", body: ["You can withdraw your consent at any time, for any reason, without having to explain yourself. Email hello@thrivsphere.org and we will stop processing your data for that purpose. Withdrawing consent does not affect anything lawfully done beforehand, and we may still need to keep certain records where the law or our safeguarding duties require it."] },
      { heading: "Capacity", body: ["We assume you have the capacity to consent unless there is clear reason to think otherwise. If we have concerns about capacity, we will pause, discuss it with you, and follow our Safeguarding Policy."] },
      { heading: "If you change your mind", body: [`You may stop using our services at any point. Please see our Payments, Cancellations, Refunds & No-Shows policy for how this affects any sessions you have already paid for. ${updated}.`] },
    ],
  },
  "scope-of-practice": {
    slug: "scope-of-practice",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Scope of Practice",
    eyebrow: "Scope of Practice",
    intro: "Being clear about what we do — and what we do not do — is part of keeping you safe. ThrivSphere is a non-clinical wellbeing, education and support service.",
    sections: [
      {
        heading: "What we provide",
        bullets: ["Emotional wellbeing support and wellbeing coaching", "Wellbeing education on resilience, relationships, boundaries and self-care", "Mindfulness and relaxation sessions", "Facilitated peer support groups", "Signposting and referral to appropriate specialist services"],
      },
      {
        heading: "What we do not provide",
        body: ["ThrivSphere does not, under any circumstances, offer:"],
        bullets: ["Clinical assessment, diagnosis or medical treatment", "Counselling, psychotherapy or psychiatric care", "Prescribing, medication advice or medication reviews", "Crisis, emergency or out-of-hours care", "Legal advice, court reports or fitness-for-work assessments", "Services to anyone under the age of 18"],
      },
      { heading: "Informed by professional experience", body: ["ThrivSphere is founded and delivered by experienced professionals with backgrounds in mental health and wellbeing. Our support is professional wellbeing support, education and signposting informed by extensive mental health experience. That experience informs how we work — it does not turn what we offer into a clinical service."] },
      { heading: "When we will signpost you elsewhere", body: ["If what you need falls outside this scope, we will tell you honestly and help you find the right support. This is not a rejection — matching people to the right service is part of our job. See our Referral & Signposting Policy."] },
      { heading: "Working within our limits", body: [`Our team will not work beyond their training, competence or role. If your needs change during our work together, we will review whether ThrivSphere remains the right service for you. ${updated}.`] },
    ],
  },
  "domestic-abuse": {
    slug: "domestic-abuse",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Domestic Abuse & Safe Disclosure",
    eyebrow: "Domestic Abuse",
    intro: "Domestic abuse affects people of every gender, age and background. This policy explains how we respond when someone tells us they are being harmed, and how we try to keep that conversation safe.",
    sections: [
      { heading: "You will be believed", body: ["If you tell us you are experiencing abuse, we will listen without judgement and without pressure. We will not tell you what to do, and we will not contact anyone on your behalf without discussing it with you, unless there is a risk of serious harm."] },
      {
        heading: "What domestic abuse can look like",
        bullets: ["Physical, sexual or emotional abuse", "Coercive or controlling behaviour", "Economic abuse — controlling money, work or resources", "Monitoring, isolation or threats", "Abuse by a partner, ex-partner or family member"],
      },
      { heading: "Safe disclosure", body: ["We know that reaching out can itself be dangerous. You can share only what feels safe. We will ask how we can contact you safely, whether it is safe to leave a message, and we will agree a plan if a session needs to end suddenly."] },
      {
        heading: "Where we will point you",
        bullets: ["Immediate danger — call 999. If you cannot speak, dial 999 then press 55 on a mobile", "National Domestic Abuse Helpline — 0808 2000 247, free and 24/7", "Men's Advice Line — 0808 8010 327", "Galop, for LGBT+ people — 0800 999 5428"],
      },
      { heading: "Our limits", body: [`ThrivSphere is not a refuge, a specialist domestic abuse service or an emergency service. We provide wellbeing support alongside specialist services, and we will always help you connect with them. ${updated}.`] },
    ],
  },
  crisis: {
    slug: "crisis",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Suicide, Self-Harm & Crisis Escalation",
    eyebrow: "Crisis & Risk",
    intro: "ThrivSphere is not a crisis service. This policy explains what we will do if you tell us you are thinking of ending your life or hurting yourself, so that there are no surprises.",
    sections: [
      { heading: "If you are in crisis right now", body: ["If you or someone else is in immediate danger, call 999. For free, confidential support 24/7, call Samaritans on 116 123, or text SHOUT to 85258. For urgent NHS mental health advice, call 111 and select the mental health option."] },
      { heading: "You can tell us", body: ["Talking about suicide or self-harm does not make it more likely to happen, and it will not get you thrown out of our service. We would much rather you told us."] },
      {
        heading: "What we will do",
        bullets: ["Take what you say seriously and stay with you in the conversation", "Talk with you about how much danger you are in right now", "Agree together what would help keep you safe today", "Encourage and support you to contact your GP, NHS 111 or a crisis service", "Where there is an immediate risk to life, contact emergency services — we will try to do this with you rather than behind your back"],
      },
      { heading: "Why we may break confidentiality", body: ["Where we believe there is a serious and immediate risk to your life or someone else's, we may share information without your consent. We do this only to keep people safe, we share only what is necessary, and we record what we did and why."] },
      { heading: "Between sessions", body: [`We do not monitor messages around the clock and cannot respond to crisis contact outside working hours. Please use the emergency contacts above — they are staffed 24/7 and we are not. ${updated}.`] },
    ],
  },
  complaints: {
    slug: "complaints",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Complaints & Feedback",
    eyebrow: "Complaints",
    intro: "If something has gone wrong, we want to know. Telling us will not affect the support you receive.",
    sections: [
      { heading: "How to raise something", body: ["Email hello@thrivsphere.org with the heading 'Complaint' or 'Feedback'. Tell us what happened, when, and what you would like to see put right. If writing it down is difficult, say so and we will find another way."] },
      {
        heading: "What happens next",
        bullets: ["We acknowledge your complaint within 5 working days", "We look into it properly and fairly", "We respond in full within 20 working days, or explain why we need longer", "We tell you what we are changing as a result"],
      },
      { heading: "If you are not satisfied", body: ["If our response does not resolve things, you can ask for it to be reviewed by a director of the CIC. For data protection concerns you can also complain to the Information Commissioner's Office at ico.org.uk."] },
      { heading: "Feedback that isn't a complaint", body: [`We also want to hear what worked. Feedback shapes how the service grows, and we review it regularly. ${updated}.`] },
    ],
  },
  edi: {
    slug: "edi",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Equality, Diversity & Inclusion",
    eyebrow: "Equality & Inclusion",
    intro: "ThrivSphere is for every adult who needs it. Inclusion is one of our core values, not an afterthought.",
    sections: [
      { heading: "Our commitment", body: ["We welcome adults aged 18 and over of any gender, ethnicity, faith, sexual orientation, disability, relationship status, immigration status or background. We will not discriminate, and we will challenge discrimination when we see it."] },
      {
        heading: "What this means in practice",
        bullets: ["Services open to women and men, with specific groups where these are genuinely helpful", "Language and forms that do not assume gender, family shape or background", "Accessible sessions and materials — see our Accessibility Statement", "Awareness of cultural context, including for the African diaspora communities we serve", "Willingness to be told when we get it wrong"],
      },
      { heading: "Gender-specific provision", body: ["Some groups and programmes are offered separately for women and for men, because shared experience can make people feel safer to speak. Our core one-to-one service is open to all adults regardless of gender."] },
      { heading: "Tell us what you need", body: [`If there is something that would make our service work better for you, please tell us at hello@thrivsphere.org. ${updated}.`] },
    ],
  },
  payments: {
    slug: "payments",
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Payments, Cancellations, Refunds & No-Shows",
    eyebrow: "Payments & Cancellations",
    intro: "Clear terms so you know where you stand before you pay. If cost is a barrier, please talk to us before deciding not to come.",
    sections: [
      { heading: "Paying for sessions", body: ["Fees are shown on our Pricing page and are payable in advance. Payment is taken securely by our payment provider — ThrivSphere never sees or stores your card details."] },
      {
        heading: "Session packages",
        bullets: ["Packages of 4 or 6 sessions are paid for up front", "Your remaining sessions are shown in your ThrivSphere account", "Sessions can be booked at your own pace within the package validity period", "Packages are for your use only and cannot be transferred"],
      },
      {
        heading: "Cancelling or rearranging",
        bullets: ["Give at least 24 hours' notice and we will rebook at no charge", "Less than 24 hours' notice: the session may be charged or deducted from your package", "We understand emergencies happen — talk to us and we will be fair"],
      },
      { heading: "No-shows", body: ["If you do not attend and have not told us, the session is treated as used. If you miss sessions repeatedly we will contact you to check you are alright and to talk about whether now is the right time for you."] },
      { heading: "If we cancel", body: ["If we have to cancel, you will be offered an alternative time or a full refund of that session — your choice."] },
      { heading: "Refunds", body: [`Unused sessions within their validity period can be refunded on request, less any sessions already delivered. Refunds are made to the original payment method within 14 days. If cost is a barrier at any point, contact us — concessionary places may be available. ${updated}.`] },
    ],
  },
  terms: {
    slug: "terms",
    requiresConsent: true,
    version: V,
    effectiveFrom: FROM,
    audience: "public",
    title: "Terms & Conditions",
    eyebrow: "Terms & Conditions",
    intro: "These terms explain the basis on which you may use the ThrivSphere website and services.",
    sections: [
      { heading: "About our service", body: ["ThrivSphere Wellbeing CIC provides wellbeing education, emotional wellbeing support, coaching, mindfulness, peer support and signposting to adults aged 18 and over. We are a non-clinical service. We do not carry out clinical assessment, make diagnoses, or provide medical or psychological treatment, and we do not provide crisis services, emergency care, legal advice or fitness-for-work assessments."] },
      { heading: "Not a crisis service", body: ["Our services are not a substitute for medical, psychiatric or emergency care, or for your GP. In an emergency call 999 or Samaritans on 116 123."] },
      { heading: "Eligibility", body: ["Our services are available to adults aged 18 and over, women and men. You will be asked to confirm you are 18 or over when you register. We do not currently provide services to under-18s."] },
      {
        heading: "Bookings and payments",
        bullets: ["Sessions are booked through your ThrivSphere account and confirmed automatically", "Fees are shown on our Pricing page and are payable in advance", "Please give at least 24 hours' notice to cancel or reschedule", "See our Payments, Cancellations, Refunds & No-Shows policy for full details"],
      },
      { heading: "Your responsibilities", body: ["You agree to provide accurate information and to engage with our services respectfully. You remain responsible for your own decisions and wellbeing."] },
      { heading: "Website content", body: [`Content on this site is for general wellbeing information only and does not constitute medical or legal advice. ${updated}.`] },
    ],
  },
};
