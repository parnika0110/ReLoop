/**
 * Impact estimation tests — all 3 device types × all 6 pathways (18 combos),
 * plus invariants: traceability fields, honest labels, ranges, determinism,
 * and the documented relationship between pathways.
 */
import { describe, expect, it } from "vitest";
import { estimateImpact } from "@/engine/impact";
import {
  DEVICE_MASS,
  SECOND_HAND_VALUE,
  PATHWAY_PROFILE,
  VALUE_MODEL,
} from "@/engine/impact-config";
import { NEXT_LIFE_PATHS, type ImpactEstimate } from "@/types/score";
import type { DeviceAnalysis, DeviceType } from "@/types/analysis";

const DEVICE_TYPES: DeviceType[] = ["laptop", "smartphone", "tablet"];

function analysisOf(deviceType: DeviceType, overrides: Partial<DeviceAnalysis> = {}): DeviceAnalysis {
  return {
    deviceType,
    brand: "TestBrand",
    model: null,
    estimatedAge: 3,
    condition: 70,
    repairability: 65,
    reusePotential: 70,
    resalePotential: 60,
    materialRecoveryPotential: 65,
    observedIssues: [],
    confidence: 75,
    ...overrides,
  };
}

function assertWellFormed(e: ImpactEstimate, device: DeviceType, pathway: string) {
  // Traceability
  expect(e.deviceType).toBe(device);
  expect(e.pathway).toBe(pathway);
  // Honest labelling
  expect(e.label).toMatch(/^(Potential|Estimated)/);
  expect(e.basis.length).toBeGreaterThan(20);
  expect(e.assumptions.length).toBeGreaterThanOrEqual(2);
  expect(e.assumptions.join(" ")).toContain("estimate");
  // Value sanity
  expect(Number.isFinite(e.value)).toBe(true);
  expect(e.value).toBeGreaterThanOrEqual(0);
  if (e.range) {
    expect(e.range.low).toBeLessThanOrEqual(e.value);
    expect(e.range.high).toBeGreaterThanOrEqual(e.value);
  }
}

describe("estimateImpact — every device type × every pathway", () => {
  for (const device of DEVICE_TYPES) {
    for (const pathway of NEXT_LIFE_PATHS) {
      it(`${device} → ${pathway} yields 3 traceable estimates`, () => {
        const estimates = estimateImpact(analysisOf(device), pathway);
        expect(estimates).toHaveLength(3);
        expect(estimates.map((e) => e.metricId)).toEqual([
          "lifeExtensionMonths",
          "wasteAvoidedKg",
          "valueRetainedUsd",
        ]);
        for (const e of estimates) assertWellFormed(e, device, pathway);
      });
    }
  }
});

describe("life extension", () => {
  it("recycle claims zero life extension for every device", () => {
    for (const device of DEVICE_TYPES) {
      const [life] = estimateImpact(analysisOf(device), "recycle");
      expect(life.value).toBe(0);
      expect(life.basis).toContain("no life extension is claimed");
    }
  });

  it("scales with the device category factor (laptop > tablet > smartphone)", () => {
    const laptop = estimateImpact(analysisOf("laptop"), "reuse")[0];
    const tablet = estimateImpact(analysisOf("tablet"), "reuse")[0];
    const phone = estimateImpact(analysisOf("smartphone"), "reuse")[0];
    // base 24 × factor (1.2 / 1.0 / 0.8) × realization(cond 70 = 0.88) = 25.3 / 21.1 / 16.9
    expect(laptop.value).toBeGreaterThan(tablet.value);
    expect(tablet.value).toBeGreaterThan(phone.value);
    expect(laptop.value).toBe(25);
    expect(tablet.value).toBe(21);
    expect(phone.value).toBe(17);
  });

  it("repair extends life more than reuse for the same device", () => {
    const a = analysisOf("laptop");
    const repair = estimateImpact(a, "repair")[0];
    const reuse = estimateImpact(a, "reuse")[0];
    expect(repair.value).toBeGreaterThan(reuse.value);
    // 36 × 1.2 × 0.88 = 38.0 → 38
    expect(repair.value).toBe(38);
  });

  it("is non-decreasing in condition", () => {
    const low = estimateImpact(analysisOf("laptop", { condition: 30 }), "repair")[0];
    const high = estimateImpact(analysisOf("laptop", { condition: 90 }), "repair")[0];
    expect(high.value).toBeGreaterThan(low.value);
  });
});

describe("waste avoided", () => {
  it("keeps-in-use pathways divert the full assumed mass", () => {
    for (const device of DEVICE_TYPES) {
      for (const pathway of NEXT_LIFE_PATHS.filter((p) => p !== "recycle")) {
        const [, waste] = estimateImpact(analysisOf(device), pathway);
        expect(waste.value).toBe(DEVICE_MASS[device].typicalKg);
        expect(waste.range).toEqual({
          low: DEVICE_MASS[device].lowKg,
          high: DEVICE_MASS[device].highKg,
        });
      }
    }
  });

  it("recycle avoids only the recoverable fraction", () => {
    const [, waste] = estimateImpact(
      analysisOf("laptop", { materialRecoveryPotential: 80 }),
      "recycle",
    );
    expect(waste.value).toBe(1.12); // 1.4 × 0.80
    expect(waste.basis).toContain("recoverable material fraction");
  });

  it("recycle waste avoided grows with material recovery potential", () => {
    const low = estimateImpact(analysisOf("laptop", { materialRecoveryPotential: 40 }), "recycle")[1];
    const high = estimateImpact(analysisOf("laptop", { materialRecoveryPotential: 90 }), "recycle")[1];
    expect(high.value).toBeGreaterThan(low.value);
  });

  it("recycle never claims more waste avoided than keep-in-use", () => {
    const inUse = estimateImpact(analysisOf("laptop"), "reuse")[1];
    const recycled = estimateImpact(analysisOf("laptop"), "recycle")[1];
    expect(recycled.value).toBeLessThanOrEqual(inUse.value);
  });
});

