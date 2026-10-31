import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptedJustNow, invitationQuery, isNewAccountInvitation } from "./invitation";

describe("invitationQuery", () => {
  it("passes on the ticket and status only", () => {
    assert.equal(
      invitationQuery({ __clerk_ticket: "abc", __clerk_status: "sign_up", utm_source: "email" }),
      "__clerk_ticket=abc&__clerk_status=sign_up"
    );
  });

  it("is null without a ticket", () => {
    assert.equal(invitationQuery({ __clerk_status: "sign_up" }), null);
    assert.equal(invitationQuery({}), null);
  });
});

describe("isNewAccountInvitation", () => {
  it("is true only for a ticket whose account is still to be created", () => {
    assert.equal(isNewAccountInvitation({ __clerk_ticket: "abc", __clerk_status: "sign_up" }), true);
    assert.equal(isNewAccountInvitation({ __clerk_ticket: "abc", __clerk_status: "sign_in" }), false);
    assert.equal(isNewAccountInvitation({ __clerk_status: "sign_up" }), false);
  });
});

describe("acceptedJustNow", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");

  it("is true for an account created in the last few minutes", () => {
    assert.equal(acceptedJustNow(now - 30_000, now), true);
  });

  it("is false for an account that already existed", () => {
    assert.equal(acceptedJustNow(now - 24 * 60 * 60 * 1000, now), false);
  });
});
