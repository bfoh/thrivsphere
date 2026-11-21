import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canApproveKit, changedSections, kitFormValues, kitProblems, kitStatus, parseKitForm, seedKit } from "./brand-kit";
import { kitHash } from "./brand-kit-hash";

describe("the first Brand Kit", () => {
  it("is complete and passes its own checks", () => {
    assert.deepEqual(kitProblems(seedKit()), []);
  });

  it("survives a round trip through the editor", () => {
    const kit = seedKit();
    const v = kitFormValues(kit);
    assert.deepEqual(parseKitForm((n) => v[n] ?? ""), kit);
  });
});

describe("kitProblems", () => {
  it("wants pillars that add up to 100%", () => {
    const kit = seedKit();
    kit.pillars[0].share += 5;
    assert.match(kitProblems(kit)[0].message, /add up to 105%/);
  });

  it("insists on the crisis line", () => {
    const kit = seedKit();
    kit.boilerplates.crisisLine = "Call us any time.";
    assert.ok(kitProblems(kit).some((p) => /116 123/.test(p.message)));
  });

  it("keeps calls to action on pages that exist, and hashtags tidy", () => {
    const kit = seedKit();
    kit.ctas.push({ label: "Win a prize", path: "/prize" });
    kit.hashtags.push("#two words");
    const msgs = kitProblems(kit).map((p) => p.section);
    assert.ok(msgs.includes("Calls to action"));
    assert.ok(msgs.includes("Hashtags"));
  });
});

describe("approval", () => {
  it("is the founder's alone", () => {
    assert.equal(canApproveKit({ role: "founder", status: "active" }), true);
    assert.equal(canApproveKit({ role: "admin", status: "active" }), false);
    assert.equal(canApproveKit({ role: "founder", status: "suspended" }), false);
  });

  it("finds the approved version and a newer draft", () => {
    const t = new Date();
    const versions = [
      { id: "a", number: 1, contentHash: "h1", createdAt: t },
      { id: "b", number: 2, contentHash: "h2", createdAt: t },
    ];
    assert.deepEqual(kitStatus(versions, []), { approved: null, draft: versions[1], latest: versions[1] });
    const s = kitStatus(versions, [{ versionId: "a", contentHash: "h1", approvedAt: t }]);
    assert.equal(s.approved?.id, "a");
    assert.equal(s.draft?.id, "b");
    // An approval that doesn't match the version's fingerprint counts for nothing.
    assert.equal(kitStatus(versions, [{ versionId: "b", contentHash: "other", approvedAt: t }]).approved, null);
  });

  it("fingerprints content, not key order", () => {
    const kit = seedKit();
    const reordered = { ...kit, identity: { values: kit.identity.values, promise: kit.identity.promise, positioning: kit.identity.positioning, mission: kit.identity.mission } };
    assert.equal(kitHash(kit), kitHash(reordered));
    assert.notEqual(kitHash(kit), kitHash({ ...kit, hashtags: [] }));
  });

  it("names the sections that changed", () => {
    const kit = seedKit();
    assert.deepEqual(changedSections(kit, { ...kit, hashtags: ["#Calm"] }), ["Hashtags"]);
    assert.deepEqual(changedSections(null, kit), ["Everything (first version)"]);
  });
});
