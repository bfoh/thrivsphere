/** Date display for resource pages, always in UK time. */
const LDN = "Europe/London";

export const fmtDate = (v: Date | string | null | undefined) => {
  if (!v) return "—";
  // A bare YYYY-MM-DD is a calendar date: read at midday so no timezone shifts it a day.
  const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00Z`) : new Date(v);
  return d.toLocaleDateString("en-GB", { timeZone: LDN, day: "numeric", month: "short", year: "numeric" });
};

export const fmtDateTime = (v: Date | string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("en-GB", {
        timeZone: LDN,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const londonToday = () => new Date().toLocaleDateString("en-CA", { timeZone: LDN });
