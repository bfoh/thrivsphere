import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commentFlags, commentsLabel, likesLabel, parseComment, thankYou } from "./blog-comment-rules";

const ok = { name: "Sam", email: "Sam@Example.com ", body: "This really helped, thank you.", agreed: true };

describe("parseComment", () => {
  it("accepts a name, an email and a comment", () => {
    const r = parseComment(ok);
    assert.ok(r.ok);
    assert.deepEqual(r.value, { name: "Sam", email: "sam@example.com", body: "This really helped, thank you." });
  });

  it("tidies spacing", () => {
    const r = parseComment({ ...ok, name: "  Jo   B ", body: "One\r\n\r\n\r\n\r\nTwo" });
    assert.ok(r.ok);
    assert.equal(r.value.name, "Jo B");
    assert.equal(r.value.body, "One\n\nTwo");
  });

  it("says what's missing", () => {
    const r = parseComment({ name: "", email: "nope", body: "", agreed: false });
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["agreed", "body", "email", "name"]);
  });

  it("refuses a web or email address as a name, and an overlong comment", () => {
    assert.equal(parseComment({ ...ok, name: "cheap-pills.com" }).ok, false);
    assert.equal(parseComment({ ...ok, name: "me@x.com" }).ok, false);
    assert.equal(parseComment({ ...ok, body: "x".repeat(2001) }).ok, false);
  });
});

describe("commentFlags", () => {
  it("is quiet for an ordinary comment", () => {
    assert.deepEqual(commentFlags("Lovely post, the breathing exercise helped me sleep."), { flags: [], needsAttention: false });
  });

  it("puts possible risk to the writer first", () => {
    for (const text of [
      "Some days I want to die",
      "I've been thinking about suicide",
      "I can't go on like this",
      "Everyone would be better off without me",
      "I keep hurting myself",
      "My partner hits me when he's drunk",
      "I'm not safe at home",
    ]) {
      assert.equal(commentFlags(text).needsAttention, true, text);
    }
  });

  it("notes contact details, links and sessions without treating them as urgent", () => {
    const r = commentFlags("Call me on 07700 900123 or see www.example.com. My practitioner was great.");
    assert.equal(r.needsAttention, false);
    assert.deepEqual(r.flags, ["Contains a phone number", "Contains a link", "Names a practitioner or describes sessions"]);
  });

  it("doesn't mistake everyday phrases for risk", () => {
    for (const text of ["This post killed it", "I nearly died laughing", "I cut back on caffeine myself"]) {
      assert.equal(commentFlags(text).needsAttention, false, text);
    }
  });
});

describe("messages", () => {
  it("gives help routes first when a comment suggests risk", () => {
    assert.match(thankYou(true), /116 123/);
    assert.doesNotMatch(thankYou(false), /116 123/);
  });

  it("counts likes and comments", () => {
    assert.equal(likesLabel(1), "1 like");
    assert.equal(likesLabel(1200), "1,200 likes");
    assert.equal(commentsLabel(0), "0 comments");
  });
});
