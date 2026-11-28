import { Icon } from "./icons";
import { SitePhoto } from "./SitePhoto";
import type { Service } from "@/data/site";
import type { Photo } from "@/data/photos";

/**
 * One service in full: description, what it may cover, and any boundary note (checklist §4).
 *
 * With a photo, the photo sits beside the description and points (on the left
 * when `photoFirst`, so a page of them alternates), and the note runs full
 * width beneath both. On phones and tablets the photo leads the card.
 */
export function ServiceDetail({
  service,
  letter,
  photo,
  photoFirst = false,
}: {
  service: Service;
  letter: string;
  photo?: Photo;
  photoFirst?: boolean;
}) {
  const body = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <span className="svc-icon" style={{ margin: 0, flex: "0 0 auto" }}>
          <Icon name={service.icon} size={25} stroke="#fff" />
        </span>
        <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.25, color: "var(--navy)", fontWeight: 800 }}>
          <span style={{ color: "var(--gold)" }}>{letter}.</span> {service.title}
        </h2>
      </div>
      <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>{service.desc}</p>
      {service.points.length > 0 && (
        <ul
          className="two-col"
          style={{
            listStyle: "none",
            margin: "14px 0 0",
            padding: 0,
            display: "grid",
            // Beside a photo the column is half as wide, so one column reads better.
            gridTemplateColumns: photo ? "minmax(0, 1fr)" : "1fr 1fr",
            gap: photo ? "8px" : "9px 20px",
          }}
        >
          {service.points.map((p) => (
            <li key={p} style={{ display: "flex", gap: 8, fontSize: 14.5, lineHeight: 1.45, color: "var(--ink)" }}>
              <span style={{ flex: "0 0 auto", marginTop: 1 }}>
                <Icon name="check" size={16} stroke="var(--teal)" />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <article id={service.slug} className="card" style={{ padding: "26px 28px", scrollMarginTop: 130 }}>
      {photo ? (
        <div className={`svc-detail-grid${photoFirst ? " photo-first" : ""}`}>
          <div>{body}</div>
          <SitePhoto
            photo={photo}
            className="svc-detail-photo"
            sizes="(max-width: 900px) calc(100vw - 100px), 420px"
          />
        </div>
      ) : (
        body
      )}
      {service.note && (
        <p style={{ margin: "16px 0 0", padding: "12px 16px", borderRadius: 10, background: "rgba(79,168,168,0.08)", border: "1px solid rgba(79,168,168,0.22)", fontSize: 14, lineHeight: 1.55, color: "var(--navy)" }}>
          {service.note}
        </p>
      )}
    </article>
  );
}
