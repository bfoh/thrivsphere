import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTACT_CATEGORIES,
  categoryLabel,
  isQueueStatus,
  isReference,
  makeReference,
  parseEnquiry,
  statusLabel,
} from "./enquiry-rules";

const form = (fields: Record<string, string>, ticks: string[] = []) =>
  [(n: string) => (fields[n] ?? "").trim(), (n: string) => ticks.includes(n)] as const;

const contact = {
  category: "individual",
  name: "Sam",
  email: "Sam@Example.com",
  country: "United Kingdom",
  subject: "Evening sessions",
  message: "Do you offer evening sessions?",
};

describe("references", () => {
  it("look like TS- and six characters that can't be misheard", () => {
    const ref = makeReference(new Uint8Array([0, 1, 2, 3, 4, 5]));
    assert.equal(ref, "TS-234567");
    assert.ok(isReference(ref));
    const random = makeReference(crypto.getRandomValues(new Uint8Array(6)));
    assert.ok(isReference(random), random);
    assert.doesNotMatch(random.slice(3), /[01OILU]/);
  });

  it("rejects anything else", () => {
    for (const bad of ["TS-23456", "TS-2345670", "ts-234567", "TS-23456O", "XX-234567"]) {
      assert.equal(isReference(bad), false, bad);
    }
  });
});

describe("the contact form (handover §16.2)", () => {
  it("accepts a complete enquiry and keeps the email in one case", () => {
    const r = parseEnquiry("contact", ...form(contact, ["privacy"]));
    assert.ok(r.ok);
    assert.equal(r.value.email, "sam@example.com");
    assert.equal(r.value.category, "individual");
    assert.equal(r.value.preferredTimes, null);
  });

  it("requires category, name, email, country, subject, message and the privacy acknowledgement", () => {
    const r = parseEnquiry("contact", ...form({}));
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.fieldErrors).sort(), ["category", "country", "email", "message", "name", "privacy", "subject"]);
  });

  it("offers exactly the handover's five categories", () => {
    assert.deepEqual(
      CONTACT_CATEGORIES.map((c) => c.label),
      [
        "Individual wellbeing services",
        "Corporate or organisational services",
        "General question",
        "Existing client administrative query",
        "Other",
      ]
    );
    const r = parseEnquiry("contact", ...form({ ...contact, category: "callback" }, ["privacy"]));
    assert.ok(!r.ok && r.fieldErrors.category, "the callback category is set by its own form only");
  });

  it("keeps phone and contact method optional, but checks them", () => {
    assert.ok(parseEnquiry("contact", ...form({ ...contact, phone: "", preferredContact: "" }, ["privacy"])).ok);
    const r = parseEnquiry("contact", ...form({ ...contact, preferredContact: "carrier pigeon" }, ["privacy"]));
    assert.ok(!r.ok && r.fieldErrors.preferredContact);
  });

  it("limits the message length", () => {
    const r = parseEnquiry("contact", ...form({ ...contact, message: "x".repeat(3001) }, ["privacy"]));
    assert.ok(!r.ok && r.fieldErrors.message);
  });
});

describe("a callback request (handover §19 Route B)", () => {
  const callback = { name: "Alex", email: "alex@example.com", country: "Ghana", preferredTimes: "Weekday evenings" };

  it("needs only contact details, the 18+ confirmation and the privacy acknowledgement", () => {
    const r = parseEnquiry("callback", ...form(callback, ["privacy", "confirmAdult"]));
    assert.ok(r.ok);
    assert.equal(r.value.category, "callback");
    assert.equal(r.value.subject, null);
    assert.equal(r.value.confirmedAdult, true);
    assert.equal(r.value.preferredTimes, "Weekday evenings");
  });

  it("refuses without the 18+ confirmation", () => {
    const r = parseEnquiry("callback", ...form(callback, ["privacy"]));
    assert.ok(!r.ok && r.fieldErrors.confirmAdult);
  });

  it("ignores a category sent with it", () => {
    const r = parseEnquiry("callback", ...form({ ...callback, category: "corporate" }, ["privacy", "confirmAdult"]));
    assert.ok(r.ok && r.value.category === "callback");
  });
});

describe("labels", () => {
  it("names every category and status", () => {
    assert.equal(categoryLabel("callback"), "Callback request");
    assert.equal(categoryLabel("corporate"), "Corporate or organisational services");
    assert.equal(statusLabel("awaiting_client"), "Awaiting client information");
    assert.equal(statusLabel("converted"), "Booked");
  });

  it("lets staff choose only the handover's statuses", () => {
    for (const s of ["new", "in_progress", "awaiting_client", "responded", "closed"]) assert.ok(isQueueStatus(s), s);
    for (const s of ["converted", "signposted", "deleted"]) assert.equal(isQueueStatus(s), false, s);
  });
});
