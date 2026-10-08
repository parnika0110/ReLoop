import { describe, expect, it } from "vitest";
import { MockAnalysisProvider } from "@/analysis/mock";
import { runAnalysis } from "@/analysis";
import { FIXTURES } from "@/analysis/fixtures";
import type { AnalysisProvider } from "@/types/analysis";

/** Deterministic bytes ≥4KB so the mock's size guard passes. */
function fakeImage(seed: number): Uint8Array {
  const bytes = new Uint8Array(8 * 1024);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31 + seed * 7) % 256;
  return bytes;
}

const input = (bytes?: Uint8Array) => ({
  imageKey: "scans/test.png",
  contentType: "image/png",
  bytes,
});

describe("MockAnalysisProvider", () => {
  it("returns validated analysis for a forced laptop fixture", async () => {
    const provider = new MockAnalysisProvider("laptop");
    const outcome = await provider.analyze(input(fakeImage(1)));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.analysis.deviceType).toBe("laptop");
    expect(outcome.analysis.condition).toBe(
      FIXTURES.laptop.payload.condition as number,
    );
    expect(outcome.source.provider).toBe("mock");
    expect(outcome.source.modelId).toContain("fixture");
  });

  it("returns validated analysis for forced smartphone and tablet fixtures", async () => {
    const provider = new MockAnalysisProvider();
    for (const profile of ["smartphone", "tablet"] as const) {
      const forced = new MockAnalysisProvider(profile);
      const outcome = await forced.analyze(input(fakeImage(2)));
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.analysis.deviceType).toBe(profile);
    }
    expect(provider.id).toBe("mock");
  });

  it("is deterministic for identical input", async () => {
    const provider = new MockAnalysisProvider();
    const first = await provider.analyze(input(fakeImage(42)));
    const second = await provider.analyze(input(fakeImage(42)));
    // Compare analysis + outcome (source.requestedAt is a wall-clock stamp).
    expect(first.ok).toBe(second.ok);
    expect(first.ok && second.ok && first.analysis).toEqual(
      second.ok ? second.analysis : null,
    );
    if (first.ok && second.ok) {
      expect(first.source.provider).toBe(second.source.provider);
      expect(first.source.modelId).toBe(second.source.modelId);
    }
  });

  it("refuses images below the size floor with insufficient_information", async () => {
    const provider = new MockAnalysisProvider("laptop");
    const outcome = await provider.analyze(input(new Uint8Array(64)));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.kind).toBe("insufficient_information");
  });

  it("refuses when bytes are missing entirely", async () => {
    const provider = new MockAnalysisProvider("laptop");
    const outcome = await provider.analyze(input(undefined));
    expect(outcome.ok).toBe(false);
  });
});

describe("runAnalysis orchestration", () => {
  it("wraps provider success", async () => {
    const provider = new MockAnalysisProvider("tablet");
    const outcome = await runAnalysis(provider, input(fakeImage(3)));
    expect(outcome.ok).toBe(true);
  });

  it("converts thrown errors into provider_failure (never throws)", async () => {
    const exploding: AnalysisProvider = {
      id: "mock",
      async analyze() {
        throw new Error("secret-token-abc123 should not crash the route");
      },
    };
    const outcome = await runAnalysis(exploding, input(fakeImage(3)));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.kind).toBe("provider_failure");
  });

  it("propagates typed failure without mutation", async () => {
    const failing: AnalysisProvider = {
      id: "bedrock",
      async analyze() {
        return { ok: false, kind: "timeout" as const, message: "too slow" };
      },
    };
    const outcome = await runAnalysis(failing, input());
    expect(outcome).toEqual({ ok: false, kind: "timeout", message: "too slow" });
  });
});
