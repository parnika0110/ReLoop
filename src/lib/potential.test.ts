/**
 * Tests for the "What can still be saved?" presentation logic.
 *
 * Two properties matter most and are pinned here:
 *  1. every opportunity quotes a real measured/observed value (no invention);
 *  2. hidden components are never claimed — they appear only under
 *     REQUIRES_INSPECTION, which must always be renderable.
 */
import { describe, expect, it } from "vitest";
import { FIXTURES } from "@/analysis/fixtures";
import { parseModelPayload } from "@/analysis/schema";
import { runEngine } from "@/engine";
import {
  REQUIRES_INSPECTION,
  dnaInsight,
  recoveryOpportunities,
  safetyNotes,
} from "@/lib/potential";
import type { DeviceAnalysis } from "@/types/analysis";

function analysisOf(fixture: "laptop" | "smartphone" | "tablet"): DeviceAnalysis {
  const parsed = parseModelPayload(FIXTURES[fixture].payload);
  if (!parsed.ok) throw new Error(`fixture rejected: ${parsed.message}`);
  return parsed.analysis;
}

const LAPTOP = analysisOf("laptop");
const PHONE = analysisOf("smartphone");
const TABLET = analysisOf("tablet");

describe("recoveryOpportunities", () => {
  it("only surfaces opportunities whose evidence quotes real values", () => {
    for (const analysis of [LAPTOP, PHONE, TABLET]) {
      const opportunities = recoveryOpportunities(analysis);
      expect(opportunities.length).toBeGreaterThan(0);
      for (const opportunity of opportunities) {
        // Evidence must name the actual observed label or a measured value.
        const quotesReality =
          opportunity.evidence.includes("Observed in your photo") ||
          opportunity.evidence.includes("Measured from your photo");
        expect(quotesReality).toBe(true);
        // At least one measured attribute value appears verbatim.
        const values = [
          analysis.condition,
          analysis.repairability,
          analysis.reusePotential,
          analysis.resalePotential,
          analysis.materialRecoveryPotential,
        ];
        expect(
          values.some((v) => opportunity.detail.includes(`${v}/100`)),
        ).toBe(true);
        // Never claims hidden components.
        expect(opportunity.detail).not.toMatch(/RAM|SSD|motherboard|mother board/i);
        expect(opportunity.paths.length).toBeGreaterThan(0);
      }
    }
  });

  it("offers display repair when a screen issue was observed", () => {
    const phone = recoveryOpportunities(PHONE);
    const screen = phone.find((o) => o.id === "display_repair");
    expect(screen).toBeDefined();
    expect(screen?.evidence).toContain("Cracked front glass");
    expect(screen?.paths).toEqual(["repair", "refurbish"]);
  });

  it("keeps material recovery as the floor when nothing else qualifies", () => {
    // The cracked phone clears no other gate — materials must still be there.
    const ids = recoveryOpportunities(PHONE).map((o) => o.id);
    expect(ids).toEqual(["display_repair", "materials"]);
  });

  it("offers reuse/value cards for a healthy device", () => {
    const ids = recoveryOpportunities(TABLET).map((o) => o.id);
    expect(ids).toContain("intact_exterior");
    expect(ids).toContain("reuse_life");
    expect(ids).toContain("market_value");
    expect(ids).toContain("materials");
    expect(ids).not.toContain("display_repair");
  });

  it("gates cards on the documented thresholds", () => {
    // reuse potential 49 → below the 50 gate → no reuse card.
    const below: DeviceAnalysis = { ...TABLET, reusePotential: 49 };
    expect(recoveryOpportunities(below).map((o) => o.id)).not.toContain(
      "reuse_life",
    );
    // material recovery 39 → below the 40 gate → no materials card.
    const noMaterials: DeviceAnalysis = { ...TABLET, materialRecoveryPotential: 39 };
    expect(recoveryOpportunities(noMaterials).map((o) => o.id)).not.toContain(
      "materials",
    );
  });

  it("is deterministic", () => {
    expect(recoveryOpportunities(LAPTOP)).toEqual(recoveryOpportunities(LAPTOP));
  });
});

describe("safetyNotes", () => {
  it("quotes the observed battery issue verbatim", () => {
    const notes = safetyNotes(LAPTOP);
    expect(notes).toHaveLength(1);
    expect(notes[0].observed).toContain("Bottom case slightly lifted near trackpad");
    expect(notes[0].observed).toContain("moderate");
  });

  it("stays silent when no caution-worthy issue was observed", () => {
    expect(safetyNotes(TABLET)).toEqual([]);
    expect(safetyNotes(PHONE)).toEqual([]);
  });
});

describe("REQUIRES_INSPECTION", () => {
  it("covers the components a photo structurally cannot show", () => {
    const ids = REQUIRES_INSPECTION.map((i) => i.id);
    expect(ids).toContain("battery_health");
    expect(ids).toContain("internal_components");
    expect(ids).toContain("board_faults");
    for (const entry of REQUIRES_INSPECTION) {
      expect(entry.why.length).toBeGreaterThan(0);
    }
  });
});

describe("dnaInsight", () => {
  it("claims potential only when the engine chose a working-life path", () => {
    const engine = runEngine(LAPTOP); // fixture → refurbish-restorable
    const insight = dnaInsight(engine.score, engine.recommendation);
    expect(insight).not.toBeNull();
    expect(insight?.statement).toBe(
      "Your device still has meaningful potential for another life.",
    );
    // Support names a real measured value and the real score.
    expect(insight?.detail).toContain(String(engine.score.overall));
  });

  it("switches to a materials statement when the engine says recycle", () => {
    const worn: DeviceAnalysis = {
      ...TABLET,
      condition: 20,
      repairability: 30,
      reusePotential: 20,
      resalePotential: 10,
      materialRecoveryPotential: 85,
    };
    const engine = runEngine(worn);
    expect(engine.recommendation.path).toBe("recycle");
    const insight = dnaInsight(engine.score, engine.recommendation);
    expect(insight?.statement).toBe(
      "No working life left — but its materials still count.",
    );
    expect(insight?.detail).toContain("Material recovery");
    expect(insight?.detail).toContain("85/100");
  });
});