describe("value retained", () => {
  it("resell tracks the analysis's resale potential", () => {
    const low = estimateImpact(analysisOf("laptop", { resalePotential: 40 }), "resell")[2];
    const high = estimateImpact(analysisOf("laptop", { resalePotential: 90 }), "resell")[2];
    expect(low.value).toBe(140); // 350 × 0.40
    expect(high.value).toBe(315); // 350 × 0.90
    expect(high.value).toBeGreaterThan(low.value);
  });

  it("recycle value tracks material recovery potential", () => {
    const [ , , value] = estimateImpact(
      analysisOf("smartphone", { materialRecoveryPotential: 50 }),
      "recycle",
    );
    expect(value.value).toBe(15); // 250 × 0.12 × 0.50
    expect(value.assumptions.join(" ")).toContain("material recovery");
  });

  it("reuse/donate scale with condition; repair does not", () => {
    const worn = analysisOf("tablet", { condition: 40 });
    const pristine = analysisOf("tablet", { condition: 90 });
    const wornReuse = estimateImpact(worn, "reuse")[2];
    const pristineReuse = estimateImpact(pristine, "reuse")[2];
    expect(pristineReuse.value).toBeGreaterThan(wornReuse.value);
    // repair is post-repair value — condition-independent by design
    expect(estimateImpact(worn, "repair")[2].value).toBe(
      estimateImpact(pristine, "repair")[2].value,
    );
    expect(estimateImpact(pristine, "repair")[2].value).toBe(140); // 200 × 0.70
  });

  it("recycle realizes the least value of all pathways (fixed factors)", () => {
    const a = analysisOf("laptop", { resalePotential: 90, materialRecoveryPotential: 90 });
    const values = NEXT_LIFE_PATHS.map(
      (p) => estimateImpact(a, p)[2].value,
    );
    const recycleValue = estimateImpact(a, "recycle")[2].value;
    expect(recycleValue).toBe(Math.min(...values));
    expect(VALUE_MODEL.recycle.factor).toBeLessThan(0.5);
  });

  it("refurbish realizes more than repair (post-restoration)", () => {
    const a = analysisOf("laptop");
    expect(estimateImpact(a, "refurbish")[2].value).toBeGreaterThan(
      estimateImpact(a, "repair")[2].value,
    );
    expect(estimateImpact(a, "refurbish")[2].value).toBe(298); // 350 × 0.85 → 297.5 rounds to 298
  });
});

describe("honesty invariants", () => {
  it("is deterministic — same input, same output", () => {
    const a = analysisOf("smartphone", { condition: 45, resalePotential: 30 });
    expect(estimateImpact(a, "repair")).toEqual(estimateImpact(a, "repair"));
  });

  it("every estimate embeds its model version and category assumption", () => {
    for (const pathway of NEXT_LIFE_PATHS) {
      for (const e of estimateImpact(analysisOf("laptop"), pathway)) {
        expect(e.assumptions.join(" ")).toContain("reloop-impact-");
        expect(e.assumptions.join(" ")).toContain("laptop");
      }
    }
  });

  it("second-hand value assumptions exist for all device types", () => {
    for (const d of DEVICE_TYPES) {
      expect(SECOND_HAND_VALUE[d].typicalUsd).toBeGreaterThan(0);
      expect(SECOND_HAND_VALUE[d].basis).toContain("not a valuation");
    }
  });

  it("every pathway has a documented profile", () => {
    for (const p of NEXT_LIFE_PATHS) {
      expect(PATHWAY_PROFILE[p].lifeBasis.length).toBeGreaterThan(10);
      expect(typeof PATHWAY_PROFILE[p].keepsDeviceInUse).toBe("boolean");
    }
  });
});

describe("simulator contract — changing the selected pathway", () => {
  /** What the Future Simulator renders: value + unit per displayed metric. */
  function displayed(device: DeviceType, pathway: (typeof NEXT_LIFE_PATHS)[number]) {
    return Object.fromEntries(
      estimateImpact(analysisOf(device), pathway).map((e) => [
        e.metricId,
        `${e.value} ${e.unit}`,
      ]),
    );
  }

  it("changes at least one displayed value for every pair of pathways, on every device type", () => {
    for (const device of DEVICE_TYPES) {
      for (let i = 0; i < NEXT_LIFE_PATHS.length; i++) {
        for (let j = i + 1; j < NEXT_LIFE_PATHS.length; j++) {
          const a = NEXT_LIFE_PATHS[i];
          const b = NEXT_LIFE_PATHS[j];
          const shownA = displayed(device, a);
          const shownB = displayed(device, b);
          const identical = Object.keys(shownA).every(
            (metric) => shownA[metric] === shownB[metric],
          );
          expect(
            identical,
            `${device}: selecting ${a} vs ${b} would display identical values`,
          ).toBe(false);
        }
      }
    }
  });

  it("switching to recycle reduces both life extension and waste (circularity impact differs)", () => {
    for (const device of DEVICE_TYPES) {
      const [recycleLife, recycleWaste] = estimateImpact(analysisOf(device), "recycle");
      for (const pathway of NEXT_LIFE_PATHS.filter((p) => p !== "recycle")) {
        const [life, waste] = estimateImpact(analysisOf(device), pathway);
        expect(life.value, `${device}/${pathway} life vs recycle`).toBeGreaterThan(
          recycleLife.value,
        );
        expect(waste.value, `${device}/${pathway} waste vs recycle`).toBeGreaterThan(
          recycleWaste.value,
        );
      }
    }
  });
});
