/**
 * End-to-end regression for the reported result page.
 *
 * A real Nova scan produced
 *
 *   condition 20, repairability 60, reuse 30, resale 15, material 85
 *   → 20×.25 + 60×.20 + 30×.25 + 15×.15 + 85×.15 = 39.5 → 40
 *
 * and the explanation beside the ring correctly said "Next Life Score 40/100"
 * while the ring and the hero number showed 0. The 0 came from the ring's own
 * mount animation (see score-ring.test.ts) — NOT from this pipeline. This test
 * pins that: the raw model payload travels through the strict AI boundary, the
 * real deterministic engine, real persistence and the real GET route, and every
 * value the result page reads is 40. It also pins the placeholder-brand
 * normalization, because Nova returned brand "0" for this image.
 *
 * Only the I/O seams are substituted (image store, repository, analysis
 * provider) so the test never touches AWS; the engine, validation, pipeline and
 * both HTTP routes are the real ones.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { parseModelPayload } from "@/analysis/schema";
import { deviceDisplayName } from "@/lib/brand";
import type { AnalysisOutcome, DeviceAnalysis } from "@/types/analysis";
import type { ScanResult } from "@/types/scan";
import { POST } from "./route";
import { GET } from "./[scanId]/route";

/** Exactly what the model returned for the reported scan (brand as emitted). */
const NOVA_PAYLOAD: Record<string, unknown> = {
  deviceType: "laptop",
  brand: "0", // placeholder — cannot be read as a brand
  model: null,
  estimatedAge: 4,
  condition: 20,
  repairability: 60,
  reusePotential: 30,
  resalePotential: 15,
  materialRecoveryPotential: 85,
  observedIssues: [],
  confidence: 70,
};

const parsed = parseModelPayload(NOVA_PAYLOAD);
if (!parsed.ok) {
  throw new Error(`Fixture rejected by the AI boundary: ${parsed.message}`);
}
const ANALYSIS: DeviceAnalysis = parsed.analysis;

const OUTCOME: AnalysisOutcome = {
  ok: true,
  analysis: ANALYSIS,
  source: {
    provider: "bedrock",
    modelId: "global.amazon.nova-2-lite-v1:0",
    requestedAt: "2026-10-09T00:00:00.000Z",
  },
};

const state = vi.hoisted(() => ({
  scans: new Map<string, ScanResult>(),
  images: new Map<string, Uint8Array>(),
  imagePuts: 0,
}));

vi.mock("@/lib/aws/s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/aws/s3")>();
  return {
    ...actual,
    createImageStore: () => ({
      id: "local" as const,
      put: async ({ key, body }: { key: string; body: Uint8Array }) => {
        state.imagePuts += 1;
        state.images.set(key, body);
      },
      get: async (key: string) => state.images.get(key) ?? null,
      getReadUrl: async (key: string) => `/api/images/${encodeURIComponent(key)}`,
    }),
  };
});

vi.mock("@/lib/aws/dynamodb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/aws/dynamodb")>();
  return {
    ...actual,
    createScanRepository: () => ({
      id: "memory" as const,
      put: async (scan: ScanResult) => {
        state.scans.set(scan.scanId, scan);
      },
      get: async (scanId: string) => state.scans.get(scanId) ?? null,
      listRecent: async () => [...state.scans.values()],
    }),
  };
});

vi.mock("@/analysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/analysis")>();
  return {
    ...actual,
    createAnalysisProvider: () => ({
      id: "bedrock" as const,
      analyze: async () => OUTCOME,
    }),
    runAnalysis: async () => OUTCOME,
  };
});

beforeEach(() => {
  state.scans.clear();
  state.images.clear();
  state.imagePuts = 0;
});

function pngFile(sizeBytes = 8 * 1024): File {
  const bytes = new Uint8Array(sizeBytes);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([bytes], "device.png", { type: "image/png" });
}

async function upload(): Promise<{ status: number; body: Record<string, unknown> }> {
  const form = new FormData();
  form.append("image", pngFile());
  const response = await POST(
    new Request("http://localhost/api/scans", { method: "POST", body: form }) as unknown as NextRequest,
  );
  return { status: response.status, body: await response.json() };
}

async function fetchScan(scanId: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await GET(
    new Request(`http://localhost/api/scans/${scanId}`) as unknown as NextRequest,
    { params: Promise.resolve({ scanId }) },
  );
  return { status: response.status, body: await response.json() };
}

describe("reported scan — AI boundary → engine → persistence → GET", () => {
  it("persists score 40 and serves it back from GET /api/scans/:id", async () => {
    const post = await upload();
    expect(post.status).toBe(201);
    expect(post.body.persisted).toBe(true);

    const posted = post.body.scan as ScanResult;
    expect(posted.status).toBe("complete");
    expect(posted.score?.overall).toBe(40);
    // The exact weighted contributions the page renders as bars.
    expect(posted.score?.contributions.map((c) => [c.key, c.value])).toEqual([
      ["condition", 20],
      ["repairability", 60],
      ["reusePotential", 30],
      ["resalePotential", 15],
      ["materialRecoveryPotential", 85],
    ]);

    const get = await fetchScan(posted.scanId);
    expect(get.status).toBe(200);

    const fetched = get.body.scan as ScanResult;
    expect(fetched.score?.overall).toBe(40);

    // Every number the result page displays for this scan is the same 40 —
    // the ring/hero take `score.overall`, the explanation is engine.reasoning,
    // the tab title is `deviceDisplayName — score.overall Next Life Score`.
    expect(fetched.engine?.reasoning).toContain("Next Life Score 40/100");
    expect(`${deviceDisplayName(fetched.analysis!)} — ${fetched.score!.overall} Next Life Score`).toBe(
      "laptop — 40 Next Life Score",
    );
    expect(fetched.score?.engineVersion).toBe(fetched.engine?.engineVersion);
  });

  it("normalizes Nova's placeholder brand to null without changing the score", async () => {
    const post = await upload();
    const scan = post.body.scan as ScanResult;

    // "0" is truthy, so it used to survive `.filter(Boolean)` and leak into the
    // heading and the tab title as "0 — 40 Next Life Score".
    expect(scan.analysis?.brand).toBeNull();
    expect(scan.analysis?.model).toBeNull();
    expect(deviceDisplayName(scan.analysis!)).toBe("laptop");
    expect(scan.score?.overall).toBe(40);
  });

  it("keeps brand nullable in the response contract", async () => {
    const post = await upload();
    const scan = post.body.scan as ScanResult;
    const raw = JSON.parse(JSON.stringify(scan)) as ScanResult;
    expect(raw.analysis?.brand).toBeNull();
  });
});
