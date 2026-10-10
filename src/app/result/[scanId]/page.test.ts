// @vitest-environment jsdom
/**
 * Regression: the result page must show ONE score everywhere.
 *
 * The reported page read "Next Life Score 40/100" in the explanation while the
 * ring, the hero number and the tab title showed 0. This renders the real page
 * with the real scan it would receive from GET /api/scans/:id — built here by
 * the real AI boundary and the real engine from the attributes a real Nova scan
 * returned — and asserts every display point agrees:
 *
 *   1. score ring number + arc         (score.overall)
 *   2. hero device name                (deviceDisplayName, "0" brand → "laptop")
 *   3. explanation                     (engine.reasoning)
 *   4. document.title                  (name — score.overall Next Life Score)
 *   5. attribute bars                  (score.contributions → 20/60/30/15/85)
 *
 * Nothing here is mocked except the network fetch and next/link, so a
 * regression in any one of those five paths fails the test.
 */
import { act, createElement as h, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseModelPayload } from "@/analysis/schema";
import { runEngine } from "@/engine";
import { estimateImpact } from "@/engine/impact";
import type { ScanResult } from "@/types/scan";
import ResultPage from "./page";
import { revealSubhead } from "@/components/result/waste-reveal";
import type { Recommendation } from "@/types/score";

// React refuses to coordinate with act() outside a testing environment flag.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({ response: null as unknown }));

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...actual, getScan: async () => state.response };
});

vi.mock("next/link", () => ({
  default: (props: { href?: unknown; children?: ReactNode }) =>
    h("a", { href: String(props.href) }, props.children),
}));

/** Exactly what the model returned for the reported scan. */
const NOVA_PAYLOAD: Record<string, unknown> = {
  deviceType: "laptop",
  brand: "0", // placeholder, normalized to null at the AI boundary
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
const ANALYSIS = parsed.analysis;

// The page's data comes from the real engine, not a hardcoded 40.
const ENGINE = runEngine(ANALYSIS);

const SCAN: ScanResult = {
  scanId: "14f33c54-b679-40d4-b968-e6711d29eec2",
  createdAt: "2026-10-09T00:00:00.000Z",
  status: "complete",
  image: { key: "scans/reported.png", contentType: "image/png", byteSize: 20480 },
  analysis: ANALYSIS,
  analysisSource: {
    provider: "bedrock",
    modelId: "global.amazon.nova-2-lite-v1:0",
    requestedAt: "2026-10-09T00:00:00.000Z",
  },
  score: ENGINE.score,
  recommendation: ENGINE.recommendation,
  engine: {
    confidence: ENGINE.confidence,
    contributingFactors: ENGINE.contributingFactors,
    reasoning: ENGINE.reasoning,
    engineVersion: ENGINE.engineVersion,
  },
  impactEstimates: estimateImpact(ANALYSIS, ENGINE.recommendation.path),
  error: null,
};

let container: HTMLDivElement | undefined;
let root: Root | undefined;

async function mountPage(): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(h(ResultPage, { params: Promise.resolve({ scanId: SCAN.scanId }) }));
  });
  // Let the fetch promise chain and its effect settle.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function scoreNumber(): string {
  const span = container?.querySelector('[role="img"] span.tabular-nums');
  if (!span) throw new Error("score ring did not render");
  return span.textContent ?? "";
}

function barWidths(): string[] {
  return Array.from(
    container?.querySelectorAll('dl [class*="h-full"]') ?? [],
    (bar) => (bar as HTMLElement).style.width,
  );
}

beforeEach(() => {
  state.response = { scan: SCAN, imageUrl: null };
  document.title = "ReLoop";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.restoreAllMocks();
});

