export function CrisisBar() {
  return (
    <div
      className="crisisBar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 30,
        background: "var(--navy)",
        color: "#eaf1fb",
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "0 14px",
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <span aria-hidden>🛟</span>
      <span className="crisis-full">
        In immediate danger? Call <strong style={{ color: "#fff" }}>999</strong>. Samaritans (free,
        24/7): <strong style={{ color: "#fff" }}>116 123</strong>.
      </span>
      <span className="crisis-short">
        Emergency <strong style={{ color: "#fff" }}>999</strong> · Samaritans{" "}
        <strong style={{ color: "#fff" }}>116 123</strong>
      </span>
    </div>
  );
}
