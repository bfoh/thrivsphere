import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PEOPLE, parseAssetDetails } from "./asset-rules";

const form = (f: Record<string, string>) => (n: string) => f[n] ?? "";

describe("asset details", () => {
  it("never offers a client as someone in a photo", () => {
    assert.ok(!PEOPLE.some((p) => /client/i.test(p.value + p.label)));
  });

  it("keeps tidy details", () => {
    const r = parseAssetDetails(form({ title: " Morning  walk ", rights: "owned", altText: "A path through woods", tags: "Nature, calm , nature" }), { upload: true });
    assert.deepEqual(r, { ok: true, value: { title: "Morning walk", altText: "A path through woods", tags: ["nature", "calm"], rights: "owned", rightsNote: null, people: "none", licenceExpires: null } });
  });

  it("asks where licensed images come from, and for staff agreement", () => {
    assert.equal(parseAssetDetails(form({ title: "x", rights: "licensed" }), { upload: true }).ok, false);
    assert.equal(parseAssetDetails(form({ title: "x", rights: "owned", people: "staff_consented" }), { upload: true }).ok, false);
    assert.equal(parseAssetDetails(form({ title: "x", rights: "owned", people: "staff_consented", staffConsent: "on" }), { upload: true }).ok, true);
  });

  it("doesn't let an upload claim to be AI-made, or record anyone else", () => {
    assert.equal(parseAssetDetails(form({ title: "x", rights: "generated" }), { upload: true }).ok, false);
    assert.equal(parseAssetDetails(form({ title: "x", rights: "owned", people: "client" }), { upload: true }).ok, false);
  });
});
