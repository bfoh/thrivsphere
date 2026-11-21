import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeAttribution, heardViaLabel, parseAttribution, referrerHost, sanitisePath, sanitiseUtm } from "./attribution";

const form = (fields: Record<string, string>) => (n: string) => fields[n] ?? "";

describe("sanitiseUtm", () => {
  it("keeps simple tags, lower-cased", () => {
    assert.equal(sanitiseUtm("Instagram"), "instagram");
    assert.equal(sanitiseUtm(" spring calm "), "spring-calm");
    assert.equal(sanitiseUtm("stress_awareness.2027"), "stress_awareness.2027");
  });

  it("drops anything that isn't a plain tag", () => {
    assert.equal(sanitiseUtm(""), null);
    assert.equal(sanitiseUtm("<script>"), null);
    assert.equal(sanitiseUtm("me@example.com"), null);
    assert.equal(sanitiseUtm("x".repeat(65)), null);
  });
});

describe("sanitisePath and referrerHost", () => {
  it("keeps only a path on this site", () => {
    assert.equal(sanitisePath("/book?utm_source=x"), "/book");
    assert.equal(sanitisePath("https://evil.example/book"), null);
    assert.equal(sanitisePath("//evil.example"), null);
  });

  it("names the other site, not this one", () => {
    assert.equal(referrerHost("https://www.instagram.com/p/abc", "thrivsphere.org"), "instagram.com");
    assert.equal(referrerHost("https://l.facebook.com/l.php?u=x", "thrivsphere.org"), "facebook.com");
    assert.equal(referrerHost("https://thrivsphere.org/blog", "thrivsphere.org"), null);
    assert.equal(referrerHost("https://www.thrivsphere.org/", "thrivsphere.org"), null);
    assert.equal(referrerHost("not a url", "thrivsphere.org"), null);
  });
});

describe("parseAttribution", () => {
  it("returns nothing when there is nothing to keep", () => {
    assert.equal(parseAttribution(form({ landingPath: "/contact" }), "thrivsphere.org"), null);
  });

  it("keeps what someone told us, and the tags on their link", () => {
    const a = parseAttribution(
      form({ heardVia: "instagram", utm_source: "instagram", utm_medium: "social", utm_campaign: "Spring-Calm", landingPath: "/book" }),
      "thrivsphere.org"
    );
    assert.deepEqual(a, {
      heardVia: "instagram",
      heardViaDetail: null,
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "spring-calm",
      utmContent: null,
      landingPath: "/book",
      referrerHost: null,
    });
  });

  it("keeps detail only for 'somewhere else', and ignores unknown answers", () => {
    assert.equal(parseAttribution(form({ heardVia: "other", heardViaDetail: "  A leaflet   at work " }))?.heardViaDetail, "A leaflet at work");
    assert.equal(parseAttribution(form({ heardVia: "instagram", heardViaDetail: "ignored" }))?.heardViaDetail, null);
    assert.equal(parseAttribution(form({ heardVia: "tiktok-spam" })), null);
  });
});

describe("describeAttribution", () => {
  it("reads naturally for staff", () => {
    assert.equal(
      describeAttribution({ heardVia: "instagram", utmCampaign: "spring-calm", utmSource: "instagram", utmMedium: "social" }),
      "Instagram · campaign spring-calm (instagram / social)"
    );
    assert.equal(describeAttribution({ heardVia: "other", heardViaDetail: "A leaflet" }), "Somewhere else: A leaflet");
    assert.equal(describeAttribution({ referrerHost: "linkedin.com" }), "came from linkedin.com");
    assert.equal(describeAttribution(null), null);
    assert.equal(heardViaLabel("nope"), null);
  });
});
