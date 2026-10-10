/**
 * Deterministic scoring contract.
 *
 * Everything in this file is produced by the ReLoop Decision Engine
 * (src/engine) from a DeviceAnalysis — never by an LLM directly.
 */
import type { DeviceAnalysis } from "./analysis";

export type ScoreAttribute =
  | "condition"
  | "repairability"
  | "reusePotential"
  | "resalePotential"
  | "materialRecoveryPotential";

export const NEXT_LIFE_PATHS = [
  "repair",
  "refurbish",
  "reuse",
  "donate",
  "resell",
  "recycle",
] as const;

export type NextLifePath = (typeof NEXT_LIFE_PATHS)[number];

export function isNextLifePath(value: unknown): value is NextLifePath {
  return (
    typeof value === "string" &&
    (NEXT_LIFE_PATHS as readonly string[]).includes(value)
  );
}

/** One row of the explainable score breakdown. */
export interface ScoreContribution {
  key: ScoreAttribute;
  label: string;
  /** Raw attribute value 0–100. */
  value: number;
  /** Configured weight, 0–1. */
  weight: number;
  /** value × weight. */
  weighted: number;
}

/** Weighted, normalized 0–100 Next Life Score with its full breakdown. */
export interface ReLoopScore {
  /** Rounded overall score, 0–100. */
  overall: number;
  contributions: ScoreContribution[];
  /** Version of the scoring model that produced this score. */
  engineVersion: string;
}

/** One attribute's role in the score, ranked for display. */
export interface ContributingFactor {
  key: ScoreAttribute;
  label: string;
  value: number;
  weight: number;
  /** Points this attribute contributed to the overall score. */
  contribution: number;
  /** "lift" when at/above the 50 midpoint, "drag" when below. */
  effect: "lift" | "drag";
}

/** Deterministic rule outcome: which next life fits best and why. */
export interface Recommendation {
  path: NextLifePath;
  /** Display headline, e.g. "REFURBISH". */
  headline: string;
  /** One-sentence, attribute-based justification. */
  rationale: string;
  /** Id of the rule that fired (rules are configurable in src/engine/config.ts). */
  matchedRuleId: string;
}

/**
 * An estimate — never a precise scientific claim.
 * Every value must carry `basis` and `assumptions` so the UI can label it
 * honestly, plus `deviceType`/`pathway` so it is traceable to what produced it.
 * The UI must render these as "Estimated" / "Potential".
 */
export interface ImpactEstimate {
  /** Traceability: which device category this estimate applies to. */
  deviceType: DeviceAnalysis["deviceType"];
  /** Traceability: which next-life pathway was selected. */
  pathway: NextLifePath;
  metricId:
    | "lifeExtensionMonths"
    | "wasteAvoidedKg"
    | "valueRetainedInr"
    | "valueRetainedUsd"
    | "materialRecoveredKg";
  label: string;
  value: number;
  unit: string;
  /** Where the number comes from (model, dataset, or "transparent assumption"). */
  basis: string;
  /** Simplifying assumptions behind the estimate. */
  assumptions: string[];
  range?: { low: number; high: number };
}

/** Attributes an ImpactEstimate was derived from — keeps estimates reproducible. */
export type ImpactInput = Pick<
  DeviceAnalysis,
  | "deviceType"
  | "condition"
  | "reusePotential"
  | "resalePotential"
  | "materialRecoveryPotential"
>;
