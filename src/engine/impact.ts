/**
 * Impact estimation — pure, deterministic.
 *
 *   estimateImpact(analysis, pathway)
 *     → ImpactEstimate[]  (life extension, waste avoided, value retained)
 *
 * Every estimate is traceable to:
 *   - device category  (DEVICE_MASS / SECOND_HAND_VALUE / CATEGORY_LIFE_FACTOR)
 *   - selected pathway (PATHWAY_PROFILE / VALUE_MODEL)
 *   - assumptions used (embedded verbatim in estimate.assumptions)
 *
 * All outputs are ESTIMATES built on the transparent assumptions in
 * impact-config.ts — never measured facts. Ranges reflect the documented
 * ±spread; the UI must label values "Estimated"/"Potential".
 *
 * Deterministic: identical inputs → identical outputs (tested).
 */
import type { DeviceAnalysis } from "@/types/analysis";
import type { ImpactEstimate, NextLifePath } from "@/types/score";
import {
  CATEGORY_LIFE_FACTOR,
  CONDITION_REALIZATION_FLOOR,
  DEVICE_MASS,
  IMPACT_MODEL_VERSION,
  PATHWAY_PROFILE,
  RANGE_SPREAD,
  SECOND_HAND_VALUE,
  VALUE_MODEL,
} from "@/engine/impact-config";

