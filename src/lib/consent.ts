"use client";

import { useSyncExternalStore } from "react";

export const CONSENT_KEY = "thrivsphere-cookie-consent";
const EVENT = "thrivsphere-consent-change";

export type Consent = "accepted" | "essential";
/** `null` means the visitor has not chosen yet — treat as "no consent". */
export type ConsentState = Consent | null;

function read(): ConsentState {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "essential" ? v : null;
  } catch {
    // Private browsing or blocked storage — behave as though nothing was agreed.
    return null;
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* nothing we can do; the visitor simply gets asked again next time */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  // Keep other tabs in step.
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Current cookie consent.
 *
 * Read through `useSyncExternalStore` rather than an effect so the value is
 * never written into state during render — the server snapshot is always
 * `null`, so nothing non-essential can load before the visitor has chosen.
 */
export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** True only when the visitor has actively opted in to analytics. */
export function useAnalyticsAllowed(): boolean {
  return useConsent() === "accepted";
}
