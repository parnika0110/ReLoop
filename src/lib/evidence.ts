/**
 * Evidence Breakdown taxonomy:
 * Classifies model & visual assessment into:
 *  - Observed (exterior wear, cracks, device category)
 *  - Inferred (potential repairability, reuse, resale, recovery)
 *  - Unknown (requires physical inspection: battery health, motherboard, liquid damage)
 */
import type { DeviceAnalysis } from "@/types/analysis";

export interface EvidenceClassification {
  observed: Array<{ id: string; label: string; detail: string; confidence?: number }>;
  inferred: Array<{ id: string; label: string; score: number; rationale: string }>;
  unknown: Array<{ id: string; label: string; why: string }>;
}

export function classifyAssessmentEvidence(analysis: DeviceAnalysis): EvidenceClassification {
  // 1. Observed facts directly grounded in image analysis
  const observed: EvidenceClassification["observed"] = [
    {
      id: "device_type",
      label: "Device category",
      detail: `Identified as a ${analysis.deviceType}${analysis.brand ? ` (${analysis.brand})` : ""}`,
      confidence: analysis.confidence,
    },
    {
      id: "exterior_condition",
      label: "Visual condition score",
      detail: `Assessed exterior condition rating of ${analysis.condition}/100`,
    },
  ];

  if (analysis.estimatedAge !== null) {
    observed.push({
      id: "estimated_age",
      label: "Estimated age",
      detail: `Approximately ${analysis.estimatedAge} years based on chassis and generation visual cues`,
    });
  }

  for (const issue of analysis.observedIssues) {
    observed.push({
      id: issue.id,
      label: `Observed defect: ${issue.label}`,
      detail: `Severity: ${issue.severity}`,
    });
  }

  // 2. Inferred ratings (algorithmic and model interpretations)
  const inferred: EvidenceClassification["inferred"] = [
    {
      id: "repairability",
      label: "Repairability Potential",
      score: analysis.repairability,
      rationale: "Inferred from visible modularity, chassis construction, and common failure points for this category.",
    },
    {
      id: "reuse",
      label: "Reuse Suitability",
      score: analysis.reusePotential,
      rationale: "Inferred readiness for transfer to another user without major hardware reconstruction.",
    },
    {
      id: "resale",
      label: "Secondary Market Value",
      score: analysis.resalePotential,
      rationale: "Inferred marketability in the secondary circular electronics stream.",
    },
    {
      id: "recovery",
      label: "Material Recovery Potential",
      score: analysis.materialRecoveryPotential,
      rationale: "Inferred recoverable raw material volume (copper, aluminium, gold, polymers) if recycled.",
    },
  ];

  // 3. Unknowns (things a photo structurally cannot confirm)
  const unknown: EvidenceClassification["unknown"] = [
    {
      id: "battery_cycle",
      label: "Battery Health & Degradation",
      why: "Capacity, chemical swelling, and cycle count are internal and cannot be verified from a casing photo.",
    },
    {
      id: "motherboard_corrosion",
      label: "Motherboard & Internal Component Health",
      why: "Hidden logic board damage, liquid ingress, and solder joint degradation require teardown inspection.",
    },
    {
      id: "exact_repair_bill",
      label: "Exact Component & Labor Cost",
      why: "Actual repair quotes depend on authorized/independent technician labor rates and genuine spare availability.",
    },
    {
      id: "real_market_demand",
      label: "Current Hyperlocal Buyer Demand",
      why: "Secondary pricing fluctuates with regional supply and specific storage/RAM configurations.",
    },
  ];

  return { observed, inferred, unknown };
}
