/**
 * Factory selection tests — the "when the required AWS/AI environment
 * variables are configured" clause of the end-to-end pipeline.
 *
 * env uses lazy process.env getters, so each test configures the variables,
 * calls the factory, and restores the environment. Nothing here touches the
 * network: constructing the SDK clients is offline, and the misconfigured
 * Bedrock path is asserted to fail honestly instead of falling back to a
 * fake analysis.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createImageStore } from "@/lib/aws/s3";
import { createScanRepository } from "@/lib/aws/dynamodb";
import { createAnalysisProvider } from "@/analysis";

const KEYS = [
  "RELOOP_IMAGE_BUCKET",
  "RELOOP_SCAN_TABLE",
  "RELOOP_ANALYSIS_PROVIDER",
  "RELOOP_BEDROCK_MODEL_ID",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("image store selection", () => {
  it("uses S3 when RELOOP_IMAGE_BUCKET is configured", () => {
    process.env.RELOOP_IMAGE_BUCKET = "reloop-test-bucket";
    expect(createImageStore().id).toBe("s3");
  });

  it("falls back to local storage when no bucket is configured", () => {
    expect(createImageStore().id).toBe("local");
  });
});

describe("scan repository selection", () => {
  it("uses DynamoDB when RELOOP_SCAN_TABLE is configured", () => {
    process.env.RELOOP_SCAN_TABLE = "reloop-test-table";
    expect(createScanRepository().id).toBe("dynamodb");
  });

  it("falls back to the in-memory repository when no table is configured", () => {
    expect(createScanRepository().id).toBe("memory");
  });
});

describe("analysis provider selection", () => {
  it("uses the mock provider by default (clearly labelled provider: mock)", () => {
    expect(createAnalysisProvider().id).toBe("mock");
  });

  it("uses Bedrock when provider + model id are configured", () => {
    process.env.RELOOP_ANALYSIS_PROVIDER = "bedrock";
    process.env.RELOOP_BEDROCK_MODEL_ID =
      "anthropic.claude-3-5-sonnet-20240620-v1:0";
    const provider = createAnalysisProvider();
    expect(provider.id).toBe("bedrock");
  });

  it("fails honestly on misconfiguration instead of faking analysis", async () => {
    process.env.RELOOP_ANALYSIS_PROVIDER = "bedrock";
    // Model id intentionally missing.
    const provider = createAnalysisProvider();
    expect(provider.id).toBe("bedrock");
    const outcome = await provider.analyze({
      imageKey: "scans/x.png",
      contentType: "image/png",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.kind).toBe("provider_failure");
      expect(outcome.message).toContain("RELOOP_BEDROCK_MODEL_ID");
    }
  });
});