describe("result page — the reported scan (attributes → 40)", () => {
  it("shows 40 in the ring, the arc, the explanation and the tab title", async () => {
    await mountPage();

    // The engine really produced 40 from these attributes.
    expect(ENGINE.score.overall).toBe(40);

    // 1. Score ring: the number and the arc both describe 40, not 0.
    expect(scoreNumber()).toBe("40");
    const ring = container?.querySelector('[role="img"]');
    expect(ring?.getAttribute("aria-label")).toBe("Next Life Score 40 out of 100");
    const arc = ring?.querySelector('circle[stroke="url(#scoreRingGradient)"]');
    const offset = Number(arc?.getAttribute("stroke-dashoffset"));
    // The ring is a supporting element now — read its rendered size rather
    // than assuming the hero's old diameter.
    const size = Number(ring?.querySelector("svg")?.getAttribute("width"));
    const circumference = 2 * Math.PI * ((size - 12) / 2);
    expect(offset).toBeCloseTo(circumference * 0.6, 1);

    // 3. Explanation — the text that was already right must agree with the ring.
    expect(container?.textContent).toContain("Next Life Score 40/100");

    // 2. Hero device name — brand "0" must never be printed.
    const deviceName = container?.querySelector("p.truncate")?.textContent;
    expect(deviceName).toBe("laptop");
    expect(container?.textContent).not.toContain("0 — 40");

    // 4. Tab title.
    expect(document.title).toBe("laptop — 40 Next Life Score");

    // 5. Attribute bars carry the measured values the score was computed from.
    expect(barWidths()).toEqual(["20%", "60%", "30%", "15%", "85%"]);
  });

  it("tells the RELOOP 2.0 story and keeps the honesty boundaries", async () => {
    await mountPage();
    const text = container?.textContent ?? "";

    // The reveal comes first and carries the message — and its subhead is
    // recommendation-aware: this scan's engine output is RECYCLE, so the hero
    // speaks about the materials' next life, not a working life for the device.
    expect(text).toContain("isn’t");
    expect(text).toContain("waste yet.");
    expect(text).toContain("Its materials still have another life.");
    expect(text).not.toContain("What could it still become?");
    // The section 02 heading keeps the full "what can be saved" framing.
    expect(text).toContain("What can still be saved?");

    // The five-step experience exists on one page.
    expect(text).toContain("Device DNA");
    expect(text).toContain("What matters to you?");
    expect(text).toContain("Compare its futures");
    expect(text).toContain("The winning path");

    // The honesty boundary is always on the page.
    expect(text).toContain("Requires physical inspection");
    expect(
      container?.querySelector('[role="group"][aria-label="What matters to you"]'),
    ).not.toBeNull();

    // Hidden internals are named only as un-inspectable, never claimed.
    expect(text).toContain("RAM, storage and the mainboard are hidden");
    expect(text).toContain("One external photo cannot show these");
  });

  it("renders the same score when the tab is created before the data arrives", async () => {
    // The bug showed 0 on first paint, so assert the number is correct in the
    // very first committed frame — before any timers or animation frames run.
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(h(ResultPage, { params: Promise.resolve({ scanId: SCAN.scanId }) }));
    });

    expect(scoreNumber()).toBe("40");
  });

  it("renders estimated retained value in INR format without USD", async () => {
    await mountPage();
    const text = container?.textContent ?? "";
    expect(text).toContain("₹");
    expect(text).not.toContain("USD");
    expect(text).not.toContain("$");
  });
});

describe("reveal subhead — recommendation-aware copy", () => {
  const rec = (path: Recommendation["path"]): Recommendation => ({
    path,
    headline: path.toUpperCase(),
    rationale: "test",
    matchedRuleId: "test-rule",
  });

  it("frames recycle around the materials' next life, never the device's", () => {
    expect(revealSubhead(rec("recycle"))).toBe(
      "Its materials still have another life.",
    );
  });

  it("offers a possible next use — as a question — for every working-life path", () => {
    for (const path of [
      "repair",
      "refurbish",
      "reuse",
      "donate",
      "resell",
    ] as const) {
      const line = revealSubhead(rec(path));
      expect(line).toBe("What could it still become?");
      // No promise of success.
      expect(line).toMatch(/\?$/);
    }
  });
});
