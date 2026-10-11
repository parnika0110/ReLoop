import { describe, expect, it } from "vitest";
import { classifyAssessmentEvidence } from "@/lib/evidence";
import type { DeviceAnalysis } from "@/types/analysis";

const MOCK_ANALYSIS: DeviceAnalysis = {
  deviceType: "laptop",
  brand: "Dell",
  model: "XPS 13",
  estimatedAge: 4,
  condition: 60,
  repairability: 75,
  reusePotential: 50,
  resalePotential: 40,
  materialRecoveryPotential: 80,
  observedIssues: [{ id: "scratch_1", label: "Minor chassis scratch", severity: "minor" }],
  confidence: 85,
};

describe("classifyAssessmentEvidence", () => {
  it("strictly separates observed, inferred, and unknown evidence", () => {
    const classification = classifyAssessmentEvidence(MOCK_ANALYSIS);

    // Observed contains camera-grounded items
    expect(classification.observed.some((o) => o.id === "device_type")).toBe(true);
    expect(classification.observed.some((o) => o.id === "scratch_1")).toBe(true);

    // Inferred contains algorithmic projections
    expect(classification.inferred.some((i) => i.id === "repairability" && i.score === 75)).toBe(true);

    // Unknown includes internal components & battery health
    expect(classification.unknown.some((u) => u.id === "battery_cycle")).toBe(true);
    expect(classification.unknown.some((u) => u.id === "motherboard_corrosion")).toBe(true);
  });
});
