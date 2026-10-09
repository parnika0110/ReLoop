/**
 * Regression: Nova sometimes returns brand "0" when it cannot identify one.
 * "0" is truthy, so it survived `.filter(Boolean)` and the result heading and
 * tab title read "0 — 40 Next Life Score". Brand must be normalized to null at
 * the analysis boundary, and the label must fall back to the device type.
 */
import { describe, expect, it } from "vitest";
import {
  brandModelLabel,
  deviceDisplayName,
  isBrandPlaceholder,
} from "@/lib/brand";
import type { DeviceAnalysis } from "@/types/analysis";

type Label = Pick<DeviceAnalysis, "deviceType" | "brand" | "model">;

const ANALYSIS: Label = {
  deviceType: "laptop",
  brand: null,
  model: null,
};

describe("isBrandPlaceholder", () => {
  it("flags Nova's placeholder values", () => {
    for (const value of ["0", "00", "?", "N/A", "none", "null", " unknown ", ""]) {
      expect(isBrandPlaceholder(value), value).toBe(true);
    }
  });

  it("accepts real brands", () => {
    for (const value of ["Lenovo", "Apple", "Samsung Electronics"]) {
      expect(isBrandPlaceholder(value), value).toBe(false);
    }
  });
});

describe("brandModelLabel", () => {
  it("never returns a placeholder for brand or model", () => {
    // Nova sent "0" — the completion screen used to render it verbatim.
    expect(brandModelLabel({ brand: "0", model: null })).toBeNull();
    expect(brandModelLabel({ brand: null, model: "0" })).toBeNull();
    expect(brandModelLabel({ brand: "0", model: "n/a" })).toBeNull();
  });

  it("keeps every real part", () => {
    expect(brandModelLabel({ brand: "Lenovo", model: "ThinkPad X1" })).toBe(
      "Lenovo ThinkPad X1",
    );
    expect(brandModelLabel({ brand: null, model: "Latitude 5420" })).toBe(
      "Latitude 5420",
    );
    expect(brandModelLabel({ brand: "Lenovo", model: null })).toBe("Lenovo");
  });
});

describe("deviceDisplayName", () => {
  it("falls back to the device type instead of showing brand \"0\"", () => {
    expect(deviceDisplayName({ ...ANALYSIS, brand: "0" })).toBe("laptop");
  });

  it("builds the title the result page renders", () => {
    const name = deviceDisplayName({ ...ANALYSIS, brand: "0" });
    expect(`${name} — 40 Next Life Score`).toBe("laptop — 40 Next Life Score");
  });

  it("uses brand and model when both are real", () => {
    expect(
      deviceDisplayName({ ...ANALYSIS, brand: "Lenovo", model: "ThinkPad X1" }),
    ).toBe("Lenovo ThinkPad X1");
  });

  it("drops a placeholder brand but keeps a real model", () => {
    expect(deviceDisplayName({ ...ANALYSIS, brand: "0", model: "Latitude 5420" })).toBe(
      "Latitude 5420",
    );
  });

  it("falls back to the device type when nothing is identified", () => {
    expect(deviceDisplayName(ANALYSIS)).toBe("laptop");
    expect(deviceDisplayName({ ...ANALYSIS, brand: "  " })).toBe("laptop");
  });
});
