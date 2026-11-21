import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canSeeEmergencyContact, contactLines, isInternationalPhone, isTimeZone, parseEmergencyContact } from "./emergency-contact";

const reader = (v: Record<string, string>) => ({ get: (n: string) => v[n] ?? "" });

const full = {
  answer: "provided",
  name: "Sam Taylor",
  relationship: "Sister",
  phone: "+44 7700 900123",
  country: "United Kingdom",
  method: "phone",
  informed: "on",
};

describe("parseEmergencyContact", () => {
  it("needs an answer, but never forces a contact", () => {
    assert.equal(parseEmergencyContact(reader({})).ok, false);
    for (const answer of ["unable", "prefer_not"]) {
      const r = parseEmergencyContact(reader({ answer, name: "ignored" }));
      assert.ok(r.ok);
      assert.equal(r.value.status, answer);
      assert.equal(r.value.name, null, "details aren't kept without a contact");
    }
  });

  it("accepts a complete contact", () => {
    const r = parseEmergencyContact(reader(full));
    assert.ok(r.ok);
    assert.equal(r.value.name, "Sam Taylor");
    assert.equal(r.value.informed, true);
    assert.equal(r.value.timeZone, null);
  });

  it("requires name, relationship, an international phone, country, a method and the acknowledgement", () => {
    const r = parseEmergencyContact(reader({ answer: "provided" }));
    assert.ok(!r.ok);
    for (const f of ["name", "relationship", "phone", "country", "method", "informed"]) assert.ok(r.errors[f], `${f} required`);
    const local = parseEmergencyContact(reader({ ...full, phone: "07700 900123" }));
    assert.ok(!local.ok && local.errors.phone);
  });

  it("checks the optional fields when given", () => {
    const r = parseEmergencyContact(reader({ ...full, alt: "not an address", timeZone: "UK time" }));
    assert.ok(!r.ok && r.errors.alt && r.errors.timeZone);
    const ok = parseEmergencyContact(reader({ ...full, alt: "sam@example.com", timeZone: "Africa/Accra", method: "email" }));
    assert.ok(ok.ok);
  });

  it("asks for an email when email is the preferred method, and words for Other", () => {
    const e = parseEmergencyContact(reader({ ...full, method: "email" }));
    assert.ok(!e.ok && e.errors.alt);
    const o = parseEmergencyContact(reader({ ...full, method: "other" }));
    assert.ok(!o.ok && o.errors.methodOther);
  });
});

describe("helpers", () => {
  it("recognises international numbers", () => {
    assert.equal(isInternationalPhone("+44 (0) 7700-900123".replace("(0) ", "")), true);
    assert.equal(isInternationalPhone("0044 7700 900123"), true);
    assert.equal(isInternationalPhone("+233 24 123 4567"), true);
    assert.equal(isInternationalPhone("07700 900123"), false);
    assert.equal(isInternationalPhone("+44 12"), false);
  });

  it("recognises time zones", () => {
    assert.equal(isTimeZone("Europe/London"), true);
    assert.equal(isTimeZone("Not/AZone"), false);
  });

  it("shows the contact only to the Lead, the Deputy and the client's practitioners", () => {
    assert.equal(canSeeEmergencyContact({ role: "founder", safeguardingDeputy: false, isTheirPractitioner: false }), true);
    assert.equal(canSeeEmergencyContact({ role: "practitioner", safeguardingDeputy: true, isTheirPractitioner: false }), true);
    assert.equal(canSeeEmergencyContact({ role: "practitioner", safeguardingDeputy: false, isTheirPractitioner: true }), true);
    assert.equal(canSeeEmergencyContact({ role: "admin", safeguardingDeputy: false, isTheirPractitioner: false }), false);
    assert.equal(canSeeEmergencyContact({ role: "practitioner", safeguardingDeputy: false, isTheirPractitioner: false }), false);
  });

  it("summarises the contact for staff, including where they are", () => {
    const r = parseEmergencyContact(reader({ ...full, timeZone: "Africa/Accra", country: "Ghana" }));
    assert.ok(r.ok);
    assert.deepEqual(contactLines(r.value), ["Sam Taylor (Sister)", "+44 7700 900123", "Ghana · Africa/Accra", "Prefers: Phone"]);
    assert.deepEqual(contactLines({ ...r.value, status: "prefer_not" }), ["Preferred not to provide one"]);
  });
});
