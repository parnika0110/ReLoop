import { describe, expect, it } from "vitest";
import { calculateRepairVsReplace } from "./repair-vs-replace";

describe("calculateRepairVsReplace", () => {
  it("recommends repair when repair quote is under 45% of value and yields positive equity", () => {
    const result = calculateRepairVsReplace({
      repairQuoteInr: 3000,
      currentValueInr: 2000,
      postRepairValueInr: 12000,
      replacementPriceInr: 25000,
      additionalCostsInr: 500,
    });

    expect(result.recommendation).toBe("repair");
    expect(result.totalRepairCostInr).toBe(3500);
    expect(result.netBenefitOfRepairInr).toBe(6500); // 12000 - 3500 - 2000
    expect(result.headline).toContain("positive value");
  });

  it("recommends replacement when repair quote exceeds 65% of replacement price", () => {
    const result = calculateRepairVsReplace({
      repairQuoteInr: 18000,
      currentValueInr: 3000,
      postRepairValueInr: 15000,
      replacementPriceInr: 22000,
    });

    expect(result.recommendation).toBe("replace");
    expect(result.headline).toContain("Replacement is financially favored");
  });

  it("handles empty and boundary inputs safely without crashing", () => {
    const result = calculateRepairVsReplace({
      repairQuoteInr: 0,
      currentValueInr: 0,
      postRepairValueInr: 0,
      replacementPriceInr: 0,
    });

    expect(result.recommendation).toBe("borderline");
    expect(result.totalRepairCostInr).toBe(0);
    expect(result.netBenefitOfRepairInr).toBe(0);
  });
});
