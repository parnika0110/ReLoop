/**
 * Next Life Score — pure weighted sum of measured attributes.
 *
 *   score = Σ (attribute × weight)   with Σ weights = 1
 *
 * Because every attribute is 0–100 and weights sum to 1, the result is
 * naturally 0–100; we still clamp defensively so the invariant holds even if
 * weights are edited later (tests assert both bounds and weight sum).
 */
import {
  ATTRIBUTE_LABELS,
  ENGINE_VERSION,
  SCORE_WEIGHTS,
  type EngineAttributes,
} from "@/engine/config";
import type { ReLoopScore, ScoreAttribute } from "@/types/score";

const ATTRIBUTE_ORDER: ScoreAttribute[] = [
  "condition",
  "repairability",
  "reusePotential",
  "resalePotential",
  "materialRecoveryPotential",
];

export function computeScore(attributes: EngineAttributes): ReLoopScore {
  let total = 0;
  const contributions = ATTRIBUTE_ORDER.map((key) => {
    const weight = SCORE_WEIGHTS[key];
    const value = clampScore(attributes[key]);
    const weighted = value * weight;
    total += weighted;
    return {
      key,
      label: ATTRIBUTE_LABELS[key],
      value,
      weight,
      weighted: round2(weighted),
    };
  });

  return {
    overall: Math.max(0, Math.min(100, Math.round(total))),
    contributions,
    engineVersion: ENGINE_VERSION,
  };
}

/** The engine only ever sees validated 0–100 attributes; clamp = defense in depth. */
function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
