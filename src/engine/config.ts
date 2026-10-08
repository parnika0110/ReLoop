/**
 * ReLoop Decision Engine — configuration.
 *
 * Everything here is data: weights, thresholds, and the ordered rule table.
 * The engine is deterministic — same DeviceAnalysis always yields the same
 * score + recommendation. AI supplies observations only; the rules below are
 * the sole decision logic.
 *
 * ## Scoring model (weights sum to 1.0)
 *   condition                 × 25%  — how intact the device is today
 *   repairability             × 20%  — how economically fixable it is
 *   reusePotential            × 25%  — how readily it serves another user
 *   resalePotential           × 15%  — market/economic value retained
 *   materialRecoveryPotential × 15%  — value recoverable at end of life
 *
 * ## Recommendation rules (evaluated top-down, first match wins)
 * See RECOMMENDATION_RULES — each threshold is documented with its rationale.
 * Ordering matters: cheaper/more value-preserving paths are tried before
 * destructive ones (recycle is both first — as an unusable-device gate — and
 * last — as the fallback).
 */
import type { NextLifePath, ScoreAttribute } from "@/types/score";

export const ENGINE_VERSION = "reloop-engine-1.0.0";

/** Weight per attribute; must always sum to 1 (asserted in tests). */
export const SCORE_WEIGHTS: Record<ScoreAttribute, number> = {
  condition: 0.25,
  repairability: 0.2,
  reusePotential: 0.25,
  resalePotential: 0.15,
  materialRecoveryPotential: 0.15,
};

/** Human-readable labels used in breakdowns and reasoning. */
export const ATTRIBUTE_LABELS: Record<ScoreAttribute, string> = {
  condition: "Condition",
  repairability: "Repairability",
  reusePotential: "Reuse potential",
  resalePotential: "Resale potential",
  materialRecoveryPotential: "Material recovery",
};

/**
 * Confidence below this level appends a verification caveat to the reasoning.
 * Confidence does NOT change which path is chosen — rules run on measured
 * attributes; uncertainty calls for human verification, not a different action.
 */
export const LOW_CONFIDENCE_THRESHOLD = 40;

/** The five measured attributes the engine consumes (no image, no prose). */
export interface EngineAttributes {
  condition: number;
  repairability: number;
  reusePotential: number;
  resalePotential: number;
  materialRecoveryPotential: number;
}

/**
 * A recommendation rule: a readable predicate over measured attributes plus a
 * rationale that interpolates the actual values (so the UI explains the real
 * numbers, not a canned sentence).
 */
export interface RecommendationRule {
  id: string;
  path: NextLifePath;
  /** Predicate — pure, total, deterministic. */
  when: (a: EngineAttributes) => boolean;
  /** Why this path, built from the device's measured attributes. */
  rationale: (a: EngineAttributes) => string;
}

/**
 * Ordered rule table — first match wins.
 *
 * Threshold rationale:
 * - recycle-unusable  reuse < 35 AND repairability < 40.
 *     Below both bars there is no user path and no economical fix; remaining
 *     value is materials. These are intentionally conservative (low) so a
 *     marginal device is never written off while reuse/repair still clear.
 * - repair-fixable    repairability ≥ 70, 35 ≤ condition < 70, reuse ≥ 40.
 *     Condition ≥ 35 = a real but bounded defect; condition < 70 = a defect
 *     exists (nothing to repair otherwise); repairability ≥ 70 = fixes are
 *     economically sane; reuse ≥ 40 = a user waiting on the other side.
 * - resell-market     resale ≥ 80 AND condition ≥ 75.
 *     Market pays premium only for near-pristine devices; selling as-is
 *     returns more value than spending on restoration first.
 * - refurbish-restorable  45 ≤ condition < 75, resale ≥ 55, reuse ≥ 50.
 *     Worn but working and wanted: professional restoration unlocks resale/
 *     reuse headroom. Condition < 45 means restoration costs exceed value.
 * - reuse-working     condition ≥ 70 AND reuse ≥ 70.
 *     Working, healthy, no premium buyer identified — keep it whole and in use.
 * - donate-functional condition ≥ 45, reuse ≥ 45, resale < 55.
 *     Useful to a person but worthless to the market — donation maximizes
 *     social value. Placed after resell/refurbish so economic value isn't
 *     given away when the market would pay.
 * - fallback-recover  always. Nothing matched → materials are the remainder.
 */
export const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    id: "recycle-unusable",
    path: "recycle",
    when: (a) => a.reusePotential < 35 && a.repairability < 40,
    rationale: (a) =>
      `Reuse potential ${a.reusePotential} (< 35) and repairability ${a.repairability} (< 40) rule out another working life; material recovery ${a.materialRecoveryPotential} defines what remains — recycle.`,
  },
  {
    id: "repair-fixable",
    path: "repair",
    when: (a) =>
      a.repairability >= 70 &&
      a.condition >= 35 &&
      a.condition < 70 &&
      a.reusePotential >= 40,
    rationale: (a) =>
      `Repairability ${a.repairability} (≥ 70) with condition ${a.condition} (35–69) and reuse potential ${a.reusePotential} (≥ 40) describes a fixable defect on a fundamentally reusable device — repair is the cheapest path back to value.`,
  },
  {
    id: "resell-market",
    path: "resell",
    when: (a) => a.resalePotential >= 80 && a.condition >= 75,
    rationale: (a) =>
      `Condition ${a.condition} (≥ 75) and resale potential ${a.resalePotential} (≥ 80) put this device in market-ready shape — selling as-is returns the most value without spending on restoration.`,
  },
  {
    id: "refurbish-restorable",
    path: "refurbish",
    when: (a) =>
      a.condition >= 45 &&
      a.condition < 75 &&
      a.resalePotential >= 55 &&
      a.reusePotential >= 50,
    rationale: (a) =>
      `Condition ${a.condition} (45–74) with resale potential ${a.resalePotential} (≥ 55) and reuse potential ${a.reusePotential} (≥ 50) means professional restoration would unlock value the device doesn't yet carry — refurbish.`,
  },
  {
    id: "reuse-working",
    path: "reuse",
    when: (a) => a.condition >= 70 && a.reusePotential >= 70,
    rationale: (a) =>
      `Condition ${a.condition} (≥ 70) and reuse potential ${a.reusePotential} (≥ 70) — the device works and has real life ahead, so direct reuse keeps it whole rather than splitting it for parts.`,
  },
  {
    id: "donate-functional",
    path: "donate",
    when: (a) =>
      a.condition >= 45 && a.reusePotential >= 45 && a.resalePotential < 55,
    rationale: (a) =>
      `Condition ${a.condition} (≥ 45) and reuse potential ${a.reusePotential} (≥ 45) keep it genuinely useful, but resale potential ${a.resalePotential} (< 55) means the market won't pay — donation puts it with someone who needs it.`,
  },
  {
    id: "fallback-recover",
    path: "recycle",
    when: () => true,
    rationale: (a) =>
      `No path met its thresholds (condition ${a.condition}, repairability ${a.repairability}, reuse ${a.reusePotential}, resale ${a.resalePotential}) — material recovery ${a.materialRecoveryPotential} is the remaining value.`,
  },
];
