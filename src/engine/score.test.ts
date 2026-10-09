/**
 * Regression: the exact attributes a real Nova scan reported on the result
 * page where the explanation read "Next Life Score 40/100" while the ring and
 * the hero number rendered 0/100.
 *
 *   20×.25 + 60×.20 + 30×.25 + 15×.15 + 85×.15 = 39.5 → 40
 *
 * The formula and weights are not in dispute — this pins their output so any
 * future change to them is a deliberate, visible one. The 0 in the UI came
 * from the ring's own mount animation, never from here (see
 * score-ring.test.ts).
 */
import { describe, expect, it } from "vitest";
import { runEngine } from "@/engine";
import { SCORE_WEIGHTS } from "@/engine/config";
import { computeScore } from "@/engine/score";
import type { DeviceAnalysis } from "@/types/analysis";

const REPORTED: DeviceAnalysis = {
  deviceType: "laptop",
  brand: null,
  model: null,
  estimatedAge: 4,
  condition: 20,
  repairability: 60,
  reusePotential: 30,
  resalePotential: 15,
  materialRecoveryPotential: 85,
  observedIssues: [],
  confidence: 70,
};

describe("computeScore — reported scan (attributes → 40)", () => {
  it("computes 40 from the reported attributes", () => {
    expect(computeScore(REPORTED).overall).toBe(40);
  });

  it("weights sum to 1 and are unchanged", () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(SCORE_WEIGHTS).toEqual({
      condition: 0.25,
      repairability: 0.2,
      reusePotential: 0.25,
      resalePotential: 0.15,
      materialRecoveryPotential: 0.15,
    });
  });

  it("carries the raw attribute values and rounds only the total", () => {
    const score = computeScore(REPORTED);
    expect(score.contributions.map((c) => [c.key, c.value])).toEqual([
      ["condition", 20],
      ["repairability", 60],
      ["reusePotential", 30],
      ["resalePotential", 15],
      ["materialRecoveryPotential", 85],
    ]);
    // 39.5 unrounded, 40 as displayed — the rounding step, not a formula change
    const weightedSum = score.contributions.reduce((sum, c) => sum + c.weighted, 0);
    expect(weightedSum).toBeCloseTo(39.5, 2);
    expect(score.overall).toBe(Math.round(weightedSum));
  });

  it("runEngine reports the same 40 to the API layer", () => {
    const engine = runEngine(REPORTED);
    expect(engine.score.overall).toBe(40);
    expect(engine.reasoning).toContain("40");
    expect(engine.engineVersion).toBe(engine.score.engineVersion);
  });

  it("is unaffected by brand — normalization cannot change the score", () => {
    const withPlaceholderBrand = { ...REPORTED, brand: "0" };
    const withRealBrand = { ...REPORTED, brand: "Lenovo" };
    expect(runEngine(withPlaceholderBrand).score.overall).toBe(40);
    expect(runEngine(withRealBrand).score.overall).toBe(40);
    expect(computeScore(withPlaceholderBrand)).toEqual(computeScore(REPORTED));
  });
});
