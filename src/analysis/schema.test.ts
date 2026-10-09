import { describe, expect, it } from "vitest";
import {
  FIXTURES,
  INSUFFICIENT_FIXTURE,
  MALFORMED_FIXTURE,
  UNSUPPORTED_FIXTURE,
} from "@/analysis/fixtures";
import { extractJsonObject, parseModelPayload } from "@/analysis/schema";

describe("parseModelPayload — representative devices", () => {
  for (const [device, fixture] of Object.entries(FIXTURES)) {
    it(`accepts the ${device} fixture (${fixture.name})`, () => {
      const result = parseModelPayload(fixture.payload);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.analysis.deviceType).toBe(device);
      // nulls preserved, never invented
      if (fixture.payload.brand === null) expect(result.analysis.brand).toBeNull();
      if (fixture.payload.model === null) expect(result.analysis.model).toBeNull();
      if (fixture.payload.estimatedAge === null) {
        expect(result.analysis.estimatedAge).toBeNull();
      }
      for (const score of [
        result.analysis.condition,
        result.analysis.repairability,
        result.analysis.reusePotential,
        result.analysis.resalePotential,
        result.analysis.materialRecoveryPotential,
        result.analysis.confidence,
      ]) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });
  }

  it("preserves observed issues with severity", () => {
    const result = parseModelPayload(FIXTURES.smartphone.payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.observedIssues).toHaveLength(2);
    expect(result.analysis.observedIssues[0].id).toBe("cracked_screen");
    expect(result.analysis.observedIssues[0].severity).toBe("critical");
  });
});

describe("parseModelPayload — honest refusal & rejection", () => {
  it("honours an insufficient declaration", () => {
    const result = parseModelPayload(INSUFFICIENT_FIXTURE.payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("insufficient_information");
    expect(result.message).toContain("blurred");
    expect(result.missing).toContain("device outline");
  });

  it("rejects unsupported device types", () => {
    const result = parseModelPayload(UNSUPPORTED_FIXTURE.payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("unsupported_device");
    expect(result.message).toContain("microwave");
  });

  it("rejects out-of-range scores (does not clamp)", () => {
    const result = parseModelPayload(MALFORMED_FIXTURE.payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("malformed_output");
    expect(result.paths).toContain("condition");
  });

  it("rejects missing fields", () => {
    const result = parseModelPayload({ deviceType: "laptop" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("malformed_output");
    expect(result.paths).toContain("repairability");
  });

  it("rejects non-objects", () => {
    expect(parseModelPayload("recycle this").ok).toBe(false);
    expect(parseModelPayload(null).ok).toBe(false);
    expect(parseModelPayload([]).ok).toBe(false);
  });

  it("normalizes empty strings to null", () => {
    const result = parseModelPayload({ ...FIXTURES.tablet.payload, brand: "  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.brand).toBeNull();
  });

  // Regression: Nova returned brand "0" when it could not identify one, and
  // "0" is truthy — it survived `.filter(Boolean)` and leaked into the result
  // heading as "0 — 40 Next Life Score". Brand must become null instead.
  it("normalizes Nova's placeholder brand \"0\" to null", () => {
    const result = parseModelPayload({ ...FIXTURES.laptop.payload, brand: "0" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.analysis.brand).toBeNull();
    // contract unchanged: still string | null
    expect(typeof result.analysis.brand).not.toBe("string");
  });

  it("normalizes other placeholder brands to null but keeps real ones", () => {
    for (const placeholder of ["00", "N/A", "unknown", "null", " none ", "?"]) {
      const result = parseModelPayload({
        ...FIXTURES.laptop.payload,
        brand: placeholder,
      });
      expect(result.ok, `brand ${placeholder}`).toBe(true);
      if (!result.ok) return;
      expect(result.analysis.brand, `brand ${placeholder}`).toBeNull();
    }

    const real = parseModelPayload({ ...FIXTURES.laptop.payload, brand: "Lenovo" });
    expect(real.ok).toBe(true);
    if (!real.ok) return;
    expect(real.analysis.brand).toBe("Lenovo");
  });

  it("rejects invalid issue severities", () => {
    const result = parseModelPayload({
      ...FIXTURES.tablet.payload,
      observedIssues: [{ id: "x", label: "X", severity: "catastrophic" }],
    });
    expect(result.ok).toBe(false);
  });
});

describe("extractJsonObject", () => {
  it("parses fenced JSON", () => {
    const out = extractJsonObject('Here you go:\n```json\n{"a":1}\n```\nthanks');
    expect(out).toEqual({ a: 1 });
  });

  it("parses bare JSON", () => {
    expect(extractJsonObject('{"a": 2}')).toEqual({ a: 2 });
  });

  it("returns null for prose without JSON", () => {
    expect(extractJsonObject("I think you should recycle it.")).toBeNull();
    expect(extractJsonObject("{broken")).toBeNull();
  });
});
