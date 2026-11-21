import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_CHARGE_PENCE,
  appliesTo,
  bestOffer,
  describeDiscount,
  normaliseCode,
  parseDiscountForm,
  parseFreeSessions,
  poundsToPence,
  priceAfter,
  withinLimits,
  type DiscountFormInput,
  type DiscountRule,
} from "./discounts";
import { creditsAfterRefund } from "./fulfilment";

const rule = (over: Partial<DiscountRule> = {}): DiscountRule => ({
  id: "d1",
  kind: "client",
  label: "Concessionary rate",
  percentOff: 50,
  amountOffPence: null,
  planSlugs: null,
  maxUses: null,
  maxUsesPerClient: null,
  startsAt: null,
  endsAt: null,
  active: true,
  ...over,
});

const now = new Date("2026-11-21T12:00:00Z");

describe("priceAfter", () => {
  it("takes a percentage off, to the penny", () => {
    assert.equal(priceAfter(3000, rule({ percentOff: 50 })), 1500);
    assert.equal(priceAfter(3500, rule({ percentOff: 33 })), 2345); // £11.55 off
  });

  it("takes an amount off", () => {
    assert.equal(priceAfter(4000, rule({ percentOff: null, amountOffPence: 1000 })), 3000);
  });

  it("lets a concession make something free", () => {
    assert.equal(priceAfter(3000, rule({ percentOff: 100 })), 0);
    assert.equal(priceAfter(3000, rule({ percentOff: null, amountOffPence: 5000 })), 0);
  });

  it("never lets a code make something free", () => {
    assert.equal(priceAfter(3000, rule({ kind: "code", percentOff: 100 })), MIN_CHARGE_PENCE);
  });

  it("never leaves less than £1 to pay by card", () => {
    assert.equal(priceAfter(3000, rule({ percentOff: 99 })), MIN_CHARGE_PENCE);
  });
});

describe("appliesTo", () => {
  it("covers every plan when none are named", () => {
    assert.equal(appliesTo(rule(), "package-4", now), true);
  });

  it("covers only the plans named", () => {
    const d = rule({ planSlugs: ["individual-session"] });
    assert.equal(appliesTo(d, "individual-session", now), true);
    assert.equal(appliesTo(d, "package-4", now), false);
  });

  it("is off before it starts, after it ends, and once turned off", () => {
    assert.equal(appliesTo(rule({ startsAt: new Date("2026-12-01T00:00:00Z") }), "x", now), false);
    assert.equal(appliesTo(rule({ endsAt: new Date("2026-11-21T00:00:00Z") }), "x", now), false);
    assert.equal(appliesTo(rule({ active: false }), "x", now), false);
  });
});

describe("withinLimits", () => {
  it("stops at the total number of uses", () => {
    assert.equal(withinLimits(rule({ maxUses: 3 }), { total: 2, byClient: 0 }), true);
    assert.equal(withinLimits(rule({ maxUses: 3 }), { total: 3, byClient: 0 }), false);
  });

  it("stops a code at its uses per client", () => {
    const code = rule({ kind: "code", maxUsesPerClient: 1 });
    assert.equal(withinLimits(code, { total: 10, byClient: 0 }), true);
    assert.equal(withinLimits(code, { total: 10, byClient: 1 }), false);
  });
});

describe("bestOffer", () => {
  it("is the full price with no discount", () => {
    assert.deepEqual(bestOffer(3500, []), { listPence: 3500, pricePence: 3500, discountPence: 0, discount: null });
  });

  it("never stacks: the lower price wins", () => {
    const concession = rule({ id: "c", percentOff: 20 });
    const code = rule({ id: "k", kind: "code", label: "WELCOME", percentOff: 30 });
    const offer = bestOffer(3500, [concession, code]);
    assert.equal(offer.pricePence, 2450);
    assert.equal(offer.discount?.id, "k");
  });

  it("prefers the concession on a tie", () => {
    const concession = rule({ id: "c", percentOff: 20 });
    const code = rule({ id: "k", kind: "code", percentOff: 20 });
    assert.equal(bestOffer(3500, [code, concession]).discount?.id, "c");
  });
});

describe("codes", () => {
  it("are compared in capitals without spaces", () => {
    assert.equal(normaliseCode(" welcome 10 "), "WELCOME10");
  });
});

