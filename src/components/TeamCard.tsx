import Link from "next/link";
import { Icon } from "./icons";
import { SitePhoto } from "./SitePhoto";
import type { TeamMember } from "@/data/site";
import { teamPhotos } from "@/data/photos";

/**
 * A practitioner's seated portrait, or their initials if they have none.
 *
 * Portraits come from src/data/photos.ts and are shown whole, at their own
 * 4:5 proportions, in one frame size per layout so every practitioner
 * appears the same size and lined up with the others.
 */
export function TeamAvatar({ member, layout = "card" }: { member: TeamMember; layout?: "card" | "profile" }) {
  const photo = teamPhotos[member.slug];
  if (!photo) return <div className="founder-avatar">{member.initials}</div>;
  return (
    <SitePhoto
      photo={photo}
      className={`team-photo team-photo--${layout}`}
      sizes={layout === "profile" ? "300px" : "280px"}
    />
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
        <TeamAvatar member={member} layout="profile" />
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
