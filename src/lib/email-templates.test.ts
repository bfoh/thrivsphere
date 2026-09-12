import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  bookingConfirmation,
  enquiryNotification,
  paymentReceipt,
  reminder1h,
  reminder24h,
  secureMessageNotice,
} from "./email-templates";

/**
 * These assertions carry over the rules that plain-text-only used to enforce
 * implicitly. Branded email is fine; branded email that starts leaking session
 * details, or that exists only as HTML, is not.
 */
before(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://thrivsphere.org";
});

const when = new Date("2026-06-05T17:00:00Z"); // 18:00 BST, a Friday

/** Branded messages: read once, soon after the person chose to act. */
const brandedEmails = () => [
  bookingConfirmation(when),
  secureMessageNotice(),
  paymentReceipt("4 Sessions", 10000, 4),
];

/** Plain messages: arrive unannounced, so they stay unidentifiable. */
const plainEmails = () => [reminder24h(when), reminder1h(when)];

const clientEmails = () => [...brandedEmails(), ...plainEmails()];

describe("every client email", () => {
  it("always has a plain-text version", () => {
    for (const e of clientEmails()) {
      assert.ok(e.text.length > 0, `${e.subject}: missing text`);
    }
  });

  it("branded messages carry crisis signposting in both versions", () => {
    for (const e of brandedEmails()) {
      assert.match(e.html, /999/, `${e.subject}: HTML missing 999`);
      assert.match(e.html, /116&nbsp;123|116 123/, `${e.subject}: HTML missing Samaritans`);
      assert.match(e.text, /999/, `${e.subject}: text missing 999`);
      assert.match(e.text, /116 123/, `${e.subject}: text missing Samaritans`);
    }
  });

  it("never contains a joining link or meeting platform", () => {
    for (const e of clientEmails()) {
      const both = e.html + e.text;
      assert.ok(
        !/zoom\.|teams\.microsoft|whereby\.com|meet\.google/i.test(both),
        `${e.subject}: leaked a joining link`
      );
    }
  });

  it("keeps the subject line neutral about why the person is in touch", () => {
    for (const e of clientEmails()) {
      assert.ok(
        !/therapy|counsel|abuse|crisis|wellbeing session|mental health/i.test(e.subject),
        `subject too revealing: "${e.subject}"`
      );
    }
  });

  it("sets a preheader on branded messages so the inbox preview does not leak the body", () => {
    for (const e of brandedEmails()) {
      assert.match(e.html, /display:none;max-height:0/, `${e.subject}: no preheader`);
    }
  });

  it("points at the portal rather than carrying the content itself", () => {
    for (const e of clientEmails()) {
      assert.match(e.html + e.text, /thrivsphere\.org\/portal/, `${e.subject}: no portal link`);
    }
  });

  it("uses an absolute logo URL, since email cannot resolve relative paths", () => {
    assert.match(bookingConfirmation(when).html, /https:\/\/thrivsphere\.org\/images\/email\/logo\.png/);
  });
});

describe("appointment emails", () => {
  it("show the time in UK local time", () => {
    // 17:00 UTC in June is 18:00 BST.
    for (const e of [bookingConfirmation(when), reminder24h(when), reminder1h(when)]) {
      assert.match(e.text, /18:00/, `${e.subject}: wrong timezone`);
      assert.match(e.text, /Friday/);
    }
  });

  it("tells the client how to stop reminders", () => {
    assert.match(reminder24h(when).text, /stop these reminders/i);
    assert.match(reminder1h(when).text, /stop these reminders/i);
  });
});

/**
 * Reminders arrive unannounced, possibly while someone else can see the
 * screen. These assertions exist so a future redesign cannot quietly make them
 * identifiable again.
 */
describe("reminders are discreet", () => {
  it("send no HTML at all, so they carry no logo or tracked image", () => {
    for (const e of plainEmails()) {
      assert.equal(e.html, "", `${e.subject}: should be text only`);
    }
  });

  it("never name the service in the body", () => {
    for (const e of plainEmails()) {
      assert.ok(!/ThrivSphere Wellbeing|wellbeing service/i.test(e.text), `${e.subject}: names the service`);
    }
  });

  it("do not describe what the service is", () => {
    for (const e of plainEmails()) {
      assert.ok(
        !/wellbeing|counsel|therapy|mental health|support service/i.test(e.text),
        `${e.subject}: describes the service`
      );
    }
  });

  it("omit the crisis block, which is the most identifying part", () => {
    // Deliberate. Crisis signposting is one tap away in the portal, on every
    // page of the site, and on the branded messages.
    for (const e of plainEmails()) {
      assert.ok(!/Samaritans|116 123/.test(e.text), `${e.subject}: includes crisis numbers`);
    }
  });

  it("still say when the appointment is and how to stop them", () => {
    for (const e of plainEmails()) {
      assert.match(e.text, /18:00/, `${e.subject}: no time`);
      assert.match(e.text, /stop these reminders/i, `${e.subject}: no opt-out`);
    }
  });

  it("keep a neutral subject line", () => {
    for (const e of plainEmails()) {
      assert.match(e.subject, /^Your appointment/, `unexpected subject: ${e.subject}`);
    }
  });
});

describe("secureMessageNotice", () => {
  it("says a message exists without any of its content", () => {
    const e = secureMessageNotice();
    assert.match(e.html, /new message/i);
    assert.ok(!/message:/i.test(e.text), "must not include message content");
  });
});

describe("paymentReceipt", () => {
  it("formats the amount in pounds from pence", () => {
    const e = paymentReceipt("4 Sessions", 10000, 4);
    assert.match(e.html, /£100/);
    assert.match(e.text, /£100/);
    assert.match(e.html, /4 sessions/);
  });

  it("says one session rather than 1 sessions", () => {
    assert.match(paymentReceipt("Individual Session", 3000, 1).text, /1 session\b/);
  });
});

describe("enquiryNotification", () => {
  const fields = { name: "Sam", email: "sam@example.com", message: "I'd like to talk to someone." };

  it("is for staff, so it drops the crisis block", () => {
    // Staff do not need signposting in their own inbox.
    const e = enquiryNotification(fields);
    assert.ok(!/not an emergency or crisis service/i.test(e.html));
  });

  it("escapes enquiry text, which is written by the public", () => {
    const e = enquiryNotification({ ...fields, message: '<script>alert("x")</script>' });
    assert.ok(!e.html.includes("<script>"), "unescaped HTML from a stranger");
    assert.match(e.html, /&lt;script&gt;/);
  });

  it("escapes a crafted name in the body", () => {
    const e = enquiryNotification({ ...fields, name: '<img src=x onerror=1>' });
    assert.ok(!e.html.includes("<img src=x"), "unescaped name");
  });

  it("labels a booking request differently from a general enquiry", () => {
    assert.match(enquiryNotification(fields).subject, /Website enquiry/);
    assert.match(
      enquiryNotification({ ...fields, preferredTimes: "Weekday evenings" }).subject,
      /Booking request/
    );
  });

  it("omits fields that were not provided rather than printing empty rows", () => {
    const e = enquiryNotification(fields);
    assert.ok(!/Preferred times/.test(e.html));
  });
});
