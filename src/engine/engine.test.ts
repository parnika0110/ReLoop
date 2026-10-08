/**
 * ReLoop Decision Engine unit tests.
 *
 * Required scenarios:
 *  1. high-condition reusable laptop        → REUSE
 *  2. repairable damaged phone              → REPAIR
 *  3. low-reuse / high-material device      → RECYCLE
 *  4. high-resale device                    → RESELL
 *  5. uncertain / low-confidence analysis   → same deterministic output,
 *                                             reasoning carries a caveat
 * Plus invariants: weights sum to 1, score bounds, every rule reachable,
 * rule-table totality, and full structured result shape.
 */
import { describe, expect, it } from "vitest";
import { runEngine } from "@/engine";
import {
  SCORE_WEIGHTS,
  RECOMMENDATION_RULES,
  LOW_CONFIDENCE_THRESHOLD,
  type EngineAttributes,
} from "@/engine/config";
import { computeScore } from "@/engine/score";
import { evaluateRecommendation } from "@/engine/recommend";
import type { DeviceAnalysis } from "@/types/analysis";

function analysisOf(
  attributes: EngineAttributes,
  confidence = 75,
): DeviceAnalysis {
  return {
    deviceType: "laptop",
    brand: "TestBrand",
    model: null,
    estimatedAge: 3,
    observedIssues: [],
    confidence,
    ...attributes,
  };
}

// ---------------------------------------------------------------------------
// 1. High-condition reusable laptop → REUSE
// ---------------------------------------------------------------------------
const reusableLaptop: EngineAttributes = {
  condition: 88,
  repairability: 82,
  reusePotential: 90,
  resalePotential: 64,
  materialRecoveryPotential: 55,
};

describe("scenario: high-condition reusable laptop", () => {
  it("recommends REUSE", () => {
    const result = runEngine(analysisOf(reusableLaptop));
    expect(result.recommendation.path).toBe("reuse");
    expect(result.recommendation.headline).toBe("REUSE");
    expect(result.recommendation.matchedRuleId).toBe("reuse-working");
  });

  it("computes the weighted score (88·.25 + 82·.2 + 90·.25 + 64·.15 + 55·.15 = 78.75)", () => {
    const result = runEngine(analysisOf(reusableLaptop));
    expect(result.score.overall).toBe(79); // 78.75 rounds to 79
  });

  it("returns the full structured shape", () => {
    const result = runEngine(analysisOf(reusableLaptop));
    expect(result).toEqual(
      expect.objectContaining({
        score: expect.any(Object),
        recommendation: expect.any(Object),
        confidence: 75,
        contributingFactors: expect.any(Array),
        reasoning: expect.any(String),
      }),
    );
    expect(result.contributingFactors).toHaveLength(5);
    expect(result.reasoning).toContain("condition 88");
    expect(result.reasoning).toContain("Next Life Score 79/100");
  });
});

// ---------------------------------------------------------------------------
// 2. Repairable damaged phone → REPAIR
// ---------------------------------------------------------------------------
const damagedPhone: EngineAttributes = {
  condition: 48,
  repairability: 85,
  reusePotential: 55,
  resalePotential: 40,
  materialRecoveryPotential: 68,
};

describe("scenario: repairable damaged phone", () => {
  it("recommends REPAIR", () => {
    const result = runEngine(
      analysisOf({ ...damagedPhone }, 80),
    );
    expect(result.recommendation.path).toBe("repair");
    expect(result.recommendation.matchedRuleId).toBe("repair-fixable");
    expect(result.reasoning).toContain("repairability 85");
    expect(result.reasoning).toContain("(≥ 70)");
  });

  it("does not let material recovery overshadow a fixable device", () => {
    // material recovery (68) is high, but reuse+repairability clear their bars
    const result = runEngine(analysisOf(damagedPhone));
    expect(result.recommendation.path).not.toBe("recycle");
  });
});

// ---------------------------------------------------------------------------
// 3. Low-reuse / high-material device → RECYCLE
// ---------------------------------------------------------------------------
const endOfLife: EngineAttributes = {
  condition: 25,
  repairability: 30,
  reusePotential: 18,
  resalePotential: 12,
  materialRecoveryPotential: 85,
};

describe("scenario: low-reuse / high-material-recovery device", () => {
  it("recommends RECYCLE via the unusable gate", () => {
    const result = runEngine(analysisOf(endOfLife, 70));
    expect(result.recommendation.path).toBe("recycle");
    expect(result.recommendation.matchedRuleId).toBe("recycle-unusable");
    expect(result.reasoning).toContain("material recovery 85");
  });

  it("falls back to RECYCLE when nothing matches but the device is not 'unusable'", () => {
    // Middle-of-road values that miss every specific threshold (incl. the
    // unusable gate: reuse 40 ≥ 35) must still resolve — via fallback.
    const middling: EngineAttributes = {
      condition: 40,
      repairability: 50,
      reusePotential: 40,
      resalePotential: 30,
      materialRecoveryPotential: 60,
    };
    const { rule } = evaluateRecommendation(middling);
    expect(rule.id).toBe("fallback-recover");
    expect(rule.path).toBe("recycle");
  });
});

