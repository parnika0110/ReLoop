/**
 * Brand identity helpers.
 *
 * Two consumers, one definition:
 *  - the AI-analysis boundary (`analysis/schema.ts`) drops placeholder junk
 *    Nova emits when it cannot identify a brand;
 *  - the result page derives the human label for the heading and the tab title.
 *
 * Brand never reaches the scoring engine, so everything here is display-only.
 */
import type { DeviceAnalysis } from "@/types/analysis";

/**
 * Values some models emit in place of a real brand when they cannot identify
 * one. Matched case-insensitively against the trimmed value. They are not
 * observable facts, so they are treated exactly like "not observed".
 */
const BRAND_PLACEHOLDERS = new Set([
  "0",
  "00",
  "?",
  "n/a",
  "n.a",
  "na",
  "none",
  "null",
  "undefined",
  "unknown",
  "unidentified",
  "unbranded",
  "generic",
  "other",
  "other/unknown",
  "not available",
  "not identifiable",
  "not identified",
  "not observed",
  "unspecified",
  "",
]);

/** True when a candidate brand is placeholder junk rather than a brand. */
export function isBrandPlaceholder(value: string): boolean {
  return BRAND_PLACEHOLDERS.has(value.trim().toLowerCase());
}

/**
 * "Apple MacBook Pro" when brand and model are both known, whichever part is
 * known when only one is, and `null` when neither is — never a placeholder.
 *
 * Re-checked here as well as at the analysis boundary, because records
 * persisted before normalization existed still carry the raw value, and
 * because `model` is not normalized at the boundary.
 */
export function brandModelLabel(
  analysis: Pick<DeviceAnalysis, "brand" | "model">,
): string | null {
  const parts = [analysis.brand, analysis.model].filter(
    (part): part is string => part !== null && !isBrandPlaceholder(part),
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Human label for a scan: the brand/model, or the device type.
 *
 * Falls back to `deviceType` — never to a placeholder — so a result reads
 * "laptop — 40 Next Life Score", not "0 — 40 Next Life Score".
 */
export function deviceDisplayName(
  analysis: Pick<DeviceAnalysis, "brand" | "model" | "deviceType">,
): string {
  return brandModelLabel(analysis) ?? analysis.deviceType;
}
