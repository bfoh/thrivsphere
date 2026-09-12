"use client";

import * as React from "react";
import { setEmailReminders } from "@/app/actions/messages";

/**
 * Client-controlled reminder opt-out.
 *
 * Shown plainly rather than buried in settings, because the people most likely
 * to need it are the least likely to go looking.
 */
export function ReminderToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = React.useState(enabled);
  const [pending, start] = React.useTransition();

  return (
    <div className="card" style={{ padding: 22 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--navy)" }}>Email reminders</h2>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          style={{ marginTop: 3 }}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next);
            start(() => {
              void setEmailReminders(next);
            });
          }}
        />
        <span>Send me a reminder before my appointments.</span>
      </label>
      <p style={{ margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--navy-soft)" }}>
        Reminders contain only the date and time — never joining links or anything about why
        you&apos;re here. If anyone else might read your email, you can turn them off and your
        appointments will still be here when you sign in.
      </p>
    </div>
  );
}
