/**
 * Recommendation selection + explanation.
 *
 * First-match over the configured rule table (src/engine/config.ts).
 * The rationale is built from the device's actual measured attributes, so
 * the explanation always names the numbers that fired the rule.
 */
import {
  ATTRIBUTE_LABELS,
  LOW_CONFIDENCE_THRESHOLD,
  RECOMMENDATION_RULES,
  type EngineAttributes,
  type RecommendationRule,
} from "@/engine/config";
import type {
  ContributingFactor,
  Recommendation,
  ScoreAttribute,
} from "@/types/score";

export interface RuleEvaluation {
  recommendation: Recommendation;
  /** The rule that fired — exposed for tests and debugging. */
  rule: RecommendationRule;
}

export function evaluateRecommendation(attributes: EngineAttributes): RuleEvaluation {
  const rule = RECOMMENDATION_RULES.find((r) => r.when(attributes));
  // The table ends with an unconditional fallback, so `rule` is always found.
  if (!rule) {
    throw new Error("Recommendation rule table has no fallback rule.");
  }
  return {
    rule,
    recommendation: {
      path: rule.path,
      headline: rule.path.toUpperCase(),
      rationale: rule.rationale(attributes),
      matchedRuleId: rule.id,
    },
  };
}

/**
 * Attribute contributions ranked by absolute points — strongest influence on
 * the score first. Deterministic ordering (ties keep attribute order via
 * stable sort).
 */
export function contributingFactors(
  contributions: { key: ScoreAttribute; label: string; value: number; weight: number; weighted: number }[],
): ContributingFactor[] {
  return contributions
    .map((c) => ({
      key: c.key,
      label: c.label,
      value: c.value,
      weight: c.weight,
      contribution: Math.round(c.weighted * 100) / 100,
      effect: c.value >= 50 ? ("lift" as const) : ("drag" as const),
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/**
 * Human-readable explanation of WHY this recommendation fired, grounded in:
 *  - the fired rule's attribute-specific rationale
 *  - the top contributing factors of the score
 *  - an explicit confidence caveat when the analysis was uncertain
 */
export function buildReasoning(params: {
  attributes: EngineAttributes;
  recommendation: Recommendation;
  confidence: number;
  factors: ContributingFactor[];
  overall: number;
}): string {
  const { attributes, recommendation, confidence, factors, overall } = params;

  const top = factors[0];
  const drag = factors.filter((f) => f.effect === "drag").at(-1);

  const parts = [
    recommendation.rationale,
    `Next Life Score ${overall}/100, driven mainly by ${top.label.toLowerCase()} (${top.value})${drag ? `, while ${drag.label.toLowerCase()} (${drag.value}) held it back` : ""}.`,
    `Measured: condition ${attributes.condition}, repairability ${attributes.repairability}, reuse potential ${attributes.reusePotential}, resale potential ${attributes.resalePotential}, material recovery ${attributes.materialRecoveryPotential}.`,
  ];

  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    parts.push(
      `Uncertainty note: analysis confidence is ${confidence}/100 (below ${LOW_CONFIDENCE_THRESHOLD}) — treat this recommendation as provisional and re-scan with a clearer photo before acting.`,
    );
  }

  return parts.join(" ");
}

/** Shorthand: the five measured attributes from a full DeviceAnalysis. */
export function toEngineAttributes(analysis: {
  condition: number;
  repairability: number;
  reusePotential: number;
  resalePotential: number;
  materialRecoveryPotential: number;
}): EngineAttributes {
  return {
    condition: analysis.condition,
    repairability: analysis.repairability,
    reusePotential: analysis.reusePotential,
    resalePotential: analysis.resalePotential,
    materialRecoveryPotential: analysis.materialRecoveryPotential,
  };
}

export { ATTRIBUTE_LABELS };
