/**
 * Failure-matrix tests for POST /api/scans.
 *
 * Phase 8 requires explicit coverage of: success, unsupported input,
 * poor-quality image, AI failure, S3 failure, DynamoDB failure.
 * The AWS and AI layers are mocked at their factory seams so each failure
 * mode can be triggered deterministically; the engine and impact estimator
 * stay real so the happy path proves the full pipeline.
 *
 * Invariants under test:
 *   - a failed image store never persists or returns a scan id (no fake success)
 *   - a failed persistence reports persisted: false instead of claiming durability
 *   - a failed AI analysis records status "failed" with score null — never a score
 *   - poor-quality input records status "insufficient_information"
 *   - validation errors are 400s with a typed error kind
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { NextRequest } from "next/server";
import type { AnalysisOutcome, DeviceAnalysis } from "@/types/analysis";
import type { ScanResult } from "@/types/scan";

const state = vi.hoisted(() => ({
  imagePuts: 0,
  scanPuts: [] as ScanResult[],
  failImageStore: false,
  failRepository: false,
  storeId: "local" as "local" | "s3",
  repoId: "memory" as "memory" | "dynamodb",
  analysisOutcome: null as AnalysisOutcome | null,
}));

vi.mock("@/lib/aws/s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/aws/s3")>();
  return {
    ...actual,
    createImageStore: () => ({
      id: state.storeId,
      put: async () => {
        if (state.failImageStore) throw new Error("simulated store outage");
        state.imagePuts += 1;
      },
      get: async () => null,
      getReadUrl: async () => "http://localhost/unused",
    }),
  };
});

vi.mock("@/lib/aws/dynamodb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/aws/dynamodb")>();
  return {
    ...actual,
    createScanRepository: () => ({
      id: state.repoId,
      put: async (scan: ScanResult) => {
        if (state.failRepository) throw new Error("simulated table outage");
        state.scanPuts.push(scan);
      },
      get: async () => null,
      listRecent: async () => [],
    }),
  };
});

vi.mock("@/analysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/analysis")>();
  return {
    ...actual,
    createAnalysisProvider: () => ({ id: "mock" as const, analyze: async () => ({ ok: false as const, kind: "timeout" as const, message: "unused" }) }),
    runAnalysis: async (): Promise<AnalysisOutcome> =>
      state.analysisOutcome ?? { ok: false, kind: "timeout", message: "outcome not set" },
  };
});

const ANALYSIS: DeviceAnalysis = {
  deviceType: "laptop",
  brand: "TestCo",
  model: "Roadwarrior",
  estimatedAge: 3,
  condition: 80,
  repairability: 70,
  reusePotential: 75,
  resalePotential: 65,
  materialRecoveryPotential: 60,
  observedIssues: [],
  confidence: 85,
};

const OK_OUTCOME: AnalysisOutcome = {
  ok: true,
  analysis: ANALYSIS,
  source: { provider: "mock", modelId: "reloop-local-fixture-v1", requestedAt: "2026-10-08T00:00:00.000Z" },
};

function upload(file?: File): Promise<Response> {
  const form = new FormData();
  if (file) form.append("image", file);
  const req = new Request("http://localhost/api/scans", { method: "POST", body: form });
  return POST(req as unknown as NextRequest);
}

function pngFile(sizeBytes: number, type = "image/png"): File {
  const bytes = new Uint8Array(sizeBytes);
  // Minimal PNG signature so the payload is plausibly an image.
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([bytes], "device.png", { type });
}

beforeEach(() => {
  state.imagePuts = 0;
  state.scanPuts = [];
  state.failImageStore = false;
  state.failRepository = false;
  state.storeId = "local";
  state.repoId = "memory";
  state.analysisOutcome = OK_OUTCOME;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/scans — success path", () => {
  it("runs validation → store → analysis → engine → impact → persistence", async () => {
    const res = await upload(pngFile(8 * 1024));
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.persisted).toBe(true);
    expect(body.storage).toBe("local");
    expect(body.repository).toBe("memory");
    expect(state.imagePuts).toBe(1);
    expect(state.scanPuts).toHaveLength(1);

    const scan = body.scan as ScanResult;
    expect(scan.status).toBe("complete");
    expect(scan.scanId).toMatch(/^[0-9a-f-]{36}$/);
    expect(scan.analysis).not.toBeNull();
    expect(scan.analysisSource?.provider).toBe("mock");
    expect(scan.score?.overall).toBeGreaterThanOrEqual(0);
    expect(scan.score?.overall).toBeLessThanOrEqual(100);
    expect(scan.recommendation?.path).toBeTruthy();
    expect(scan.impactEstimates).toHaveLength(3);
    expect(scan.error).toBeNull();

    // The persisted record is the same completed scan that was returned.
    expect(state.scanPuts[0].status).toBe("complete");
    expect(state.scanPuts[0].scanId).toBe(scan.scanId);
  });
});

describe("POST /api/scans — image store (S3) failure", () => {
  it("returns 502 aws_failure and never persists a scan record", async () => {
    state.storeId = "s3";
    state.failImageStore = true;

    const res = await upload(pngFile(8 * 1024));
    expect(res.status).toBe(502);
    const body = await res.json();

    expect(body.error.kind).toBe("aws_failure");
    expect(body.error.message).toContain("S3");
    expect(body.scan).toBeUndefined();
    expect(state.imagePuts).toBe(0);
    expect(state.scanPuts).toHaveLength(0);
  });
});

describe("POST /api/scans — DynamoDB persistence failure", () => {
  it("still returns the completed scan but reports persisted: false", async () => {
    state.failRepository = true;

    const res = await upload(pngFile(8 * 1024));
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.persisted).toBe(false);
    expect(body.scan.status).toBe("complete");
    expect(body.scan.score?.overall).toBeGreaterThanOrEqual(0);
    expect(state.scanPuts).toHaveLength(0);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("POST /api/scans — AI analysis failures", () => {
  it("records provider_failure with status failed and no score (never faked)", async () => {
    state.analysisOutcome = { ok: false, kind: "provider_failure", message: "model endpoint unavailable" };

    const res = await upload(pngFile(8 * 1024));
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.scan.status).toBe("failed");
    expect(body.scan.error).toEqual({
      kind: "provider_failure",
      message: "model endpoint unavailable",
    });
    expect(body.scan.analysis).toBeNull();
    expect(body.scan.score).toBeNull();
    expect(body.scan.recommendation).toBeNull();
    expect(body.scan.impactEstimates).toBeNull();
    expect(body.persisted).toBe(true);
  });

  it("maps poor-quality input to insufficient_information with no score", async () => {
    state.analysisOutcome = {
      ok: false,
      kind: "insufficient_information",
      message: "Image is too small to assess reliably.",
      missing: ["adequate resolution"],
    };

    const res = await upload(pngFile(8 * 1024));
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.scan.status).toBe("insufficient_information");
    expect(body.scan.error?.kind).toBe("insufficient_information");
    expect(body.scan.analysis).toBeNull();
    expect(body.scan.score).toBeNull();
    expect(body.scan.impactEstimates).toBeNull();
  });

  it("records malformed model output as failed, not as a result", async () => {
    state.analysisOutcome = { ok: false, kind: "malformed_output", message: "missing required fields" };

    const res = await upload(pngFile(8 * 1024));
    const body = await res.json();

    expect(body.scan.status).toBe("failed");
    expect(body.scan.error?.kind).toBe("malformed_output");
    expect(body.scan.score).toBeNull();
  });
});

describe("POST /api/scans — input validation", () => {
  it("rejects unsupported file types with 400 before touching the store", async () => {
    const res = await upload(pngFile(100, "text/plain"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.kind).toBe("unsupported_input");
    expect(state.imagePuts).toBe(0);
    expect(state.scanPuts).toHaveLength(0);
  });

  it("rejects an empty file", async () => {
    const res = await upload(new File([], "empty.png", { type: "image/png" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("empty");
    expect(state.imagePuts).toBe(0);
  });

  it("rejects a request without an image field", async () => {
    const res = await upload(undefined);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.kind).toBe("unsupported_input");
    expect(state.imagePuts).toBe(0);
  });

  it("rejects payloads over the configured size limit", async () => {
    const overLimit = new Uint8Array(9 * 1024 * 1024);
    overLimit.set([0x89, 0x50, 0x4e, 0x47]);
    const res = await upload(new File([overLimit], "big.png", { type: "image/png" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("limit");
    expect(state.imagePuts).toBe(0);
  });
});
