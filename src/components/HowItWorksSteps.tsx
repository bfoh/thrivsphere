import { howItWorks } from "@/data/site";

/** The five steps from enquiry to progress review (checklist §5), with the note on duration. */
export function HowItWorksSteps({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <ol className="steps" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: compact ? 14 : 16 }}>
        {howItWorks.steps.map((s, i) => (
          <li key={s.title} className="card" style={{ padding: compact ? "18px 20px" : "22px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <span
              aria-hidden
              style={{
                flex: "0 0 auto",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--grad-teal)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </span>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: compact ? 16 : 17.5, color: "var(--navy)" }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: compact ? 14 : 15, lineHeight: 1.55, color: "var(--ink)" }}>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p
        style={{
          margin: compact ? "16px 0 0" : "22px 0 0",
          padding: "14px 18px",
          borderRadius: 12,
          background: "rgba(212,175,55,0.1)",
          border: "1px solid rgba(212,175,55,0.28)",
          fontSize: 14.5,
          lineHeight: 1.6,
          color: "var(--navy)",
        }}
      >
        <strong>Important:</strong> {howItWorks.important}
      </p>
    </>
  );
}
