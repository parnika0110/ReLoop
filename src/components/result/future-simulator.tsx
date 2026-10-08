"use client";

/**
 * "Compare its futures" — the differentiating section.
 * Runs the REAL deterministic impact estimator (src/engine/impact) in the
 * browser against the scan's actual analysis: pick any of the six pathways,
 * see its potential life extension / waste avoided / value retained.
 * All outputs labelled as estimates; no fabricated precision.
 */
import { useMemo, useState } from "react";
import {
  Hammer,
  Gift,
  Recycle,
  RefreshCw,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { estimateImpact } from "@/engine/impact";
import { PATHWAY_PROFILE } from "@/engine/impact-config";
import { cn } from "@/lib/utils";
import type { DeviceAnalysis } from "@/types/analysis";
import { NEXT_LIFE_PATHS, type NextLifePath } from "@/types/score";

const PATHWAY_META: Record<
  NextLifePath,
  { label: string; icon: LucideIcon; blurb: string }
> = {
  repair: {
    label: "Repair",
    icon: Wrench,
    blurb: "Fix the fault and keep it running.",
  },
  refurbish: {
    label: "Refurbish",
    icon: Hammer,
    blurb: "Restore to like-new, then pass it on.",
  },
  reuse: {
    label: "Reuse",
    icon: RefreshCw,
    blurb: "Straight into another pair of hands.",
  },
  donate: {
    label: "Donate",
    icon: Gift,
    blurb: "Give it to someone who needs it.",
  },
  resell: {
    label: "Resell",
    icon: Tag,
    blurb: "Sell it while the market still pays.",
  },
  recycle: {
    label: "Recycle",
    icon: Recycle,
    blurb: "Recover materials, end its service life.",
  },
};

export function FutureSimulator({
  analysis,
  recommendedPath,
}: {
  analysis: DeviceAnalysis;
  recommendedPath: NextLifePath;
}) {
  const [selected, setSelected] = useState<NextLifePath>(recommendedPath);

  const estimates = useMemo(
    () => estimateImpact(analysis, selected),
    [analysis, selected],
  );

  const staysInUse = PATHWAY_PROFILE[selected].keepsDeviceInUse;

  return (
    <div>
      {/* Sticky segmented selector on mobile; a wrapping pill row from sm up.
          top-[69px] clears the 69px sticky app header, so the pills park
          directly beneath it instead of slipping under it. */}
      <div className="flex flex-wrap gap-2 max-sm:sticky max-sm:top-[69px] max-sm:z-10 max-sm:-mx-5 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:bg-ink max-sm:px-5 max-sm:py-3 max-sm:shadow-[0_1px_0_0_rgba(255,255,255,0.06)] max-sm:[scrollbar-width:none]">
        {NEXT_LIFE_PATHS.map((path) => {
          const meta = PATHWAY_META[path];
          const Icon = meta.icon;
          const active = selected === path;
          return (
            <button
              key={path}
              type="button"
              onClick={() => setSelected(path)}
              aria-pressed={active}
              className={cn(
                "group flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all duration-200 max-sm:shrink-0",
                active
                  ? "border-lime bg-lime text-ink shadow-[0_0_28px_-10px_var(--color-lime)]"
                  : "border-white/12 bg-white/[0.03] text-muted hover:border-lime/40 hover:text-bone",
              )}
            >
              <Icon className="size-4" />
              {meta.label}
              {path === recommendedPath && (
                <span
                  className={cn(
                    "label-mono rounded-full px-1.5 py-0.5 text-[10px] tracking-[0.1em]",
                    active
                      ? "bg-ink/15 text-ink"
                      : "bg-lime/15 text-lime",
                  )}
                >
                  Recommended
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-muted">
        {PATHWAY_META[selected].blurb}
      </p>

      {/* Re-runs the fade when the scenario changes — subtle, once, cheap. */}
      {/* Snap-scroll carousel on mobile; three columns from sm up. */}
      <div
        key={selected}
        className="mt-5 grid gap-3 animate-fade-up sm:grid-cols-3 max-sm:flex max-sm:overflow-x-auto max-sm:snap-x max-sm:snap-mandatory"
      >
        {estimates.map((e) => (
          <div
            key={e.metricId}
            className="rounded-xl border border-white/10 bg-mint-deep/40 p-4 transition-colors duration-300 hover:border-lime/25 max-sm:w-[82%] max-sm:shrink-0 max-sm:snap-center"
          >
            <p className="label-mono text-lime">{e.label}</p>
            <p className="mt-2 display text-3xl text-bone tabular-nums">
              {e.value}
              <span className="ml-1 text-base font-normal text-muted">
                {e.unit}
              </span>
            </p>
            {e.range && (
              <p className="mt-1 text-xs text-muted">
                likely {e.range.low}–{e.range.high} {e.unit}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted/80">
        <span className="label-mono mt-0.5 shrink-0 text-mint/80">
          Circularity
        </span>
        {staysInUse
          ? "This path keeps the device in use — no new device has to be manufactured yet."
          : "This path ends the device's service life; its materials re-enter the supply chain instead of being lost."}
      </p>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted/80">
        <span className="label-mono mt-0.5 shrink-0 text-amber-300/90">
          Estimate
        </span>
        Model-derived from category assumptions and this device&apos;s measured
        attributes — not measured facts. Assumptions:{" "}
        {estimates[0]?.assumptions
          .filter((a) => a.includes("Base extension") || a.includes("Category"))
          .join(" ") ?? ""}
      </p>
    </div>
  );
}
