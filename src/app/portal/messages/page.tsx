import type { Metadata } from "next";
import { requirePortalClient } from "@/lib/portal-guard";
import { getConversation, markMessagesRead } from "@/app/actions/messages";
import { MessageThread } from "@/components/MessageThread";

export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const state = await requirePortalClient();

  const messages = await getConversation(state.clientId);
  await markMessagesRead(state.clientId);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Messages
      </h1>
      <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        A private way to reach us between sessions. We usually reply within two working days — this
        is not monitored around the clock, so please use the emergency numbers if you need help now.
      </p>
      <MessageThread
        clientId={state.clientId}
        messages={messages ?? []}
        placeholder="Write to your practitioner…"
      />
    </div>
  );
}
