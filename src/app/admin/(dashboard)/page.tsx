import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireCapability } from "@/lib/guard";
import { can } from "@/lib/authz";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { kindLabel } from "@/lib/allocation";
import { clock, firstName, greeting, longDate, sessionPhase, trend, LDN } from "@/lib/dashboard";
import { formatPence } from "@/lib/revenue";
import { getToday, type Today } from "@/lib/queries/dashboard";
import { Badge, Card, Page, PageHeader, Stat, Stats } from "@/components/admin/ui";
import { NavIcon } from "@/components/admin/NavIcon";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * The "Today" page: what's on, what's waiting, and how the month is going.
 *
 * Reached only by staff: `proxy.ts` requires a session, and this guard call
 * requires the capability and writes the audit row. Both checks are deliberate
 * — the proxy is path-based and this one is not.
 */
export default async function AdminPage() {
  const actor = await requireCapability("client:read:any", {
    entity: "admin_dashboard",
    action: "view",
    detail: "opened admin dashboard",
  });

  // One clock reading for the whole page, taken before any query, so nothing
  // on it disagrees about what "now" is.
  const now = new Date();
  const [today, [me]] = await Promise.all([
    getToday(actor, now),
    getDb().select({ displayName: users.displayName }).from(users).where(eq(users.id, actor.userId)).limit(1),
  ]);
  const name = firstName(me?.displayName);
  const f = today.figures;

  const quick = [
    can(actor, "blog:write") && { label: "New blog post", href: "/admin/blog/new" },
    can(actor, "availability:manage") && { label: "Block time", href: "/admin/availability#blocked-time" },
    can(actor, "accounting:manage") && { label: "Record expense", href: "/admin/accounting#record-expense" },
  ].filter((q): q is { label: string; href: string } => !!q);

  return (
    <Page>
      <PageHeader
        title={name ? `${greeting(now)}, ${name}` : greeting(now)}
        description={`${longDate(now)} · Everything opened here is logged.`}
        actions={quick.map((q) => (
          <Link key={q.href} href={q.href} className="pill pill-ghost" style={{ minHeight: 38, padding: "0 14px", fontSize: 13.5, gap: 6 }}>
            <NavIcon name="plus" size={15} />
            {q.label}
          </Link>
        ))}
      />

      <Stats>
        <Stat
          label="Active clients"
          value={f.activeClients}
          href="/admin/clients"
          icon={<NavIcon name="users" />}
          hint={f.newClients[0] > 0 ? `${f.newClients[0]} new this month` : undefined}
          trend={trend(f.newClients[0], f.newClients[1], String, ["new client", "new clients"])}
        />
        <Stat
          label="Bookings this month"
          value={f.bookings[0]}
          href="/admin/appointments"
          icon={<NavIcon name="calendar" />}
          hint={`${f.upcoming} upcoming`}
          trend={trend(f.bookings[0], f.bookings[1])}
        />
        {f.enquiries && (
          <Stat
            label="Enquiries this month"
            value={f.enquiries[0]}
            href="/admin/enquiries?show=all"
            icon={<NavIcon name="inbox" />}
            trend={trend(f.enquiries[0], f.enquiries[1])}
          />
        )}
        {f.income && (
          <Stat
            label="Income this month"
            value={formatPence(f.income[0])}
            href="/admin/revenue"
            icon={<NavIcon name="trend" />}
            trend={trend(f.income[0], f.income[1], formatPence)}
          />
        )}
      </Stats>

      <div className="adm-today">
        <Sessions today={today} now={now} />
        <Attention today={today} />
      </div>
    </Page>
  );
}

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  completed: { label: "Attended", tone: "ok" },
  no_show: { label: "Missed", tone: "warn" },
};

