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
  return (
    <dl className="space-y-5">
      {score.contributions.map((c, i) => {
        const isLift = c.value >= 50;
        return (
          <div key={c.key} className="group">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[15px] text-bone/90">{c.label}</dt>
              <dd className="font-mono text-lg tabular-nums text-bone">
                {c.value}
              </dd>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={cn(
                  "h-full rounded-full",
                  isLift ? "bg-lime" : "bg-mint/70",
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