/** Round kg to 2 decimals (0.01 kg precision is plenty for an estimate). */
function roundKg(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMonths(value: number): number {
  return Math.max(0, Math.round(value));
}

function spread(value: number): { low: number; high: number } {
  return {
    low: Math.max(0, Math.round(value * (1 - RANGE_SPREAD))),
    high: Math.round(value * (1 + RANGE_SPREAD)),
  };
}

/** Condition realization in [FLOOR, 1] — documented in impact-config. */
function conditionRealization(condition: number): number {
  const c = Math.max(0, Math.min(100, condition));
  return CONDITION_REALIZATION_FLOOR + (1 - CONDITION_REALIZATION_FLOOR) * (c / 100);
}

/**
 * Estimate potential useful-life extension (months) for the chosen pathway.
 *   months = base × categoryFactor × conditionRealization
 */
function lifeExtension(
  analysis: DeviceAnalysis,
  pathway: NextLifePath,
): ImpactEstimate {
  const profile = PATHWAY_PROFILE[pathway];
  const categoryFactor = CATEGORY_LIFE_FACTOR[analysis.deviceType];
  const realization = conditionRealization(analysis.condition);
  const months = roundMonths(profile.lifeBaseMonths * categoryFactor * realization);

  return {
    deviceType: analysis.deviceType,
    pathway,
    metricId: "lifeExtensionMonths",
    label: "Potential useful-life extension",
    value: months,
    unit: "months",
    basis: `Transparent assumption — ${profile.lifeBasis}`,
    assumptions: [
      `Base extension for "${pathway}": ${profile.lifeBaseMonths} months.`,
      `Device category factor (${analysis.deviceType}): ×${categoryFactor}.`,
      `Condition realization at condition ${analysis.condition}/100: ×${realization.toFixed(2)} (floor ${CONDITION_REALIZATION_FLOOR}).`,
      `${IMPACT_MODEL_VERSION} — estimate only; category-level assumption, not measured for this device.`,
    ],
    range: spread(months),
  };
}

/**
 * Estimate waste avoided (kg): mass kept out of the waste stream.
 * - Device stays in use → full assumed mass (range from mass assumption).
 * - Recycle → only the recoverable fraction avoids landfill; the rest is
 *   assumed landfilled (honest: recycling is the weakest "waste avoided" path).
 */
function wasteAvoided(
  analysis: DeviceAnalysis,
  pathway: NextLifePath,
): ImpactEstimate {
  const mass = DEVICE_MASS[analysis.deviceType];
  const profile = PATHWAY_PROFILE[pathway];

  const assumptions = [
    `Assumed mass (${analysis.deviceType}): ${mass.typicalKg} kg (typical range ${mass.lowKg}–${mass.highKg} kg). ${mass.basis}`,
  ];

  if (profile.keepsDeviceInUse) {
    const value = roundKg(mass.typicalKg);
    return {
      deviceType: analysis.deviceType,
      pathway,
      metricId: "wasteAvoidedKg",
      label: "Potential waste avoided",
      value,
      unit: "kg",
      basis:
        "Transparent assumption — the device remains in service, so its full assumed mass is diverted from the waste stream (disposal deferred, not eliminated).",
      assumptions: [
        ...assumptions,
        `Pathway "${pathway}" keeps the whole device in use → factor 1.0.`,
        `${IMPACT_MODEL_VERSION} — estimate only.`,
      ],
      range: { low: mass.lowKg, high: mass.highKg },
    };
  }

  // Recycle: recovery fraction from the analysis attribute.
  const recovery = Math.max(0, Math.min(100, analysis.materialRecoveryPotential)) / 100;
  const value = roundKg(mass.typicalKg * recovery);
  return {
    deviceType: analysis.deviceType,
    pathway,
    metricId: "wasteAvoidedKg",
    label: "Potential waste avoided",
    value,
    unit: "kg",
    basis:
      "Transparent assumption — recycling diverts only the recoverable material fraction from landfill; remaining mass is assumed landfilled.",
    assumptions: [
      ...assumptions,
      `Material recovery potential (from analysis): ${analysis.materialRecoveryPotential}/100 → factor ${recovery}.`,
      `${IMPACT_MODEL_VERSION} — estimate only.`,
    ],
    range: {
      low: roundKg(mass.lowKg * recovery),
      high: roundKg(mass.highKg * recovery),
    },
  };
}

/**
 * Estimate value retained/recovered (INR) per VALUE_MODEL:
 * - fixed (repair/refurbish): share of category second-hand value
 * - fixed + condition (reuse/donate): as-is utility, scaled by condition
 * - resale (resell): category value × resale potential
 * - material (recycle): category value × factor × material recovery potential
 */
function valueRetained(
  analysis: DeviceAnalysis,
  pathway: NextLifePath,
): ImpactEstimate {
  const inr = SECOND_HAND_VALUE[analysis.deviceType];
  const model = VALUE_MODEL[pathway];
  const assumptions: string[] = [
    `Second-hand value (${analysis.deviceType}): ₹${inr.typicalInr.toLocaleString("en-IN")}. ${inr.basis}`,
  ];

  let raw: number;
  switch (model.mode) {
    case "fixed": {
      const conditionScale = model.scaleWithCondition
        ? Math.max(0, Math.min(100, analysis.condition)) / 100
        : 1;
      if (model.scaleWithCondition) {
        assumptions.push(`Scaled by current condition ${analysis.condition}/100 → ×${conditionScale.toFixed(2)}.`);
      }
      raw = inr.typicalInr * model.factor * conditionScale;
      assumptions.push(`Pathway realization factor: ×${model.factor}. ${model.basis}`);
      break;
    }
    case "resale": {
      const resale = Math.max(0, Math.min(100, analysis.resalePotential));
      raw = inr.typicalInr * (resale / 100);
      assumptions.push(`Resale potential (from analysis): ${resale}/100 → ×${(resale / 100).toFixed(2)}. ${model.basis}`);
      break;
    }
    case "material": {
      const recovery = Math.max(0, Math.min(100, analysis.materialRecoveryPotential)) / 100;
      raw = inr.typicalInr * model.factor * recovery;
      assumptions.push(
        `Material recovery potential (from analysis): ${Math.round(recovery * 100)}/100; material share of product value: ×${model.factor}. ${model.basis}`,
      );
      break;
    }
  }

  const value = Math.max(0, Math.round(raw));
  return {
    deviceType: analysis.deviceType,
    pathway,
    metricId: "valueRetainedInr",
    label: "Estimated value retained",
    value,
    unit: "INR",
    basis:
      "Transparent assumption — a model-derived estimate based on typical Indian secondary markets, not a valuation, appraisal, or guaranteed price.",
    assumptions: [
      ...assumptions,
      `${IMPACT_MODEL_VERSION} — estimate only.`,
    ],
    range: spread(value),
  };
}

/**
 * Produce the three headline estimates for a device + chosen pathway.
 * Order is stable: life extension → waste avoided → value retained.
 */
export function estimateImpact(
  analysis: DeviceAnalysis,
  pathway: NextLifePath,
): ImpactEstimate[] {
  return [
    lifeExtension(analysis, pathway),
    wasteAvoided(analysis, pathway),
    valueRetained(analysis, pathway),
  ];
}

/**
 * Safely resolves impact estimates for display:
 * 1. If estimates already exist and have INR valueRetainedInr, returns them unmodified.
 * 2. If estimates exist but valueRetained is in legacy USD (e.g. historical scans):
 *    - Preserves non-currency metrics (lifeExtensionMonths, wasteAvoidedKg) as-is.
 *    - If device analysis is available, derives a transparent INR estimate using the
 *      deterministic engine and explicitly notes the re-derivation in its assumptions and basis,
 *      without relabeling or currency exchange guessing.
 *    - If analysis is not available or incomplete, leaves valueRetained as unavailable for INR
 *      rather than inventing an arbitrary number.
 * 3. If no estimates exist at all, falls back to estimateImpact if analysis is available.
 */
export function resolveImpactEstimates(
  estimates: ImpactEstimate[] | undefined | null,
  analysis: DeviceAnalysis | undefined | null,
  pathway: NextLifePath,
): ImpactEstimate[] {
  // If already full INR, keep existing record byte-for-byte
  if (estimates && estimates.some((e) => e.metricId === "valueRetainedInr" || e.unit === "INR")) {
    return estimates;
  }

  // If estimates have legacy USD
  if (estimates && estimates.length > 0) {
    if (analysis && analysis.deviceType) {
      const derivedInr = valueRetained(analysis, pathway);
      return estimates.map((e) => {
        if (e.metricId === "valueRetainedUsd" || e.unit === "USD" || e.unit === "$") {
          return {
            ...derivedInr,
            basis: `${derivedInr.basis} (Derived for Indian market from original visual assessment; original archive was USD ${e.value}).`,
            assumptions: [
              ...derivedInr.assumptions,
              `Historical record archived with legacy USD value ($${e.value}); recalculated in INR via deterministic engine.`,
            ],
          };
        }
        return e;
      });
    }

    // Analysis is missing/incomplete: keep non-currency metrics, but do NOT invent an INR value.
    return estimates.filter((e) => e.metricId !== "valueRetainedUsd" && e.unit !== "USD" && e.unit !== "$");
  }

  // No estimates present at all
  if (analysis && analysis.deviceType) {
    return estimateImpact(analysis, pathway);
  }

  return [];
}

export { IMPACT_MODEL_VERSION } from "@/engine/impact-config";