function Sessions({ today, now }: { today: Today; now: Date }) {
  const { sessions, next } = today;
  return (
    <Card
      title="Today's sessions"
      subtitle={sessions.length === 0 ? "Nothing booked today" : `${sessions.length} booked · UK time`}
      actions={
        <Link href="/admin/appointments" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none", whiteSpace: "nowrap" }}>
          All appointments →
        </Link>
      }
    >
      {sessions.length === 0 ? (
        <p className="adm-empty">
          No sessions today.
          {next && (
            <>
              <br />
              Next:{" "}
              <strong style={{ color: "var(--navy)" }}>
                {next.startsAt.toLocaleString("en-GB", { timeZone: LDN, weekday: "short", day: "numeric", month: "short" })}, {clock(next.startsAt)}
              </strong>{" "}
              with {next.clientName ?? "a client"}, {next.withWhom === "you" ? "your session" : `with ${next.withWhom}`}.
            </>
          )}
        </p>
      ) : (
        <ul className="adm-sessions">
          {sessions.map((s) => {
            const phase = sessionPhase(s, now);
            const status = STATUS[s.status];
            return (
              <li key={s.id} className="adm-session" data-phase={phase}>
                <div className="adm-session-time">
                  <strong>{clock(s.startsAt)}</strong>
                  <span>to {clock(s.endsAt)}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="adm-session-who">
                    {s.clientId ? <Link href={`/admin/clients/${s.clientId}`}>{s.clientName}</Link> : <span>Unknown client</span>}
                    {phase === "now" && <Badge tone="info">Now</Badge>}
                    {phase === "to-close" && <Badge tone="warn">Not marked yet</Badge>}
                    {status && <Badge tone={status.tone}>{status.label}</Badge>}
                  </div>
                  <div className="adm-session-meta">
                    {kindLabel(s.kind)} · with {s.withWhom}
                    {s.mine && phase !== "done" && !s.hasLink && " · no meeting link yet"}
                  </div>
                </div>
                <div className="adm-session-actions">
                  {s.joinUrl && (
                    <a href={s.joinUrl} target="_blank" rel="noopener noreferrer" className="pill pill-teal">
                      <NavIcon name="video" size={15} /> Join
                    </a>
                  )}
                  {phase === "to-close" && (
                    <Link href="/admin/appointments#to-close" className="pill pill-ghost">
                      Mark attended
                    </Link>
                  )}
                  {s.clientId && (
                    <Link href={`/admin/clients/${s.clientId}#notes`} className="pill pill-ghost">
                      Notes
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

type Item = { key: string; href: string; icon: React.ComponentProps<typeof NavIcon>["name"]; title: string; text: string; tone?: "danger" | "warn" };

function Attention({ today }: { today: Today }) {
  const a = today.attention;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const outcomes = a.outcomesDue.slice(0, 3);

  const items: Item[] = [
    a.openConcerns > 0 && {
      key: "safeguarding",
      href: "/admin/safeguarding",
      icon: "shield",
      tone: "danger",
      title: plural(a.openConcerns, "open safeguarding concern", "open safeguarding concerns"),
      text: "Not yet closed. Check each has a next step.",
    },
    ...outcomes.map((o) => ({
      key: `outcome-${o.clientId}`,
      href: `/admin/clients/${o.clientId}#outcome`,
      icon: "clipboard" as const,
      title: `Record ${o.name}'s consultation outcome`,
      text: `Consultation ${o.consultedAt.toLocaleDateString("en-GB", { timeZone: LDN, day: "numeric", month: "short" })}. Ongoing sessions stay closed until it's recorded.`,
    })),
    a.outcomesDue.length > outcomes.length && {
      key: "outcomes-more",
      href: "/admin/clients",
      icon: "clipboard",
      title: `${a.outcomesDue.length - outcomes.length} more consultation outcomes to record`,
      text: "Open each client's record to record the outcome.",
    },
    a.toClose > 0 && {
      key: "to-close",
      href: "/admin/appointments#to-close",
      icon: "calendar",
      tone: "warn",
      title: plural(a.toClose, "past session to mark", "past sessions to mark"),
      text: "Say whether each was attended or missed, so sessions used and reports are right.",
    },
    a.newEnquiries > 0 && {
      key: "enquiries",
      href: "/admin/enquiries",
      icon: "inbox",
      title: plural(a.newEnquiries, "new enquiry", "new enquiries"),
      text: "Messages and callback requests waiting for a reply.",
    },
    a.worksheetsToReview > 0 && {
      key: "worksheets",
      href: "/admin/resources#worksheets-to-review",
      icon: "clipboard",
      title: plural(a.worksheetsToReview, "worksheet to review", "worksheets to review"),
      text: "Sent back by clients.",
    },
    a.myOpenTasks > 0 && {
      key: "tasks",
      href: "/admin/resources#tasks",
      icon: "check",
      title: plural(a.myOpenTasks, "preparation task for you", "preparation tasks for you"),
      text: "From supervision sheets.",
    },
    a.postsToReview > 0 && {
      key: "posts",
      href: "/admin/blog?show=review",
      icon: "pen",
      title: plural(a.postsToReview, "blog post to review", "blog posts to review"),
      text: "Written by a colleague and waiting for approval.",
    },
    a.comments.total > 0 && {
      key: "comments",
      href: "/admin/blog/comments",
      icon: "note",
      tone: a.comments.urgent > 0 ? "warn" : undefined,
      title: plural(a.comments.total, "reader's comment to approve", "readers' comments to approve"),
      text: a.comments.urgent > 0 ? `${a.comments.urgent} may need attention soon.` : "Nothing shows on the blog until it's approved.",
    },
  ].filter((i): i is Item => !!i);

  return (
    <Card title="Needs attention" subtitle={items.length === 0 ? "Nothing waiting" : `${items.length} ${items.length === 1 ? "thing" : "things"} waiting`}>
      {items.length === 0 ? (
        <div className="adm-allclear">
          <NavIcon name="check" size={20} />
          You&apos;re all caught up.
        </div>
      ) : (
        <ul className="adm-attn">
          {items.map((i) => (
            <li key={i.key}>
              <Link href={i.href} className="adm-attn-item" data-tone={i.tone}>
                <span className="adm-attn-icon">
                  <NavIcon name={i.icon} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="adm-attn-title">{i.title}</span>
                  <span className="adm-attn-text">{i.text}</span>
                </span>
                <span className="adm-attn-go" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
