/**
 * Giant page-name band drifting right-to-left in the background — the
 * signature motion from the reference site (huge, faint, repeated section name).
 */
export function PageWatermark({
  word,
  tone = "dark",
}: {
  word: string;
  tone?: "dark" | "light";
}) {
  return (
    <div className={`pageWatermark ${tone}`} aria-hidden>
      <div className="pageWatermark-track">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i}>{word}</span>
        ))}
      </div>
    </div>
  );
}
