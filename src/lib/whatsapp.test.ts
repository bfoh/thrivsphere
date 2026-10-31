import test from "node:test";
import assert from "node:assert/strict";
import { whatsappHref } from "./whatsapp";

test("renders nothing until a number is configured", () => {
  assert.equal(whatsappHref(undefined), null);
  assert.equal(whatsappHref(""), null);
});

test("accepts a UK number however it is written", () => {
  for (const n of ["07700 900123", "+44 7700 900123", "0044 7700 900123", "+44 7700-900123"]) {
    assert.match(whatsappHref(n) ?? "", /^https:\/\/wa\.me\/447700900123\?text=/, n);
  }
});

test("rejects something that is not a phone number", () => {
  assert.equal(whatsappHref("call us"), null);
  assert.equal(whatsappHref("123"), null);
});

test("opens with a general greeting, URL-encoded", () => {
  const href = whatsappHref("07700900123", "Hi & hello");
  assert.equal(href, "https://wa.me/447700900123?text=Hi%20%26%20hello");
});