it("reads pounds as pence", () => {
  assert.equal(poundsToPence("10"), 1000);
  assert.equal(poundsToPence("£7.5"), 750);
  assert.equal(poundsToPence("7.50"), 750);
  assert.equal(poundsToPence("seven"), null);
});

it("describes a discount", () => {
  assert.equal(describeDiscount({ percentOff: 50, amountOffPence: null }), "50% off");
  assert.equal(describeDiscount({ percentOff: null, amountOffPence: 750 }), "£7.50 off");
});

describe("parseDiscountForm", () => {
  const plans = [
    { slug: "initial-consultation", name: "Initial consultation", amountPence: 3000 },
    { slug: "individual-session", name: "Single session", amountPence: 3500 },
  ];
  const input = (over: Partial<DiscountFormInput> = {}): DiscountFormInput => ({
    label: "",
    type: "percent",
    value: "50",
    planSlugs: plans.map((p) => p.slug),
    maxUses: "",
    maxUsesPerClient: "",
    startsOn: "",
    endsOn: "",
    reason: "financial_hardship",
    note: "",
    code: "",
    ...over,
  });

  it("accepts a 50% concession on everything, defaulting the label", () => {
    const r = parseDiscountForm("client", input(), plans, now);
    assert.ok(r.ok);
    assert.equal(r.ok && r.value.label, "Concessionary rate");
    assert.equal(r.ok && r.value.planSlugs, null, "all plans chosen means all plans");
  });

  it("lets a concession be 100%", () => {
    assert.ok(parseDiscountForm("client", input({ value: "100" }), plans, now).ok);
  });

  it("refuses a code that would make anything free", () => {
    const r = parseDiscountForm("code", input({ code: "free", label: "Free", type: "amount", value: "30" }), plans, now);
    assert.ok(!r.ok && /can't make/.test(r.fieldErrors.value));
  });

  it("caps a code at 90%", () => {
    const r = parseDiscountForm("code", input({ code: "BIG", label: "Big", value: "95" }), plans, now);
    assert.ok(!r.ok && r.fieldErrors.value);
  });

  it("refuses a discount that would leave less than £1", () => {
    const r = parseDiscountForm("client", input({ type: "amount", value: "29.50" }), plans, now);
    assert.ok(!r.ok && /less than £1/.test(r.fieldErrors.value));
  });

  it("requires a reason for a concession, but not for a code", () => {
    assert.ok(!parseDiscountForm("client", input({ reason: "" }), plans, now).ok);
    const code = parseDiscountForm("code", input({ code: "welcome10", label: "Welcome", reason: "" }), plans, now);
    assert.ok(code.ok);
    assert.equal(code.ok && code.value.code, "WELCOME10");
    assert.equal(code.ok && code.value.maxUsesPerClient, 1, "a code is once per client unless set");
  });

  it("ends at the end of the chosen UK day", () => {
    const r = parseDiscountForm("client", input({ endsOn: "2026-11-30" }), plans, now);
    assert.equal(r.ok && r.value.endsAt?.toISOString(), "2026-12-01T00:00:00.000Z");
  });

  it("refuses an end date that has passed", () => {
    assert.ok(!parseDiscountForm("client", input({ endsOn: "2026-11-01" }), plans, now).ok);
  });

  it("requires at least one thing it applies to", () => {
    assert.ok(!parseDiscountForm("client", input({ planSlugs: [] }), plans, now).ok);
  });
});

describe("parseFreeSessions", () => {
  it("always gives one consultation", () => {
    const r = parseFreeSessions({ what: "consultation", count: "5", reason: "goodwill", note: "" });
    assert.ok(r.ok && r.value.count === 1);
  });

  it("gives up to 12 sessions", () => {
    assert.ok(parseFreeSessions({ what: "session", count: "3", reason: "goodwill", note: "" }).ok);
    assert.ok(!parseFreeSessions({ what: "session", count: "13", reason: "goodwill", note: "" }).ok);
  });

  it("requires a reason", () => {
    assert.ok(!parseFreeSessions({ what: "session", count: "1", reason: "", note: "" }).ok);
  });
});

it("refunds a discounted package in proportion to what was paid", () => {
  // £75 paid for four sessions at 50% off; half refunded keeps two.
  assert.equal(creditsAfterRefund({ sessions: 4, amountPence: 7500, refundedPence: 3750 }), 2);
});
