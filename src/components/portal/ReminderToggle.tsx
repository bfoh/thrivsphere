"use client";

import * as React from "react";
import { setEmailReminders } from "@/app/actions/messages";

/**
 * Client-controlled email opt-out.
 *
 * Governs appointment reminders and new-message notices alike: someone who
 * asked us not to email about appointments has not agreed to be emailed about
 * messages either, and their reasons are the same reasons.
 *
 * Shown plainly rather than buried in settings, because the people most likely
 * to need it are the least likely to go looking. Receipts are excluded — a
 * person who has paid is entitled to a record of it.
 */
export function ReminderToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = React.useState(enabled);
  const [pending, start] = React.useTransition();

  return (
    <div className="card" style={{ padding: 22 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--navy)" }}>Email notifications</h2>
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
        <span>Email me about appointments and new messages.</span>
      </label>
      <p style={{ margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--navy-soft)" }}>
        These say only that you have an appointment or a message — never joining links, and
        never anything about why you&apos;re here. If anyone else might read your email, turn them
        off; your appointments and messages will still be waiting when you sign in.
        Payment receipts are always sent.
      </p>
    </div>
  );
}
