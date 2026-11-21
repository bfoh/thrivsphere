import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { personalDataFound } from "./personal-data";
import { brand } from "../../data/site";

describe("personalDataFound", () => {
  it("stops client details and contact details", () => {
    assert.equal(personalDataFound("Email jo.bloggs@gmail.com for details"), "an email address");
    assert.equal(personalDataFound("Call me on 07700 900123"), "a mobile phone number");
    assert.equal(personalDataFound("Ring +44 7700 900123"), "a mobile phone number");
    assert.equal(personalDataFound("NHS number 943 476 5919"), "what looks like an NHS number");
    assert.equal(personalDataFound("One of our clients told us she felt better"), "something about a client");
    assert.equal(personalDataFound("My client was struggling"), "something about a client");
  });

  it("lets ordinary writing and helplines through", () => {
    assert.equal(personalDataFound("Samaritans are free on 116 123, day or night."), null);
    assert.equal(personalDataFound("The National Domestic Abuse Helpline: 0808 2000 247."), null);
    assert.equal(personalDataFound(`Contact ${brand.email} or hello@thrivsphere.org`), null);
    assert.equal(personalDataFound("Every session is built around our clients' goals."), null);
    assert.equal(personalDataFound("Sessions for a client and their family"), null);
  });
});
