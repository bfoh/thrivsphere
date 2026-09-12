import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dueReminders, reminderContent, type ReminderCandidate } from "./reminders";

const NOW = new Date("2026-06-01T09:00:00Z");
const at = (iso: string) => new Date(iso);

const base: ReminderCandidate = {
  appointmentId: "a1",
  startsAt: at("2026-06-05T17:00:00Z"),
  status: "scheduled",
  emailRemindersEnabled: true,
  alreadySent: [],
};

const kinds = (c: Partial<ReminderCandidate>, now = NOW) =>
  dueReminders([{ ...base, ...c }], now).map((d) => d.kind);

describe("dueReminders", () => {
  it("sends a confirmation once for a new booking", () => {
    assert.deepEqual(kinds({}), ["booking_confirmation"]);
  });

  it("does not send the confirmation twice", () => {
    assert.deepEqual(kinds({ alreadySent: ["booking_confirmation"] }), []);
  });

  it("sends the 24h reminder inside its window", () => {
    const startsAt = new Date(NOW.getTime() + 24 * 3600_000);
    assert.ok(kinds({ startsAt, alreadySent: ["booking_confirmation"] }).includes("reminder_24h"));
  });

  it("does not send the 24h reminder three days out", () => {
    const startsAt = new Date(NOW.getTime() + 72 * 3600_000);
    assert.deepEqual(kinds({ startsAt, alreadySent: ["booking_confirmation"] }), []);
  });

  it("sends the 1h reminder inside its window", () => {
    const startsAt = new Date(NOW.getTime() + 3600_000);
    assert.ok(
      kinds({ startsAt, alreadySent: ["booking_confirmation", "reminder_24h"] }).includes("reminder_1h")
    );
  });

  it("never repeats a reminder already sent", () => {
    const startsAt = new Date(NOW.getTime() + 3600_000);
    assert.deepEqual(
      kinds({ startsAt, alreadySent: ["booking_confirmation", "reminder_24h", "reminder_1h"] }),
      []
    );
  });

  it("stops reminding once an appointment is cancelled", () => {
    // The failure people actually notice and resent.
    for (const status of ["cancelled_by_client", "cancelled_by_service", "completed", "no_show"]) {
      assert.deepEqual(kinds({ status }), [], `status=${status}`);
    }
  });

  it("sends nothing to a client who has turned email reminders off", () => {
    assert.deepEqual(kinds({ emailRemindersEnabled: false }), []);
  });

  it("does not remind about an appointment in the past", () => {
    assert.deepEqual(kinds({ startsAt: at("2026-05-30T10:00:00Z") }), []);
  });

  it("does not remind about an appointment starting exactly now", () => {
    assert.deepEqual(kinds({ startsAt: NOW }), []);
  });

  it("handles an empty list", () => {
    assert.deepEqual(dueReminders([], NOW), []);
  });

  it("can return several kinds for several appointments", () => {
    const out = dueReminders(
      [
        { ...base, appointmentId: "a1" },
        { ...base, appointmentId: "a2", startsAt: new Date(NOW.getTime() + 3600_000), alreadySent: ["booking_confirmation", "reminder_24h"] },
      ],
      NOW
    );
    assert.equal(out.length, 2);
    assert.deepEqual(out.map((d) => d.appointmentId).sort(), ["a1", "a2"]);
  });
});

describe("reminderContent", () => {
  const when = at("2026-06-05T17:00:00Z");

  it("includes the date and time in UK time", () => {
    const { text } = reminderContent("reminder_24h", when);
    // 17:00 UTC in June is 18:00 BST.
    assert.match(text, /18:00/);
    assert.match(text, /Friday/);
  });

  it("never includes a joining link or personal detail", () => {
    for (const kind of ["booking_confirmation", "reminder_24h", "reminder_1h"] as const) {
      const { subject, text } = reminderContent(kind, when);
      assert.ok(!/zoom|teams|whereby|meet\.google/i.test(text), "must not contain a joining link");
      assert.ok(!/wellbeing|therapy|counsel|session about/i.test(subject), "subject must stay neutral");
    }
  });

  it("points at the portal and mentions the opt-out", () => {
    const { text } = reminderContent("reminder_24h", when);
    assert.match(text, /\/portal/);
    assert.match(text, /turn them off/);
  });

  it("carries the crisis signposting", () => {
    const { text } = reminderContent("reminder_1h", when);
    assert.match(text, /999/);
    assert.match(text, /116 123/);
  });
});
