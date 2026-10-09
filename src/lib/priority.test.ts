/**
 * Tests for the "What matters to you?" presentation preference.
 *
 * The hard boundary: a priority only reorders/highlights the six futures.
 * These tests pin that the ranking is built from EXISTING data (the impact
 * estimator's own values, or definitional effort tiers) and always returns
 * a permutation/subset of the six known paths — never a new decision.
 */
import { describe, expect, it } from "vitest";
import { FIXTURES } from "@/analysis/fixtures";
import { parseModelPayload } from "@/analysis/schema";
import { runEngine } from "@/engine";
import { estimateImpact } from "@/engine/impact";
import {
  EFFORT_NOTES,
  PRIORITY_OPTIONS,
  priorityMatches,
  rankPriorities,
} from "@/lib/priority";
import type { DeviceAnalysis } from "@/types/analysis";
import { NEXT_LIFE_PATHS } from "@/types/score";

function analysisOf(fixture: "laptop" | "smartphone" | "tablet"): DeviceAnalysis {
  const parsed = parseModelPayload(FIXTURES[fixture].payload);
  if (!parsed.ok) throw new Error(`fixture rejected: ${parsed.message}`);
  return parsed.analysis;
}

const DEVICES = {
  laptop: analysisOf("laptop"),
  phone: analysisOf("smartphone"),
  tablet: analysisOf("tablet"),
};

describe("rankPriorities", () => {
  it("returns a permutation of the six known pathways for every priority", () => {
    for (const priority of ["value", "impact", "effort"] as const) {
      for (const analysis of Object.values(DEVICES)) {
        const ranked = rankPriorities(priority, analysis);
        expect(ranked).toHaveLength(NEXT_LIFE_PATHS.length);
        expect([...ranked].sort()).toEqual([...NEXT_LIFE_PATHS].sort());
      }
    }
  });

  it("value ranks by the estimator's own value-retained numbers", () => {
    const analysis = DEVICES.laptop;
    const ranked = rankPriorities("value", analysis);
    const values = ranked.map(
      (path) =>
        estimateImpact(analysis, path).find((e) => e.metricId === "valueRetainedUsd")
          ?.value ?? -1,
    );
    // Monotonically non-increasing — the ranking IS the existing estimate.
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
    expect(ranked[0]).toBe("refurbish"); // 0.85 × $350 beats the rest here
    expect(ranked.at(-1)).toBe("recycle"); // material share is the smallest
  });

  it("impact ranks by the estimator's own life-extension numbers", () => {
    const analysis = DEVICES.tablet;
    const ranked = rankPriorities("impact", analysis);
    const months = ranked.map(
      (path) =>
        estimateImpact(analysis, path).find(
          (e) => e.metricId === "lifeExtensionMonths",
        )?.value ?? -1,
    );
    for (let i = 1; i < months.length; i++) {
      expect(months[i]).toBeLessThanOrEqual(months[i - 1]);
    }
    expect(ranked.at(-1)).toBe("recycle"); // 0 months by definition
  });

  it("effort orders by what the path asks, no measurements involved", () => {
    expect(rankPriorities("effort", DEVICES.phone)).toEqual([
      "reuse",
      "donate",
      "resell",
      "recycle",
      "repair",
      "refurbish",
    ]);
  });
});

describe("priorityMatches", () => {
  it("highlights only subsets of the six paths", () => {
    for (const priority of ["value", "impact", "effort"] as const) {
      for (const analysis of Object.values(DEVICES)) {
        const matches = priorityMatches(priority, analysis);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches.length).toBeLessThanOrEqual(3);
        for (const path of matches) {
          expect(NEXT_LIFE_PATHS).toContain(path);
        }
      }
    }
  });

  it("effort highlights the as-is paths only", () => {
    expect(priorityMatches("effort", DEVICES.laptop)).toEqual(["reuse", "donate"]);
  });
});

describe("priority never touches the engine", () => {
  it("the recommendation is identical regardless of any priority", () => {
    const analysis = DEVICES.tablet;
    const before = runEngine(analysis);
    rankPriorities("value", analysis);
    priorityMatches("impact", analysis);
    rankPriorities("effort", analysis);
    const after = runEngine(analysis);
    expect(after.recommendation).toEqual(before.recommendation);
    expect(after.score).toEqual(before.score);
  });
});

describe("copy contracts", () => {
  it("every option label/hint and effort note exists for all six paths", () => {
    expect(PRIORITY_OPTIONS.map((o) => o.id)).toEqual([
      "value",
      "impact",
      "effort",
    ]);
    for (const option of PRIORITY_OPTIONS) {
      expect(option.hint.length).toBeGreaterThan(0);
    }
    for (const path of NEXT_LIFE_PATHS) {
      expect(EFFORT_NOTES[path].length).toBeGreaterThan(0);
    }
  });
});
