import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { can } from "@/lib/authz";
import { Section } from "@/components/admin/RecordUI";
import { assetCounts, getKitHistory } from "@/lib/queries/marketing";
import { h1, lead } from "@/components/admin/marketing/ui";

export const metadata: Metadata = { title: "Marketing", robots: { index: false, follow: false } };

const dt = (v: Date) => v.toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long", year: "numeric" });

/**
 * The marketing hub's front page: where things stand, and what's still to set up.
 */
export default async function MarketingOverview() {
  const actor = await requireCapability("marketing:write", { entity: "marketing_assets", action: "view", detail: "opened the marketing hub" });
  const [{ status, approvals }, counts] = await Promise.all([getKitHistory(), assetCounts()]);
  const approval = status.approved ? approvals.find((a) => a.versionId === status.approved!.id) : null;

  const setup: { done: boolean; label: string; detail: string }[] = [
    {
      done: !!status.approved,
      label: "Brand Kit approved",
      detail: status.approved ? `Version ${status.approved.number}, approved ${dt(approval!.approvedAt)}.` : "Patience reads and approves the first version. Until then, the website's wording stands in.",
    },
    {
      done: !!process.env.ANTHROPIC_API_KEY,
      label: "AI writing help",
      detail: process.env.ANTHROPIC_API_KEY ? "Switched on." : "Needs an Anthropic account owned by the business, with a monthly spending limit.",
    },
    {
      done: !!process.env.RECRAFT_API_KEY,
      label: "AI images",
      detail: process.env.RECRAFT_API_KEY ? "Switched on." : "Needs an image-generator account (Recraft recommended), with its own spending limit.",
    },
    {
      done: false,
      label: "Business social accounts",
      detail: "Instagram and a Facebook Page, a LinkedIn Page, and a Google Business Profile set up as a service-area business with no address shown. Owned by ThriveSphere, not a personal account.",
    },
  ];

  const cards = [
    {
      href: "/admin/marketing/brand",
      title: "Brand kit",
      text: status.draft ? `Version ${status.draft.number} is waiting for Patience's approval.` : status.approved ? `Version ${status.approved.number} in use.` : "Not started yet.",
    },
    { href: "/admin/marketing/library", title: "Photos & graphics", text: `${counts.photos} photo${counts.photos === 1 ? "" : "s"}, ${counts.graphics} graphic${counts.graphics === 1 ? "" : "s"}${counts.missingAlt ? `; ${counts.missingAlt} without a description` : ""}${counts.expiring ? `; ${counts.expiring} licence${counts.expiring === 1 ? "" : "s"} ending soon` : ""}.` },
    { href: "/admin/marketing/graphics", title: "Make a graphic", text: "Branded images for Instagram, Facebook, LinkedIn and Google, from templates." },
    ...(can(actor, "analytics:read") ? [{ href: "/admin/marketing/ai-usage", title: "AI usage", text: "What AI help has cost this month, against the monthly limit." }] : []),
  ];

  return (
    <div className="adm-page">
      <h1 className="adm-title" style={h1}>Brand &amp; Marketing</h1>
      <p style={lead}>
        Where ThriveSphere&apos;s marketing is planned, written and checked. Everything follows the Brand Kit, and nothing is
        posted automatically: the hub prepares it, a reviewer approves it, and staff post it by hand.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14, marginBottom: 22 }}>
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card" style={{ padding: "18px 20px", textDecoration: "none", color: "var(--ink)", display: "block" }}>
            <strong style={{ display: "block", fontSize: 15.5, color: "var(--navy)", marginBottom: 6 }}>{c.title}</strong>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--navy-soft)" }}>{c.text}</span>
          </Link>
        ))}
      </div>

      <Section title="Getting set up" subtitle="Some parts need accounts that belong to the business.">
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {setup.map((s) => (
            <li key={s.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span aria-hidden style={{ flex: "0 0 22px", height: 22, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 800, background: s.done ? "var(--teal-deep)" : "var(--a-line)", color: s.done ? "#fff" : "var(--navy-soft)" }}>
                {s.done ? "✓" : ""}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>
                <strong style={{ color: "var(--navy)" }}>{s.label}</strong>
                <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                <br />
                <span style={{ color: "var(--navy-soft)" }}>{s.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="The rules every piece follows" subtitle="Checked automatically where possible, and by the reviewer every time.">
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
          <li>No promises to treat, cure or improve a condition, and nothing that puts someone off seeing their GP.</li>
          <li>No client stories, quotes or reviews, and nothing AI-written presented as someone&apos;s words.</li>
          <li>On Instagram and Facebook, describe the service, not the reader (&ldquo;Support with worry&rdquo;, not &ldquo;Are you anxious?&rdquo;).</li>
          <li>Any mention of suicide or self-harm carries the Samaritans line, 116 123.</li>
          <li>AI-made images show no people and no words, and are labelled as AI on Instagram.</li>
        </ul>
      </Section>

      <Section title="Still to come" subtitle="Built in stages; each arrives here when it's ready.">
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
          <li>Posts for each channel, written with AI help, checked, approved and ready to post, with a calendar and awareness days.</li>
          <li>The email newsletter, for people who sign up.</li>
          <li>Insights: how people found ThriveSphere, and what&apos;s working.</li>
        </ul>
      </Section>
    </div>
  );
}
