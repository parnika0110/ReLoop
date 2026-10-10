"use client";

/**
 * DEVICE DNA — the five measured attributes as a read-out of what remains,
 * not a dashboard.
 *
 * Visual language: a single strand with one node per attribute — label,
 * plain-English gloss, measured value. The interpretation below only renders
 * when the engine's own recommendation supports it (src/lib/potential).
 *
 * Bars carry their final width inline and animate *towards* it, so a page
 * whose animations never run still shows the truth (same contract as the
 * score ring and the breakdown bars).
 */
import type { CSSProperties } from "react";
import { dnaInsight } from "@/lib/potential";
import type { Recommendation, ReLoopScore } from "@/types/score";

const SHORT_LABELS: Record<ReLoopScore["contributions"][number]["key"], string> = {
  condition: "Condition",
  repairability: "Repairability",
  reusePotential: "Reuse",
  resalePotential: "Resale",
  materialRecoveryPotential: "Recovery",
};

const GLOSSES: Record<ReLoopScore["contributions"][number]["key"], string> = {
  condition: "How intact it looks today",
  repairability: "How economically fixable it is",
  reusePotential: "Ready to serve another user",
  resalePotential: "What the market still pays",
  materialRecoveryPotential: "Materials worth recovering",
};

export function DeviceDna({
  score,
  recommendation,
}: {
  score: ReLoopScore;
  recommendation: Recommendation;
}) {
  const insight = dnaInsight(score, recommendation);

  return (
    <div>
      <ul className="relative">
        {score.contributions.map((c, i) => (
          <li key={c.key} className="relative flex gap-4 pb-7 last:pb-0">
            {/* Connector to the next node — the strand */}
            {i < score.contributions.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[5px] top-4 bottom-0 w-px bg-graphite/20"
              />
            )}
            {/* Node */}
            <span
              aria-hidden
              className="relative z-10 mt-1 flex size-3 shrink-0 items-center justify-center rounded-full bg-paper ring-1 ring-graphite/30"
            >
              <span
                className={`size-1.5 rounded-full ${c.value >= 50 ? "bg-vermilion" : "bg-stone"}`}
              />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[17px] font-medium text-ink">
                    {SHORT_LABELS[c.key]}
                    <span className="ml-2 hidden text-sm font-normal text-stone sm:inline">
                      {GLOSSES[c.key]}
                    </span>
                  </p>
                  <p className="text-sm text-stone sm:hidden">
                    {GLOSSES[c.key]}
                  </p>
                </div>
                <span className="display shrink-0 text-3xl tabular-nums font-medium text-ink">
                  {c.value}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-graphite/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-vermilion to-vermilion/70"
                  style={
                    {
                      width: `${c.value}%`,
                      "--attribute-bar-from": "0%",
                      "--attribute-bar-to": `${c.value}%`,
                      animation: `attribute-bar-in 900ms ease-out ${i * 110}ms both`,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {insight && (
        <div className="mt-8 rounded-2xl border border-graphite/20 bg-secondary-paper/70 p-6 shadow-2xs">
          <p className="display text-[clamp(1.35rem,3vw,1.75rem)] font-medium text-ink">
            {insight.statement}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone">
            {insight.detail}
          </p>
        </div>
      )}
    </div>
  );
}
