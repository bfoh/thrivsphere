export type PolicySection = { heading: string; body?: string[]; bullets?: string[] };
export type Policy = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  sections: PolicySection[];
};

const updated = "Last reviewed: July 2026";

export const policies: Record<string, Policy> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Privacy · UK GDPR",
    intro:
      "This policy explains how ThrivSphere Wellbeing CIC collects, uses and protects your personal information in line with UK GDPR and the Data Protection Act 2018.",
    sections: [
      { heading: "Who we are", body: [`ThrivSphere Wellbeing CIC is a UK-registered Community Interest Company and the data controller for the information you provide. You can contact us at hello@thrivsphere.org.uk. ${updated}.`] },
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
      { heading: "Your rights", body: ["You have the right to access, correct, delete or restrict your data, to withdraw consent, and to complain to the Information Commissioner's Office (ICO). To exercise any right, email hello@thrivsphere.org.uk."] },
      { heading: "Retention", body: ["We keep personal data only as long as necessary for the purposes above and in line with our Records Retention Policy, after which it is securely deleted."] },
    ],
  },
  cookies: {
    slug: "cookies",
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
      { heading: "Contact", body: [`If you have questions about our use of cookies, email hello@thrivsphere.org.uk. ${updated}.`] },
    ],
  },
  safeguarding: {
    slug: "safeguarding",
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
      { heading: "Raising a concern", body: [`If you have a safeguarding concern, please contact our Designated Safeguarding Lead at hello@thrivsphere.org.uk. ${updated}.`] },
    ],
  },
  confidentiality: {
    slug: "confidentiality",
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
    title: "Accessibility Statement",
    eyebrow: "Accessibility",
    intro: "We want ThrivSphere to be usable and welcoming for everyone. Accessibility is one of our core values.",
    sections: [
      { heading: "Our aim", body: ["We are committed to meeting the Web Content Accessibility Guidelines (WCAG) 2.1 AA standard and to continuously improving the accessibility of our website and services."] },
      {
        heading: "What we do",
        bullets: ["Clear, readable typography and strong colour contrast", "Keyboard-navigable pages and descriptive links", "Responsive design that works on phones, tablets and computers", "Plain, compassionate language"],
      },
      { heading: "Need something in a different format?", body: [`If you have difficulty accessing any part of our site or services, please contact hello@thrivsphere.org.uk and we will do our best to help. ${updated}.`] },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    eyebrow: "Terms & Conditions",
    intro: "These terms explain the basis on which you may use the ThrivSphere website and services.",
    sections: [
      { heading: "About our service", body: ["ThrivSphere Wellbeing CIC provides wellbeing education, emotional wellbeing support, coaching, mindfulness and peer support. We are an outpatient wellbeing service and do not provide crisis services, emergency care, medical treatment, legal advice or fitness-for-work assessments."] },
      { heading: "Not a crisis service", body: ["Our services are not a substitute for medical, psychiatric or emergency care. In an emergency call 999 or Samaritans on 116 123."] },
      {
        heading: "Bookings and payments",
        bullets: ["Sessions are arranged by request and confirmed by email", "Fees are shown on our Pricing page and payable in advance unless agreed otherwise", "Please give at least 24 hours' notice to reschedule where possible"],
      },
      { heading: "Your responsibilities", body: ["You agree to provide accurate information and to engage with our services respectfully. You remain responsible for your own decisions and wellbeing."] },
      { heading: "Website content", body: [`Content on this site is for general wellbeing information only and does not constitute medical or legal advice. ${updated}.`] },
    ],
  },
};
