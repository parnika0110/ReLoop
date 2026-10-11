import { describe, expect, it } from "vitest";
import { generateDecisionReceiptText, generateDecisionReceiptHtml } from "./decision-receipt";
import type { DeviceAnalysis } from "@/types/analysis";
import type { Recommendation, ReLoopScore } from "@/types/score";

describe("generateDecisionReceiptText", () => {
  const mockAnalysis: DeviceAnalysis = {
    brand: "ThinkPad",
    deviceType: "laptop",
    model: "T480",
    estimatedAge: 5,
    confidence: 88,
    observedIssues: [
      { id: "crack", label: "Broken display panel", severity: "critical" },
    ],
    condition: 30,
    repairability: 55,
    reusePotential: 40,
    resalePotential: 45,
    materialRecoveryPotential: 30,
  };

  const mockScore: ReLoopScore = {
    overall: 40,
    engineVersion: "1.0.0",
    contributions: [
      { key: "condition", label: "Physical Condition", value: 30, weight: 0.25, weighted: 7.5 },
      { key: "repairability", label: "Repairability", value: 55, weight: 0.25, weighted: 13.75 },
    ],
  };

  const mockRecommendation: Recommendation = {
    path: "repair",
    headline: "Repair display",
    rationale: "Fixing the screen restores full working life.",
    matchedRuleId: "SCREEN_REPLACE_BENEFIT",
  };

  it("generates a formatted decision receipt text with exact device identity and score", () => {
    const text = generateDecisionReceiptText({
      scanId: "scan_test_12345678",
      createdAt: "2026-10-10T12:00:00Z",
      analysis: mockAnalysis,
      score: mockScore,
      recommendation: mockRecommendation,
      chosenPathway: "repair",
      completedActions: ["find_screen_vendor", "backup_data"],
    });

    expect(text).toContain("RELOOP DECISION RECEIPT");
    expect(text).toContain("REC-SCAN_TES");
    expect(text).toContain("ThinkPad T480");
    expect(text).toContain("Next Life Score:       40/100");
    expect(text).toContain("Recommended Pathway:   Repair display (REPAIR)");
    expect(text).toContain("[CRITICAL] Broken display panel");
    expect(text).toContain("[X] find screen vendor");
    expect(text).toContain("Indian E-Waste");
    expect(text).toContain("Management Rules (2022)");
  });

  it("handles empty completed actions and unknown estimated age gracefully", () => {
    const noAgeAnalysis: DeviceAnalysis = {
      ...mockAnalysis,
      estimatedAge: null,
      observedIssues: [],
    };

    const text = generateDecisionReceiptText({
      scanId: "scan_test_87654321",
      createdAt: "2026-10-10T12:00:00Z",
      analysis: noAgeAnalysis,
      score: mockScore,
      recommendation: mockRecommendation,
    });

    expect(text).toContain("Estimated Age:   Unknown");
    expect(text).toContain("No major physical defects identified");
    expect(text).toContain("Completed Actions:     0 recorded");
  });

  it("generates a clean printable HTML document for PDF export", () => {
    const html = generateDecisionReceiptHtml({
      scanId: "scan_test_12345678",
      createdAt: "2026-10-10T12:00:00Z",
      analysis: mockAnalysis,
      score: mockScore,
      recommendation: mockRecommendation,
      chosenPathway: "repair",
      completedActions: ["find_screen_vendor"],
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("REC-SCAN_TES");
    expect(html).toContain("ThinkPad T480");
    expect(html).toContain("Next Life Score");
    expect(html).toContain("@page {");
    expect(html).toContain("Broken display panel");
    expect(html).toContain("find screen vendor");
    expect(html).toContain("Indian E-Waste Management Rules (2022)");
  });
});
