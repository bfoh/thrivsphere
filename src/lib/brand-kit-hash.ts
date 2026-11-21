import { createHash } from "node:crypto";
import type { BrandKit } from "./brand-kit";

/** A fingerprint of a Brand Kit version, so an approval covers exactly what was read. */
export function kitHash(kit: BrandKit): string {
  return createHash("sha256").update(canonical(kit)).digest("hex");
}

/** JSON with keys in a fixed order, whatever order they were built in. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}
