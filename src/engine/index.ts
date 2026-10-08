/**
 * ReLoop Decision Engine — public entry point.
 *
 *   DeviceAnalysis (AI observations)
 *     → runEngine()
 *     → { score, recommendation, confidence, contributingFactors, reasoning }
 *
 * Pure and deterministic: no I/O, no randomness, no LLM. The AI never
 * contributes to the score or the recommendation — only measured attributes
 * enter this module (see src/engine/config.ts for weights/thresholds).
 */
import type { DeviceAnalysis } from "@/types/analysis";
import type {
  ContributingFactor,
  ReLoopScore,
  Recommendation,
} from "@/types/score";
import { ENGINE_VERSION } from "@/engine/config";
import { computeScore } from "@/engine/score";
import {
  buildReasoning,
  contributingFactors,
  evaluateRecommendation,
  toEngineAttributes,
} from "@/engine/recommend";

export interface EngineResult {
  score: ReLoopScore;
  recommendation: Recommendation;
  /** Model's self-reported analysis confidence, 0–100 (propagated, not altered). */
  confidence: number;
  contributingFactors: ContributingFactor[];
  /** Attribute-grounded explanation of the recommendation. */
  reasoning: string;
  engineVersion: string;
}

export function runEngine(analysis: DeviceAnalysis): EngineResult {
  const attributes = toEngineAttributes(analysis);
  const score = computeScore(attributes);
  const { recommendation } = evaluateRecommendation(attributes);
  const factors = contributingFactors(score.contributions);

  const reasoning = buildReasoning({
    attributes,
    recommendation,
    confidence: analysis.confidence,
    factors,
    overall: score.overall,
  });

  return {
    score,
    recommendation,
    confidence: analysis.confidence,
    contributingFactors: factors,
    reasoning,
    engineVersion: ENGINE_VERSION,
  };
}

export { computeScore } from "@/engine/score";
export { evaluateRecommendation } from "@/engine/recommend";
export {
  SCORE_WEIGHTS,
  RECOMMENDATION_RULES,
  ENGINE_VERSION,
} from "@/engine/config";