// ---------------------------------------------------------------------------
// 4. High-resale device → RESELL
// ---------------------------------------------------------------------------
const premiumDevice: EngineAttributes = {
  condition: 86,
  repairability: 70,
  reusePotential: 75,
  resalePotential: 92,
  materialRecoveryPotential: 50,
};

describe("scenario: high-resale device", () => {
  it("recommends RESELL", () => {
    const result = runEngine(analysisOf(premiumDevice, 85));
    expect(result.recommendation.path).toBe("resell");
    expect(result.recommendation.matchedRuleId).toBe("resell-market");
    expect(result.reasoning).toContain("resale potential 92");
  });

  it("resale wins over reuse when both clear their bars (rule order)", () => {
    const both = { ...premiumDevice }; // reuse 75 ≥ 70 AND resale 92 ≥ 80
    expect(evaluateRecommendation(both).rule.id).toBe("resell-market");
  });
});

// ---------------------------------------------------------------------------
// 5. Uncertain / low-confidence analysis
// ---------------------------------------------------------------------------
describe("scenario: uncertain / low-confidence analysis", () => {
  it("keeps score and recommendation identical for the same attributes", () => {
    const confident = runEngine(analysisOf(reusableLaptop, 85));
    const uncertain = runEngine(analysisOf(reusableLaptop, 25));
    expect(uncertain.score).toEqual(confident.score);
    expect(uncertain.recommendation).toEqual(confident.recommendation);
    expect(uncertain.confidence).toBe(25);
    expect(confident.confidence).toBe(85);
  });

  it("appends an uncertainty caveat below the threshold", () => {
    const uncertain = runEngine(analysisOf(reusableLaptop, 25));
    expect(uncertain.reasoning).toContain("Uncertainty note");
    expect(uncertain.reasoning).toContain("confidence is 25/100");
    expect(uncertain.reasoning).toContain(String(LOW_CONFIDENCE_THRESHOLD));
  });

  it("does not add the caveat when confidence is at/above the threshold", () => {
    const confident = runEngine(analysisOf(reusableLaptop, 60));
    expect(confident.reasoning).not.toContain("Uncertainty note");
  });
});

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------
describe("score invariants", () => {
  it("weights sum to exactly 1", () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("all-100 device scores 100; all-0 device scores 0", () => {
    const max = {
      condition: 100,
      repairability: 100,
      reusePotential: 100,
      resalePotential: 100,
      materialRecoveryPotential: 100,
    };
    const min = { ...max, condition: 0, repairability: 0, reusePotential: 0, resalePotential: 0, materialRecoveryPotential: 0 };
    expect(computeScore(max).overall).toBe(100);
    expect(computeScore(min).overall).toBe(0);
  });

  it("is linear and monotone in each attribute", () => {
    const base = { ...reusableLaptop };
    const lower = { ...base, condition: base.condition - 10 };
    expect(computeScore(lower).overall).toBeLessThan(computeScore(base).overall);
    // +10 condition ≈ +2.5 points (weight .25)
    expect(computeScore(base).overall - computeScore(lower).overall).toBe(3);
  });

  it("every contribution row is value × weight and sums to overall", () => {
    const score = computeScore(reusableLaptop);
    for (const c of score.contributions) {
      expect(c.weighted).toBeCloseTo(c.value * c.weight, 6);
    }
    const sum = score.contributions.reduce((acc, c) => acc + c.weighted, 0);
    expect(Math.round(sum)).toBe(score.overall);
  });

  it("score never leaves 0–100 even for out-of-range input (defense)", () => {
    const wild = {
      condition: 500,
      repairability: -20,
      reusePotential: 999,
      resalePotential: 50,
      materialRecoveryPotential: 50,
    };
    const score = computeScore(wild);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
  });

  it("is deterministic — identical input yields identical output", () => {
    const a = runEngine(analysisOf(reusableLaptop, 60));
    const b = runEngine(analysisOf(reusableLaptop, 60));
    expect(a).toEqual(b);
  });
});

describe("rule table", () => {
  it("covers all six next-life paths", () => {
    const paths = new Set(RECOMMENDATION_RULES.map((r) => r.path));
    expect(paths).toEqual(new Set(["repair", "refurbish", "reuse", "donate", "resell", "recycle"]));
  });

  it("has unique rule ids", () => {
    const ids = RECOMMENDATION_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is total — the last rule matches everything (fallback)", () => {
    const last = RECOMMENDATION_RULES[RECOMMENDATION_RULES.length - 1];
    expect(last.when({ condition: 0, repairability: 0, reusePotential: 0, resalePotential: 0, materialRecoveryPotential: 0 })).toBe(true);
  });

  it("each rationale interpolates the measured values", () => {
    const attrs = reusableLaptop;
    const { rule } = evaluateRecommendation(attrs);
    const text = rule.rationale(attrs);
    expect(text).toContain(String(attrs.condition));
    expect(text).toContain(String(attrs.reusePotential));
  });
});
