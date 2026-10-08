"use client";

/**
 * Attribute breakdown — five measured attributes as elegant animated
 * indicators. Values come from the real score contributions (no hardcoding);
 * bars animate once on mount.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ReLoopScore } from "@/types/score";

export function AttributeBreakdown({ score }: { score: ReLoopScore }) {
  const ref = useRef<HTMLDListElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <dl ref={ref} className="space-y-5">
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
                  "h-full rounded-full transition-[width] duration-1000 ease-out",
                  isLift ? "bg-lime" : "bg-mint/70",
                )}
                style={{
                  width: visible ? `${c.value}%` : "0%",
                  transitionDelay: `${i * 110}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
