import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBrevoPayload, isAccepted } from "./email-payload";

const base = {
  to: "client@example.com",
  subject: "Your appointment tomorrow",
  text: "This is a reminder of your appointment on Friday 5 June at 18:00.",
  fromEmail: "no-reply@thrivsphere.org",
  fromName: "ThrivSphere Wellbeing CIC",
  replyTo: "hello@thrivsphere.org",
};

describe("buildBrevoPayload", () => {
  it("uses Brevo's sender object and to array", () => {
    const p = buildBrevoPayload(base);
    assert.deepEqual(p.sender, { email: base.fromEmail, name: base.fromName });
    assert.deepEqual(p.to, [{ email: base.to }]);
    assert.equal(p.textContent, base.text);
  });

  it("omits the sender name when none is configured", () => {
    const p = buildBrevoPayload({ ...base, fromName: undefined });
    assert.deepEqual(p.sender, { email: base.fromEmail });
  });

  it("omits replyTo rather than sending an empty object", () => {
    const p = buildBrevoPayload({ ...base, replyTo: undefined });
    assert.equal("replyTo" in p, false);
  });

  it("does not put the recipient's name in the envelope", () => {
    // A display name is another place a person's name surfaces in a mailbox
    // someone else may read, and it buys nothing.
    const p = buildBrevoPayload(base);
    assert.deepEqual(Object.keys(p.to[0]), ["email"]);
  });

  it("omits htmlContent when no HTML is supplied", () => {
    assert.equal("htmlContent" in buildBrevoPayload(base), false);
  });

  it("always sends a plain-text part, even alongside HTML", () => {
    // This replaces an earlier rule that forbade HTML outright. Branded email
    // is fine; sending *only* HTML is not — some people read mail as text by
    // choice, some by necessity, and screen readers handle text far better.
    const p = buildBrevoPayload({ ...base, html: "<p>Hello</p>" });
    assert.equal(p.htmlContent, "<p>Hello</p>");
    assert.equal(p.textContent, base.text);
    assert.ok(p.textContent.length > 0, "a text alternative is mandatory");
  });

  it("carries no field beyond what Brevo needs", () => {
    const p = buildBrevoPayload(base);
    assert.deepEqual(
      Object.keys(p).sort(),
      ["replyTo", "sender", "subject", "textContent", "to"]
    );
  });
});

describe("isAccepted", () => {
  it("treats Brevo's 201 as success", () => {
    // Brevo answers a transactional send with 201. Treating only 200 as
    // success would mark every delivered reminder as failed and re-send it.
    assert.equal(isAccepted(201), true);
  });

  it("accepts other 2xx responses", () => {
    assert.equal(isAccepted(200), true);
    assert.equal(isAccepted(202), true);
  });

  it("rejects client and server errors", () => {
    for (const s of [400, 401, 402, 403, 404, 429, 500, 503]) {
      assert.equal(isAccepted(s), false, `status ${s}`);
    }
  });
});
