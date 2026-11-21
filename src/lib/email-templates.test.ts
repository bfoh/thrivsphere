import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  appointmentCancelled,
  appointmentMoved,
  bookingConfirmation,
  bookingLinkEmail,
  callbackAcknowledgement,
  enquiryAcknowledgement,
  enquiryStaffNotice,
  paidTimeUnavailable,
  sessionsOpen,
  paymentAlert,
  paymentReceipt,
  reminder1h,
  reminder24h,
  secureMessageNotice,
  staffAppointmentNotice,
  worksheetAssigned,
  worksheetSubmitted,
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

const brandedEmails = () => [
  bookingConfirmation(when),
  reminder24h(when),
  reminder1h(when),
  secureMessageNotice(),
  worksheetAssigned(),
  paymentReceipt("4 Sessions", 10000, 4),
  paymentReceipt("Initial Wellbeing Needs Review", 3000, 1, { forBooking: true }),
  appointmentCancelled(when, { by: "client", late: true }),
  appointmentCancelled(when, { by: "service" }),
  appointmentMoved(when),
  enquiryAcknowledgement("TS-234567"),
  callbackAcknowledgement("TS-234567"),
  bookingLinkEmail({ price: "£30" }),
  paidTimeUnavailable(),
  sessionsOpen(),
];

// Emails to someone with an account. An enquirer has none, so the
// acknowledgements carry the crisis signposting but no portal link.
const clientEmails = () =>
  brandedEmails().filter((e) => !/received TS-/.test(e.subject));

