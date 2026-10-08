/**
 * MockAnalysisProvider — LOCAL DEVELOPMENT / TESTS ONLY.
 *
 * Deterministic, fixture-based analysis with no network calls. Every result
 * is stamped source.provider = "mock" so the UI can label it and it can never
 * be mistaken for a real model response.
 *
 * Selection: fixture is chosen deterministically from the image content hash
 * (or forced via constructor for tests). Images under 4 KB are refused with
 * insufficient_information — mirroring the honest-refusal behaviour the real
 * provider must have for unusable photos.
 */
import { createHash } from "crypto";
import { FIXTURES, INSUFFICIENT_FIXTURE, type RawModelFixture } from "@/analysis/fixtures";
import { parseModelPayload } from "@/analysis/schema";
import type {
  AnalysisInput,
  AnalysisOutcome,
  AnalysisProvider,
} from "@/types/analysis";

const MIN_BYTES = 4 * 1024;

const PROFILE_KEYS = ["laptop", "smartphone", "tablet"] as const;
type ProfileKey = (typeof PROFILE_KEYS)[number];

export class MockAnalysisProvider implements AnalysisProvider {
  readonly id = "mock" as const;

  constructor(private readonly forced?: ProfileKey) {}

  async analyze(input: AnalysisInput): Promise<AnalysisOutcome> {
    const source = {
      provider: "mock" as const,
      modelId: "reloop-local-fixture-v1",
      requestedAt: new Date().toISOString(),
    };

    const bytes = input.bytes;
    if (!bytes || bytes.byteLength < MIN_BYTES) {
      // Honest refusal for tiny/unreadable payloads — same contract as Bedrock.
      return {
        ok: false,
        kind: "insufficient_information",
        message: `Image is too small (${bytes?.byteLength ?? 0} bytes) to assess reliably.`,
        missing: ["adequate resolution", "device outline"],
      };
    }

    const fixture = this.pick(bytes);
    const parsed = parseModelPayload(fixture.payload);
    if (!parsed.ok) {
      // Fixture payloads are covered by tests; a failure here is a dev bug,
      // reported as malformed_output rather than passed through.
      return { ok: false, kind: parsed.kind, message: parsed.message };
    }

    return { ok: true, analysis: parsed.analysis, source };
  }

  private pick(bytes: Uint8Array): RawModelFixture {
    if (this.forced) return FIXTURES[this.forced];
    const hash = createHash("sha256").update(bytes).digest();
    const index = hash[0] % PROFILE_KEYS.length;
    const profile = PROFILE_KEYS[index];
    // Occasionally return the insufficient fixture so the refusal path is
    // reachable in manual testing (≈1 in 8 images).
    if (hash[1] % 8 === 0) return INSUFFICIENT_FIXTURE;
    return FIXTURES[profile];
  }
}
