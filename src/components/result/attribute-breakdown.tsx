"use client";

/**
 * Attribute breakdown — five measured attributes as elegant animated
 * indicators. Values come from the real score contributions (no hardcoding).
 *
 * Each bar's width is rendered from the value during render; the reveal is a
 * CSS animation with a stagger delay. An IntersectionObserver used to gate the
 * width behind a callback, and a callback that never arrives (frozen or
 * throttled page) left every bar at 0% regardless of the score.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { ReLoopScore } from "@/types/score";

export function AttributeBreakdown({ score }: { score: ReLoopScore }) {
  const maxScore = Math.max(...score.contributions.map((c) => c.value));

  return (
    <dl className="space-y-4">
      {score.contributions.map((c, i) => {
        const isHighest = c.value === maxScore;
        return (
          <div key={c.key} className="group">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[15px] font-medium text-ink flex items-center gap-2">
                {c.label}
                {isHighest && (
                  <span className="label-mono text-[9px] px-1.5 py-0.2 rounded border border-vermilion/30 bg-vermilion/10 text-vermilion font-medium">
                    Leading
                  </span>
                )}
              </dt>
              <dd className="font-mono text-base tabular-nums font-medium text-ink">
                {c.value}
              </dd>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-graphite/15 border border-graphite/10">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isHighest ? "bg-gradient-to-r from-vermilion to-vermilion/85" : "bg-graphite/85",
                )}
                style={
                  {
                    // Final width on the element: correct whether or not the
                    // keyframes below ever run.
                    width: `${c.value}%`,
                    "--attribute-bar-from": "0%",
                    "--attribute-bar-to": `${c.value}%`,
                    animation: `attribute-bar-in 1000ms ease-out ${i * 110}ms both`,
                  } as CSSProperties
                }
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