describe("every client email", () => {
  it("always has both an HTML and a plain-text version", () => {
    for (const e of clientEmails()) {
      assert.ok(e.html.length > 0, `${e.subject}: missing HTML`);
    }
  });

  it("always has a plain-text version", () => {
    for (const e of clientEmails()) {
      assert.ok(e.text.length > 0, `${e.subject}: missing text`);
    }
  });

  it("carries crisis signposting in both versions", () => {
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

  it("sets a preheader so the inbox preview does not leak the body", () => {
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
    assert.match(bookingConfirmation(when).html, /https:\/\/thrivsphere\.org\/images\/email\/emblem\.png/);
  });

  it("names the company behind the trading name, in both parts", () => {
    for (const e of [bookingConfirmation(when), reminder24h(when), secureMessageNotice()]) {
      for (const part of [e.html, e.text]) {
        assert.match(part, /3G AND PAT HEALTHCARE LIMITED/);
        assert.match(part, /11615975/);
        assert.match(part, /SN25 2SD/);
      }
    }
  });
});

describe("appointment emails", () => {
  it("show the time in UK local time", () => {
    // 17:00 UTC in June is 18:00 BST.
    for (const e of [bookingConfirmation(when), reminder24h(when), reminder1h(when)]) {
      assert.match(e.html, /18:00/, `${e.subject}: wrong timezone in HTML`);
      assert.match(e.text, /18:00/, `${e.subject}: wrong timezone in text`);
      assert.match(e.text, /Friday/);
    }
  });

  it("tells the client how to turn reminders off", () => {
    for (const e of [reminder24h(when), reminder1h(when)]) {
      assert.match(e.html, /turn these reminders off/i, `${e.subject}: no opt-out in HTML`);
      assert.match(e.text, /turn these reminders off/i, `${e.subject}: no opt-out in text`);
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

describe("worksheet emails", () => {
  it("tell the client something is waiting without saying what", () => {
    const e = worksheetAssigned();
    for (const part of [e.subject, e.html, e.text]) {
      assert.ok(!/worksheet|emotion|intensity|feeling/i.test(part), `revealing: ${part.slice(0, 80)}`);
    }
    assert.match(e.text, /thrivsphere\.org\/portal\n/);
  });

  it("tell staff a worksheet is back by link only, without the crisis block", () => {
    const e = worksheetSubmitted({
      clientId: "0b1c2d3e-0000-4000-8000-000000000000",
      assignmentId: "1a2b3c4d-0000-4000-8000-000000000000",
    });
    assert.match(e.text, /\/admin\/clients\/0b1c2d3e-0000-4000-8000-000000000000\/worksheets\/1a2b3c4d/);
    assert.ok(!/not an emergency or crisis service/i.test(e.html));
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

describe("paymentAlert", () => {
  const alert = () =>
    paymentAlert({
      subject: "A payment was refunded",
      lines: ["3 of 4 sessions were removed."],
      clientId: "0b1c2d3e-0000-4000-8000-000000000000",
    });

  it("is for staff, so it drops the crisis block", () => {
    assert.ok(!/not an emergency or crisis service/i.test(alert().html));
  });

  it("links to the client's record instead of naming them", () => {
    const e = alert();
    assert.match(e.text, /\/admin\/clients\/0b1c2d3e-0000-4000-8000-000000000000/);
    assert.match(e.html, /3 of 4 sessions were removed\./);
  });
});

describe("paymentReceipt", () => {
  it("does not ask someone who paid while booking to book again", () => {
    const e = paymentReceipt("Initial Wellbeing Needs Review", 3000, 1, { forBooking: true });
    assert.match(e.text, /For the appointment you have booked/);
    assert.doesNotMatch(e.text, /Book whenever/);
    assert.match(paymentReceipt("Single", 3500, 1).text, /1 session added to your account/);
  });
});

describe("enquiry emails (handover §16.4, §16.5)", () => {
  it("acknowledge with the handover's subject and the reference", () => {
    const e = enquiryAcknowledgement("TS-234567");
    assert.equal(e.subject, "ThriveSphere Wellbeing — enquiry received TS-234567");
    assert.match(e.text, /will respond through our approved contact channels/);
    assert.match(e.text, /ThriveSphere is not an emergency service/);
  });

  it("promise no response time", () => {
    for (const e of [enquiryAcknowledgement("TS-234567"), callbackAcknowledgement("TS-234567")]) {
      assert.doesNotMatch(e.text, /working day|within \d|hours? of|24 hours|48 hours/i, e.subject);
    }
  });

  it("tell staff only that an enquiry is waiting, with a link to its record", () => {
    const e = enquiryStaffNotice({ id: "e-1", reference: "TS-234567", category: "callback" });
    assert.match(e.subject, /callback request TS-234567/);
    assert.match(e.text, /https:\/\/thrivsphere\.org\/admin\/enquiries\/e-1/);
    assert.ok(!/not an emergency or crisis service/i.test(e.html), "staff do not need signposting");
  });

  it("send the booking link to the booking page, naming the price and notice", () => {
    const e = bookingLinkEmail({ price: "£30", practitionerId: "p-1", practitionerName: "Patience" });
    assert.match(e.text, /https:\/\/thrivsphere\.org\/portal\/book\?with=p-1/);
    assert.match(e.text, /50 minutes, online, £30/);
    assert.match(e.text, /72 hours' notice/);
  });

  it("escape a practitioner name in HTML", () => {
    const e = bookingLinkEmail({ price: "£30", practitionerName: "<b>x</b>" });
    assert.ok(!e.html.includes("<b>x</b>"));
  });
});

describe("appointmentCancelled", () => {
  it("tells a late canceller the session counts as used", () => {
    assert.match(appointmentCancelled(when, { by: "client", late: true }).text, /counts as used/);
    assert.doesNotMatch(appointmentCancelled(when, { by: "client", late: false }).text, /counts as used/);
  });

  it("returns the session when the service cancels", () => {
    assert.match(appointmentCancelled(when, { by: "service" }).text, /returned to your account/);
  });
});

describe("staffAppointmentNotice", () => {
  it("gives the time but nothing about the client, and no crisis block", () => {
    const e = staffAppointmentNotice("booked", when);
    assert.match(e.subject, /New booking/);
    assert.match(e.text, /18:00/);
    assert.ok(!/not an emergency or crisis service/i.test(e.html));
  });
});
