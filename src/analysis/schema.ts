/**
 * Runtime validation of raw AI output.
 *
 * NOTHING from a model reaches the scoring engine without passing through
 * `parseModelOutput`. Rules:
 *  - all numeric attributes must be finite numbers in 0–100
 *  - deviceType must be one of the supported devices
 *  - unknown/unobservable fields must be null — never invented
 *  - a model may declare its own output insufficient; we honour that
 *  - malformed JSON or shape → malformed_output (rejected, not repaired)
 *
 * No prose from the model is ever used as a recommendation — this module only
 * extracts observation attributes.
 */
import {
  isSupportedDeviceType,
  type DeviceAnalysis,
  type IssueSeverity,
  type ObservedIssue,
} from "@/types/analysis";
import type { AnalysisErrorKind } from "@/types/analysis";
import { isBrandPlaceholder } from "@/lib/brand";

export type ParseFailure = {
  kind: AnalysisErrorKind;
  message: string;
  /** Dotted paths that failed validation, for logging/UI detail. */
  paths?: string[];
  /** What the image was missing, when kind === "insufficient_information". */
  missing?: string[];
};

export type ParseResult =
  | { ok: true; analysis: DeviceAnalysis }
  | { ok: false } & ParseFailure;

const SCORE_FIELDS = [
  "condition",
  "repairability",
  "reusePotential",
  "resalePotential",
  "materialRecoveryPotential",
] as const;

const ISSUE_SEVERITIES: readonly IssueSeverity[] = [
  "minor",
  "moderate",
  "critical",
  "unknown",
];

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isNullableScore(value: unknown): value is number | null {
  return value === null || isScore(value);
}

function isNullableString(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  // Empty strings are treated as "not observed" → normalized to null.
  return trimmed.length === 0 || trimmed.length <= 120;
}

/**
 * Normalize a brand string at the AI boundary: trim, and collapse
 * placeholder junk to null. The contract stays `string | null` — the engine
 * never sees brand at all, so this is display-only.
 */
function normalizeBrandValue(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (normalized === null) return null;
  return isBrandPlaceholder(normalized) ? null : normalized;
}

function isObservedIssue(value: unknown): value is ObservedIssue {
  if (typeof value !== "object" || value === null) return false;
  const issue = value as Record<string, unknown>;
  return (
    typeof issue.id === "string" &&
    issue.id.length > 0 &&
    issue.id.length <= 64 &&
    typeof issue.label === "string" &&
    issue.label.length > 0 &&
    issue.label.length <= 200 &&
    typeof issue.severity === "string" &&
    (ISSUE_SEVERITIES as readonly string[]).includes(issue.severity)
  );
}

/**
 * A model may declare the image insufficiently informative instead of
 * guessing. Shape: { "insufficient": true, "reason": "...", "missing": [...] }
 */
function asInsufficient(payload: Record<string, unknown>): ParseFailure | null {
  if (payload.insufficient !== true) return null;
  const reason =
    typeof payload.reason === "string" && payload.reason.trim().length > 0
      ? payload.reason.trim()
      : "The image did not contain enough information for a reliable analysis.";
  const missing = Array.isArray(payload.missing)
    ? payload.missing.filter((m): m is string => typeof m === "string").slice(0, 8)
    : undefined;
  return { kind: "insufficient_information", message: reason, missing };
}

/**
 * Validate and normalize one raw model payload into a DeviceAnalysis.
 * Returns a discriminated result — callers must branch on `.ok`.
 */
export function parseModelPayload(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      kind: "malformed_output",
      message: "Analysis output was not a JSON object.",
    };
  }
  const payload = raw as Record<string, unknown>;

  const insufficient = asInsufficient(payload);
  if (insufficient) return { ok: false, ...insufficient };

  const failed: string[] = [];

  if (!isSupportedDeviceType(payload.deviceType)) {
    return {
      ok: false,
      kind: "unsupported_device",
      message: `Unsupported or missing device type: ${JSON.stringify(payload.deviceType)}. ReLoop supports laptops, smartphones, and tablets.`,
    };
  }

  for (const field of SCORE_FIELDS) {
    if (!isScore(payload[field])) failed.push(field);
  }
  if (!isScore(payload.confidence)) failed.push("confidence");
  if (!isNullableScore(payload.estimatedAge)) failed.push("estimatedAge");
  if (!isNullableString(payload.brand)) failed.push("brand");
  if (!isNullableString(payload.model)) failed.push("model");
  if (!Array.isArray(payload.observedIssues)) {
    failed.push("observedIssues");
  } else if (!payload.observedIssues.every(isObservedIssue)) {
    failed.push("observedIssues[]");
  }

  if (failed.length > 0) {
    return {
      ok: false,
      kind: "malformed_output",
      message: `Analysis output failed validation for: ${failed.join(", ")}.`,
      paths: failed,
    };
  }

  // All fields checked above — assert types for the compiler.
  const analysis: DeviceAnalysis = {
    deviceType: payload.deviceType,
    brand: normalizeBrandValue(payload.brand),
    model: normalizeString(payload.model),
    estimatedAge:
      payload.estimatedAge === null
        ? null
        : Math.round((payload.estimatedAge as number) * 10) / 10,
    condition: payload.condition as number,
    repairability: payload.repairability as number,
    reusePotential: payload.reusePotential as number,
    resalePotential: payload.resalePotential as number,
    materialRecoveryPotential: payload.materialRecoveryPotential as number,
    observedIssues: payload.observedIssues as ObservedIssue[],
    confidence: payload.confidence as number,
  };

  return { ok: true, analysis };
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Extract the JSON object from raw model text. Tolerates code fences and
 * surrounding prose, but the payload itself must still validate strictly.
 * Returns null when no parseable object exists.
 */
export function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
