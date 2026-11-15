/** Shown when no library build has been published, or it cannot be read. */
export function NotPublished() {
  return (
    <div className="card" style={{ padding: "28px 26px", maxWidth: 640 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>The library is not available</h2>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
        The resources could not be loaded just now. Please try again in a minute; if this keeps happening, let the
        site administrator know.
      </p>
    </div>
  );
}
