/**
 * Impact estimation — explicit assumptions/configuration layer.
 *
 * HONESTY CONTRACT:
 * Every number below is an ASSUMPTION, not a measurement. None of these
 * values were derived from this specific device; they are documented,
 * plausible category-level defaults so the UI can label results
 * "Estimated"/"Potential" and trace each figure to its source. Tune these
 * here — assumptions live in config, never inline in estimation logic.
 *
 * Traceability model: each ImpactEstimate records
 *   device category (DEVICE_MASS / SECOND_HAND_VALUE / CATEGORY_LIFE_FACTOR)
 * × next-life pathway (PATHWAY_PROFILE / VALUE_MODEL)
 * × the assumptions actually applied (embedded in estimate.assumptions).
 */
import type { DeviceType } from "@/types/analysis";
import type { NextLifePath } from "@/types/score";

export const IMPACT_MODEL_VERSION = "reloop-impact-1.0.0";

/** Category-level device mass (kg). Typical unit masses from published specs. */
export interface MassAssumption {
  typicalKg: number;
  lowKg: number;
  highKg: number;
  basis: string;
}

export const DEVICE_MASS: Record<DeviceType, MassAssumption> = {
  laptop: {
    typicalKg: 1.4,
    lowKg: 0.9,
    highKg: 2.0,
    basis: "Typical 14–15\" laptop mass from published manufacturer specs; not weighed.",
  },
  smartphone: {
    typicalKg: 0.19,
    lowKg: 0.12,
    highKg: 0.26,
    basis: "Typical modern smartphone mass from published manufacturer specs; not weighed.",
  },
  tablet: {
    typicalKg: 0.47,
    lowKg: 0.3,
    highKg: 0.7,
    basis: "Typical 10\" tablet mass from published manufacturer specs; not weighed.",
  },
};

/** Category-level second-hand value of a WORKING device (USD). */
export interface ValueAssumption {
  typicalUsd: number;
  basis: string;
}

export const SECOND_HAND_VALUE: Record<DeviceType, ValueAssumption> = {
  laptop: {
    typicalUsd: 350,
    basis: "Assumed typical second-hand value of a working laptop; not a valuation.",
  },
  smartphone: {
    typicalUsd: 250,
    basis: "Assumed typical second-hand value of a working smartphone; not a valuation.",
  },
  tablet: {
    typicalUsd: 200,
    basis: "Assumed typical second-hand value of a working tablet; not a valuation.",
  },
};

/**
 * Life-extension base per pathway (months) before category and condition
 * scaling: months = base × categoryFactor × conditionRealization.
 */
export interface PathwayProfile {
  lifeBaseMonths: number;
  lifeBasis: string;
  /** True when choosing this path keeps the whole device out of the waste stream. */
  keepsDeviceInUse: boolean;
}

export const PATHWAY_PROFILE: Record<NextLifePath, PathwayProfile> = {
  repair: {
    lifeBaseMonths: 36,
    lifeBasis: "A successful repair is assumed to restore ~3 years of usable life.",
    keepsDeviceInUse: true,
  },
  refurbish: {
    lifeBaseMonths: 30,
    lifeBasis: "Professional refurbishment is assumed to restore ~2.5 years of usable life.",
    keepsDeviceInUse: true,
  },
  reuse: {
    lifeBaseMonths: 24,
    lifeBasis: "Direct reuse is assumed to add ~2 years with the next user.",
    keepsDeviceInUse: true,
  },
  donate: {
    lifeBaseMonths: 24,
    lifeBasis:
      "Donation has the same device physics as reuse (~2 years); channel-specific longer use is not modeled.",
    keepsDeviceInUse: true,
  },
  resell: {
    lifeBaseMonths: 24,
    lifeBasis: "Resale puts the device with a new owner (~2 years assumed); owner behavior not modeled.",
    keepsDeviceInUse: true,
  },
  recycle: {
    lifeBaseMonths: 0,
    lifeBasis: "Recycling ends this device's useful life — no life extension is claimed.",
    keepsDeviceInUse: false,
  },
};

/** Device-category multiplier on life extension (laptops serve longer than phones). */
export const CATEGORY_LIFE_FACTOR: Record<DeviceType, number> = {
  laptop: 1.2,
  smartphone: 0.8,
  tablet: 1.0,
};

/**
 * Condition realization: extension = base × (FLOOR + (1 − FLOOR) × condition/100).
 * A device at condition 100 realizes the full base; condition 0 realizes FLOOR.
 */
export const CONDITION_REALIZATION_FLOOR = 0.6;

/** How value retained/recovered is computed per pathway. */
export interface ValueModel {
  mode: "fixed" | "resale" | "material";
  /** fixed: share of second-hand value. material: share of product value. */
  factor: number;
  /** fixed mode only: scale by current condition (as-is utility, no work done). */
  scaleWithCondition: boolean;
  basis: string;
}

export const VALUE_MODEL: Record<NextLifePath, ValueModel> = {
  repair: {
    mode: "fixed",
    factor: 0.7,
    scaleWithCondition: false,
    basis: "A repaired device is assumed to realize ~70% of category second-hand value (post-repair).",
  },
  refurbish: {
    mode: "fixed",
    factor: 0.85,
    scaleWithCondition: false,
    basis: "A refurbished device is assumed to realize ~85% of category second-hand value (post-restoration).",
  },
  reuse: {
    mode: "fixed",
    factor: 0.6,
    scaleWithCondition: true,
    basis: "As-is utility to the next user ≈ 60% of category second-hand value, scaled by current condition.",
  },
  donate: {
    mode: "fixed",
    factor: 0.5,
    scaleWithCondition: true,
    basis: "As-is utility to the recipient ≈ 50% of category second-hand value, scaled by current condition; no market transaction occurs.",
  },
  resell: {
    mode: "resale",
    factor: 1,
    scaleWithCondition: false,
    basis: "Market-attainable value scales with the analysis's resale potential (0–100).",
  },
  recycle: {
    mode: "material",
    factor: 0.12,
    scaleWithCondition: false,
    basis: "Raw materials are assumed to be worth ~12% of second-hand product value, scaled by the analysis's material recovery potential.",
  },
};

/** Assumed relative spread for estimate ranges (±30%) — markets and units vary. */
export const RANGE_SPREAD = 0.3;
