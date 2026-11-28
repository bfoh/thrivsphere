import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptedJustNow, invitationQuery, invitationRows, isNewAccountInvitation, parseInvitations } from "./invitation";

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

describe("parseInvitations", () => {
  const raw = {
    id: "inv_1",
    email_address: "new@example.com",
    url: "https://clerk.example.org/v1/tickets/accept?ticket=abc",
    created_at: Date.UTC(2026, 10, 28),
    expires_at: Date.UTC(2026, 11, 28),
    public_metadata: { thrivsphereRole: "practitioner", invitedBy: "user_founder" },
  };

  it("reads Clerk's list whether it comes bare or wrapped", () => {
    assert.equal(parseInvitations([raw]).length, 1);
    assert.equal(parseInvitations({ data: [raw] }).length, 1);
    assert.deepEqual(parseInvitations({ errors: [] }), []);
  });

  it("keeps the link apart from the details shown on the page", () => {
    const [{ invitation, url }] = parseInvitations([raw]);
    assert.equal(url, raw.url);
    assert.equal("url" in invitation, false);
    assert.equal(invitation.role, "practitioner");
    assert.equal(invitation.invitedBy, "user_founder");
    assert.equal(invitation.expiresAt?.toISOString(), "2026-12-28T00:00:00.000Z");
  });

  it("reads the role the way the webhook will apply it, so nothing is promoted on the way", () => {
    const [{ invitation }] = parseInvitations([{ ...raw, public_metadata: {} }]);
    assert.equal(invitation.role, "client");
    assert.equal(parseInvitations([{ ...raw, public_metadata: { thrivsphereRole: "owner" } }])[0].invitation.role, "client");
  });

  it("refuses a link that is not https", () => {
    assert.equal(parseInvitations([{ ...raw, url: "javascript:alert(1)" }])[0].url, null);
    assert.equal(parseInvitations([{ ...raw, url: null }])[0].url, null);
  });
});

describe("invitationRows", () => {
  const inv = (id: string, email: string, day: number) => ({
    id,
    email,
    role: "practitioner" as const,
    invitedBy: null,
    createdAt: new Date(Date.UTC(2026, 10, day)),
    expiresAt: null,
  });

  it("keeps a row's key when the invitation is sent again with a new id", () => {
    const before = invitationRows([inv("inv_1", "b@example.com", 20), inv("inv_2", "a@example.com", 21)]);
    const after = invitationRows([inv("inv_3", "b@example.com", 28), inv("inv_2", "a@example.com", 21)]);
    assert.deepEqual(before.map((r) => r.key), ["a@example.com#0", "b@example.com#0"]);
    assert.deepEqual(after.map((r) => r.key), before.map((r) => r.key));
  });

  it("gives two open invitations to one address different keys", () => {
    const rows = invitationRows([inv("inv_4", "a@example.com", 28), inv("inv_1", "a@example.com", 20)]);
    assert.deepEqual(rows.map((r) => [r.key, r.invitation.id]), [["a@example.com#0", "inv_1"], ["a@example.com#1", "inv_4"]]);
  });
});
