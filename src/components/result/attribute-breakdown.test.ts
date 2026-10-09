// @vitest-environment jsdom
/**
 * Regression: the attribute bars must carry their real width during render.
 *
 * They used to be gated behind an IntersectionObserver callback. On a page
 * whose callbacks are suspended (frozen/throttled tab, headless preview) that
 * callback never arrives, so every bar sat at `width: 0%` while the numbers
 * printed beside it were already correct — the same class of bug that left
 * the score ring at 0.
 *
 * IntersectionObserver is stubbed here as a *silent* observer: it accepts the
 * subscription and never calls back, exactly like the broken environment.
 */
import { act, createElement as h, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeScore } from "@/engine/score";
import type { DeviceAnalysis } from "@/types/analysis";
import { AttributeBreakdown } from "./attribute-breakdown";

// React refuses to coordinate with act() outside a testing environment flag.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** The attributes a real Nova scan reported on the result page with score 40. */
const REPORTED: DeviceAnalysis = {
  deviceType: "laptop",
  brand: null,
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

let container: HTMLDivElement | undefined;
let root: Root | undefined;

async function mount(node: ReactNode): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(node);
  });
}

function bars(): HTMLElement[] {
  const found = Array.from(
    container?.querySelectorAll('dl [class*="h-full"]') ?? [],
  );
  if (found.length === 0) throw new Error("no attribute bars rendered");
  return found as HTMLElement[];
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("AttributeBreakdown — bars show the measured values", () => {
  it("renders every bar at its real width without waiting for a callback", async () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      },
    );

    const score = computeScore(REPORTED);
    await mount(h(AttributeBreakdown, { score }));

    const widths = bars().map((bar) => bar.style.width);
    expect(widths).toEqual(["20%", "60%", "30%", "15%", "85%"]);
  });

  it("keeps the reveal as a CSS animation that ends on the displayed width", async () => {
    const score = computeScore(REPORTED);
    await mount(h(AttributeBreakdown, { score }));

    const [first] = bars();
    expect(first.style.animation).toContain("attribute-bar-in");
    expect(first.style.animation).toContain("both");
    // Keyframe end point = the width the element already carries.
    expect(first.style.getPropertyValue("--attribute-bar-to").trim()).toBe("20%");
  });
});
