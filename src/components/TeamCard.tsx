import Image from "next/image";
import Link from "next/link";
import { Icon } from "./icons";
import type { TeamMember } from "@/data/site";

/**
 * A practitioner's photograph, or their initials until one is supplied.
 *
 * Both fill the same circle, so adding `photo` to a team member in
 * src/data/site.ts changes nothing else about the page.
 */
export function TeamAvatar({ member }: { member: TeamMember }) {
  if (!member.photo) return <div className="founder-avatar">{member.initials}</div>;
  return (
    <div className="founder-avatar" style={{ overflow: "hidden", padding: 0 }}>
      <Image
        src={member.photo}
        alt={`${member.name}, ${member.role}`}
        width={128}
        height={128}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

/** Short card for the homepage: who they are, with a link to the full profile. */
export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="founder-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TeamAvatar member={member} />
      <h3 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>{member.name}</h3>
      <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--teal-deep)", fontWeight: 700 }}>{member.role}</p>
      <p style={{ margin: "14px 0 0", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)", textAlign: "left" }}>
        {member.bio[0]}
      </p>
      <Link
        href={`/team#${member.slug}`}
        style={{ marginTop: "auto", paddingTop: 16, fontSize: 14, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "center" }}
      >
        Full profile <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
      </Link>
    </div>
  );
}

/** Full profile for Meet Our Team: credentials beside the biography. */
export function TeamProfile({ member }: { member: TeamMember }) {
  return (
    <article
      id={member.slug}
      className="founder-grid"
      style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 36, alignItems: "start", scrollMarginTop: 130 }}
    >
      <div className="founder-card">
        <TeamAvatar member={member} />
        <h2 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>{member.name}</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--teal-deep)", fontWeight: 700 }}>{member.role}</p>
        <ul style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
          {member.credentials.map((c) => (
            <li key={c} style={{ display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.45, color: "var(--ink)" }}>
              <span style={{ flex: "0 0 auto", marginTop: 1 }}>
                <Icon name="check" size={16} stroke="var(--teal)" />
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {member.bio.map((p, i) => (
          <p key={i} style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "var(--ink)" }}>
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
