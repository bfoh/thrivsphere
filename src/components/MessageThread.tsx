"use client";

import * as React from "react";
import { useActionState } from "react";
import { sendSecureMessage } from "@/app/actions/messages";
import { initialMessageState } from "@/lib/message-state";

type Message = {
  id: string;
  body: string;
  sentAt: Date | string;
  readAt: Date | string | null;
  fromMe: boolean;
};

const dt = (v: Date | string) =>
  new Date(v).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

/**
 * Secure conversation.
 *
 * Used by both sides — the client in their portal and staff on the record —
 * so the same thread is read identically by everyone in it.
 */
export function MessageThread({
  clientId,
  messages,
  placeholder = "Write a message…",
}: {
  clientId: string;
  messages: Message[];
  placeholder?: string;
}) {
  const [state, action, pending] = useActionState(sendSecureMessage, initialMessageState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  return (
    <div>
      {messages.length === 0 ? (
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--navy-soft)", fontStyle: "italic" }}>
          No messages yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.fromMe ? "flex-end" : "flex-start",
                maxWidth: "78%",
                padding: "11px 15px",
                borderRadius: 14,
                background: m.fromMe ? "var(--grad-teal)" : "#fff",
                color: m.fromMe ? "#fff" : "var(--ink)",
                border: m.fromMe ? "none" : "1px solid rgba(31,58,95,0.12)",
                boxShadow: "0 2px 8px rgba(31,58,95,0.06)",
              }}
            >
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {m.body}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.75 }}>
                {dt(m.sentAt)}
                {m.fromMe && m.readAt ? " · read" : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="hidden" name="clientId" value={clientId} />
        <textarea
          name="body"
          rows={3}
          placeholder={placeholder}
          style={{
            fontFamily: "inherit", fontSize: 14.5, padding: "12px 14px", borderRadius: 12,
            border: "1px solid rgba(31,58,95,0.18)", background: "#fff", color: "var(--ink)",
            outline: "none", resize: "vertical", width: "100%", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 22px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
            {pending ? "Sending…" : "Send"}
          </button>
          <span style={{ fontSize: 12, color: "var(--navy-soft)", lineHeight: 1.5 }}>
            Messages stay inside your account. We never put personal details in an email.
          </span>
          {state.status !== "idle" && (
            <span style={{ fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
