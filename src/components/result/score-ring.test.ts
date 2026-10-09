// @vitest-environment jsdom
/**
 * Regression: the score ring must show `value` without waiting for anything.
 *
 * Two ways it showed 0 while the explanation beside it read
 * "Next Life Score 40/100":
 *
 *  1. an "already started" ref latch let StrictMode's mount → cleanup → mount
 *     cancel the in-flight frames and then refuse to schedule new ones;
 *  2. the count-up and the settle both hung off time-driven callbacks
 *     (requestAnimationFrame / setTimeout) that a frozen or throttled page
 *     never delivers, so the effect "ran" but nothing ever painted.
 *
 * The component therefore has to be correct during render. These tests never
 * advance time and never fire an animation frame — if a future change brings
 * back a count-up starting at 0, the first assertion fails immediately.
 */
import { StrictMode, act, createElement as h, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoreRing } from "./score-ring";

// React refuses to coordinate with act() outside a testing environment flag.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const SIZE = 260;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * ((SIZE - STROKE) / 2);

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

function ring(): HTMLElement {
  const el = container?.querySelector('[role="img"]');
  if (!el) throw new Error("score ring did not render");
  return el as HTMLElement;
}

/** The large number in the middle of the ring. */
function displayedScore(): string {
  const el = ring().querySelector("span.tabular-nums");
  if (!el) throw new Error("score number did not render");
  return el.textContent ?? "";
}

/** stroke-dashoffset of the progress arc; 0 = full ring, circumference = empty. */
function arcOffset(): number {
  const arc = ring().querySelector('circle[stroke="url(#scoreRingGradient)"]');
  if (!arc) throw new Error("progress arc did not render");
  return Number(arc.getAttribute("stroke-dashoffset"));
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

describe("ScoreRing — displays the real score", () => {
  it("shows the final number and arc during render, before any frame fires", async () => {
    await mount(h(ScoreRing, { value: 40 }));

    // No settling, no timers: this is what the user sees on first paint.
    expect(ring().getAttribute("aria-label")).toBe("Next Life Score 40 out of 100");
    expect(displayedScore()).toBe("40");
    // 40/100 → 60% of the circumference remains undrawn
    expect(arcOffset()).toBeCloseTo(CIRCUMFERENCE * 0.6, 1);
  });

  it("is still correct when requestAnimationFrame never fires", async () => {
    // The frozen-page symptom: frames are requested but never delivered.
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);

    await mount(h(ScoreRing, { value: 40 }));

    expect(displayedScore()).toBe("40");
    expect(arcOffset()).toBeCloseTo(CIRCUMFERENCE * 0.6, 1);
  });

  it("converges on 40 under StrictMode's double mount", async () => {
    await mount(h(StrictMode, null, h(ScoreRing, { value: 40 })));

    expect(ring().getAttribute("aria-label")).toBe("Next Life Score 40 out of 100");
    expect(displayedScore()).toBe("40");
    expect(arcOffset()).toBeCloseTo(CIRCUMFERENCE * 0.6, 1);
  });

  it("animates towards the value it already displays", async () => {
    await mount(h(ScoreRing, { value: 40 }));

    const arc = ring().querySelector('circle[stroke="url(#scoreRingGradient)"]');
    const style = (arc as HTMLElement).style;
    expect(style.animation).toContain("score-ring-draw");
    // The keyframe's end point is the element's own final state, so a browser
    // that skips the animation lands on the same arc either way.
    expect(style.getPropertyValue("--score-ring-to").trim()).toBe(
      `${CIRCUMFERENCE * (1 - 40 / 100)}px`,
    );
  });

  it("still renders a genuine 0 as 0", async () => {
    await mount(h(ScoreRing, { value: 0 }));

    expect(displayedScore()).toBe("0");
    expect(arcOffset()).toBeCloseTo(CIRCUMFERENCE, 1);
    expect(ring().getAttribute("aria-label")).toBe("Next Life Score 0 out of 100");
  });

  it("clamps out-of-range input rather than rendering it", async () => {
    await mount(h(ScoreRing, { value: 140 }));

    expect(displayedScore()).toBe("100");
    expect(ring().getAttribute("aria-label")).toBe("Next Life Score 100 out of 100");
  });
});
