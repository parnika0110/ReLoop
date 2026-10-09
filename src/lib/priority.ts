/**
 * "WHAT MATTERS TO YOU?" — a user preference, rendered as a presentation
 * layer over the six futures.
 *
 * HARD BOUNDARY: nothing in this module (or anything that calls it) feeds
 * runEngine(), computeScore(), or evaluateRecommendation(). The deterministic
 * recommendation stays authoritative; a priority only changes WHICH futures
 * the page highlights and in WHAT ORDER it shows them.
 *
 * Every ranking is built from data that already exists:
 *  - value  → the existing estimateImpact(...).valueRetainedUsd per pathway
 *  - impact → the existing estimateImpact(...).lifeExtensionMonths per pathway
 *  - effort → definitional: what each pathway asks of the person, no numbers
 *
 * The engine is never imported here beyond NextLifePath's type.
 */
import { estimateImpact } from "@/engine/impact";
import type { DeviceAnalysis } from "@/types/analysis";
import { NEXT_LIFE_PATHS, type NextLifePath } from "@/types/score";

export type Priority = "value" | "impact" | "effort";

export interface PriorityOption {
  id: Priority;
  label: string;
  hint: string;
}

export const PRIORITY_OPTIONS: readonly PriorityOption[] = [
  {
    id: "value",
    label: "Value",
    hint: "Keep the most money on the table.",
  },
  {
    id: "impact",
    label: "Impact",
    hint: "Keep the device working — and its materials in use — longest.",
  },
  {
    id: "effort",
    label: "Minimum effort",
    hint: "The least work between today and its next life.",
  },
] as const;

/**
 * What each pathway asks of the person — qualitative, definitional, no
 * invented numbers. Rendered verbatim as "what it asks of you".
 */
export const EFFORT_NOTES: Record<NextLifePath, string> = {
  repair: "A technician opens it up and fixes the fault.",
  refurbish: "A professional restores it — parts, service, cosmetics.",
  reuse: "Wipe your data, then keep using it or hand it over.",
  donate: "Wipe your data, then give it to someone who needs it.",
  resell: "Wipe it, list it honestly, wait for a buyer.",
  recycle: "Drop it at a certified e-waste recycler.",
};

/**
 * Effort tiers, defined by what the pathway *is*, not by measurement:
 * 1 = device is handed over as-is (only your data wipe),
 * 2 = one transactional step (a listing, a drop-off),
 * 3 = a technician must do work on the device.
 */
const EFFORT_TIER: Record<NextLifePath, 1 | 2 | 3> = {
  reuse: 1,
  donate: 1,
  resell: 2,
  recycle: 2,
  repair: 3,
  refurbish: 3,
};

/** All six pathways, ordered best → worst for a priority (ties keep order). */
export function rankPriorities(
  priority: Priority,
  analysis: DeviceAnalysis,
): NextLifePath[] {
  const paths = [...NEXT_LIFE_PATHS];

  if (priority === "effort") {
    return paths.sort((a, b) => EFFORT_TIER[a] - EFFORT_TIER[b]);
  }

  const metric = priority === "value" ? "valueRetainedUsd" : "lifeExtensionMonths";
  const score = new Map<NextLifePath, number>(
    paths.map((path) => {
      const estimate = estimateImpact(analysis, path).find(
        (e) => e.metricId === metric,
      );
      return [path, estimate?.value ?? 0];
    }),
  );
  // Stable sort: equal estimates keep the canonical pathway order.
  return paths.sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0));
}

/** How many top-ranked futures earn the "fits your priority" highlight. */
const MATCH_COUNT = 2;

/** The futures to highlight for a priority — a subset of the six, always. */
export function priorityMatches(
  priority: Priority,
  analysis: DeviceAnalysis,
): NextLifePath[] {
  if (priority === "effort") {
    return NEXT_LIFE_PATHS.filter((path) => EFFORT_TIER[path] === 1);
  }
  return rankPriorities(priority, analysis).slice(0, MATCH_COUNT);
}
