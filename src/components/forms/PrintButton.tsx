"use client";

import * as React from "react";

/**
 * Print the page, logging it first when `onPrint` is given — a printed sheet
 * is a copy of a care record leaving the system, so it goes on the access log.
 */
export function PrintButton({
  label = "Print",
  onPrint,
}: {
  label?: string;
  onPrint?: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      className="pill pill-ghost no-print"
      disabled={busy}
      style={{ padding: "9px 18px", fontSize: 13.5 }}
      onClick={async () => {
        setBusy(true);
        try {
          await onPrint?.();
        } catch {
          // Printing must not depend on the log write succeeding.
        } finally {
          setBusy(false);
          window.print();
        }
      }}
    >
      {label}
    </button>
  );
}
