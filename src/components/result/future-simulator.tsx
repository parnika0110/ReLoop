"use client";

/**
 * "COMPARE ITS FUTURES" — the signature interaction.
 *
 * Narrative, understood in seconds:
 *
 *   TODAY → YOUR DEVICE → REPAIR/REFURBISH/REUSE/DONATE/RESELL/RECYCLE
 *         → THE RESULTING FUTURE
 *
 * Selecting a future answers: what happens next, what the tradeoff is, why
 * it might be appropriate (grounded in this device's measured attributes),
 * the existing estimated impact/value, and whether it is the engine's
 * recommendation.
 *
 * A user priority (src/lib/priority) may reorder the futures and mark up to
 * two "fits your priority" — presentation only. The engine's recommendation
 * is never recomputed here.
 */
import { useMemo, useState } from "react";
import {
  ArrowDown,
  Cpu,
  Gift,
  Hammer,
  Recycle,
  RefreshCw,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { estimateImpact } from "@/engine/impact";
import { PATHWAY_PROFILE } from "@/engine/impact-config";
import {
  EFFORT_NOTES,
  PRIORITY_OPTIONS,
  priorityMatches,
  rankPriorities,
  type Priority,
} from "@/lib/priority";
import { cn } from "@/lib/utils";
import type { DeviceAnalysis } from "@/types/analysis";
import { NEXT_LIFE_PATHS, type NextLifePath, type Recommendation } from "@/types/score";

interface PathwayMeta {
  label: string;
  icon: LucideIcon;
  /** One-line identity of the future. */
  blurb: string;
  /** What actually happens if this future is chosen. */
  next: string;
  /** The honest tension in this choice. */
  tradeoff: string;
  /** Why it might fit THIS device — measured values only. */
  why: (a: DeviceAnalysis) => string;
}

const PATHWAY_META: Record<NextLifePath, PathwayMeta> = {
  repair: {
    label: "Repair",
    icon: Wrench,
    blurb: "Fix the fault and keep it running.",
    next: "A quote, a fixed part, and the device stays in your hands.",
    tradeoff:
      "Cheapest route back to value — but only while parts and labour cost less than the device is worth.",
    why: (a) =>
      `Repairability ${a.repairability}/100 and condition ${a.condition}/100 — the two numbers that decide whether a fix pays.`,
  },
  refurbish: {
    label: "Refurbish",
    icon: Hammer,
    blurb: "Restore to like-new, then pass it on.",
    next: "A refurbisher services, cleans and restores it — then sells it on.",
    tradeoff:
      "Unlocks value the device doesn't carry yet — at the cost of professional restoration work.",
    why: (a) =>
      `Condition ${a.condition}/100 with resale potential ${a.resalePotential}/100 — the gap restoration would work on.`,
  },
  reuse: {
    label: "Reuse",
    icon: RefreshCw,
    blurb: "Straight into another pair of hands.",
    next: "Erase your data and put it straight back into daily use.",
    tradeoff: "No income and no work: it simply keeps being useful.",
    why: (a) =>
      `Reuse potential ${a.reusePotential}/100 and condition ${a.condition}/100 — how ready it is for the next user.`,
  },
  donate: {
    label: "Donate",
    icon: Gift,
    blurb: "Give it to someone who needs it.",
    next: "Erase your data and give it to a school, charity or community group.",
    tradeoff: "No return for you — the value goes to whoever receives it.",
    why: (a) =>
      `Reuse potential ${a.reusePotential}/100 with resale potential ${a.resalePotential}/100 — useful to a person even when the market won't pay.`,
  },
  resell: {
    label: "Resell",
    icon: Tag,
    blurb: "Sell it while the market still pays.",
    next: "Erase it, photograph the real condition, list it against completed sales.",
    tradeoff: "Cash now — but the market only pays for devices in good shape.",
    why: (a) =>
      `Resale potential ${a.resalePotential}/100 and condition ${a.condition}/100 — what the market still sees.`,
  },
  recycle: {
    label: "Recycle",
    icon: Recycle,
    blurb: "Recover materials, end its service life.",
    next: "Hand it to a certified e-waste recycler — battery out first if you can.",
    tradeoff: "Materials are recovered — and this device never works again.",
    why: (a) =>
      `Material recovery ${a.materialRecoveryPotential}/100 — the value that remains at end of life.`,
  },
};

function FlowArrow() {
  return (
    <div className="flex justify-center py-2" aria-hidden>
      <ArrowDown className="size-4 text-stone/50" />
    </div>
  );
}

export function FutureSimulator({
  analysis,
  recommendation,
  priority,
}: {
  analysis: DeviceAnalysis;
  recommendation: Recommendation;
  priority: Priority | null;
}) {
  const [selected, setSelected] = useState<NextLifePath>(recommendation.path);

  const order = useMemo(
    () =>
      priority ? rankPriorities(priority, analysis) : [...NEXT_LIFE_PATHS],
    [priority, analysis],
  );
  const matches = useMemo(
    () => (priority ? priorityMatches(priority, analysis) : []),
    [priority, analysis],
  );
  const estimates = useMemo(
    () => estimateImpact(analysis, selected),
    [analysis, selected],
  );

  const meta = PATHWAY_META[selected];
  const isRecommended = selected === recommendation.path;
  const priorityLabel = priority
    ? PRIORITY_OPTIONS.find((o) => o.id === priority)?.label
    : null;
  const staysInUse = PATHWAY_PROFILE[selected].keepsDeviceInUse;

  return (
    <div className="rounded-3xl border border-graphite/15 bg-white/70 p-6 md:p-8 shadow-xs">
      {/* ── TODAY ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <span className="label-mono shrink-0 rounded-full border border-graphite/20 bg-white px-3 py-1.5 text-ink font-medium">
          Today
        </span>
        <span className="h-px flex-1 bg-graphite/15" />
        <span className="shrink-0 text-sm text-stone font-mono">One unwanted device</span>
      </div>
      <FlowArrow />

      {/* ── YOUR DEVICE ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-graphite/15 bg-white px-5 py-4 shadow-2xs">
        <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <Cpu className="size-4 shrink-0 text-vermilion" />
          Your {analysis.deviceType}
        </span>
        <span className="label-mono text-stone font-mono">
          condition {analysis.condition}/100 · reuse{" "}
          {analysis.reusePotential}/100
        </span>
      </div>
      <FlowArrow />

      {/* ── SIX FUTURES ───────────────────────────────────────────── */}
      <p className="label-mono mb-3 text-stone font-medium">Six possible futures</p>
      {/* Sticky segmented selector on mobile; a wrapping pill row from sm up.
          top-[69px] clears the 69px sticky app header. */}
      <div className="flex flex-wrap gap-2 max-sm:sticky max-sm:top-[69px] max-sm:z-10 max-sm:-mx-5 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:bg-paper max-sm:px-5 max-sm:py-3 max-sm:border-b max-sm:border-graphite/15 max-sm:[scrollbar-width:none]">
        {order.map((path) => {
          const pathwayMeta = PATHWAY_META[path];
          const Icon = pathwayMeta.icon;
          const active = selected === path;
          const fits = matches.includes(path);
          return (
            <button
              key={path}
              type="button"
              onClick={() => setSelected(path)}
              aria-pressed={active}
              className={cn(
                "group flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200 max-sm:shrink-0",
                active
                  ? "border-graphite bg-ink text-paper shadow-2xs"
                  : "border-graphite/20 bg-white text-ink hover:border-graphite hover:bg-secondary-paper/40",
              )}
            >
              <Icon className={cn("size-4", active ? "text-vermilion" : "text-stone")} />
              {pathwayMeta.label}
              {path === recommendation.path && (
                <span
                  className={cn(
                    "label-mono rounded-full px-1.5 py-0.5 text-[10px] tracking-[0.1em]",
                    active ? "bg-vermilion text-paper" : "bg-vermilion/15 text-vermilion",
                  )}
                >
                  Recommended
                </span>
              )}
              {fits && !active && (
                <span className="label-mono rounded-full bg-secondary-paper border border-graphite/20 px-1.5 py-0.5 text-[10px] tracking-[0.1em] text-ink">
                  Fits
                </span>
              )}
            </button>
          );
        })}
      </div>
      <FlowArrow />

      {/* ── THE RESULTING FUTURE ──────────────────────────────────── */}
      <div key={`${selected}-${priority ?? "none"}`} className="animate-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label-mono font-medium text-vermilion">The resulting future</p>
          <div className="flex flex-wrap gap-2">
            {priorityLabel && matches.includes(selected) && (
              <span className="label-mono rounded-full border border-graphite/20 bg-white px-2.5 py-1 text-ink font-medium shadow-2xs">
                Fits {priorityLabel}
              </span>
            )}
            {isRecommended && (
              <span className="label-mono rounded-full border border-vermilion/30 bg-vermilion/10 px-2.5 py-1 text-vermilion font-medium">
                RELOOP&apos;s pick
              </span>
            )}
          </div>
        </div>

        <p className="display mt-2 text-[clamp(2.25rem,6vw,3.25rem)] font-medium text-ink tracking-tight">
          {meta.label}
        </p>
        <p className="mt-2 text-[15px] text-stone">{meta.blurb}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-graphite/15 bg-white p-5 shadow-2xs">
            <p className="label-mono text-stone font-medium">What happens next</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              {meta.next}
            </p>
          </div>
          <div className="rounded-xl border border-graphite/15 bg-white p-5 shadow-2xs">
            <p className="label-mono text-stone font-medium">The tradeoff</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              {meta.tradeoff}
            </p>
          </div>
          <div className="rounded-xl border border-graphite/15 bg-white p-5 shadow-2xs">
            <p className="label-mono text-stone font-medium">Why it might fit</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              {meta.why(analysis)}
            </p>
          </div>
        </div>

        {isRecommended && (
          <div className="mt-4 rounded-xl border border-vermilion/30 bg-vermilion/[0.06] p-5">
            <p className="label-mono font-medium text-vermilion">Why RELOOP picked it</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">
              {recommendation.rationale}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-graphite/15 bg-white px-4 py-3 shadow-2xs">
          <span className="label-mono font-medium text-stone">Asks of you</span>
          <span className="text-sm text-ink">{EFFORT_NOTES[selected]}</span>
        </div>

        {/* Existing estimator values — labelled, unchanged assumptions. */}
        <div
          className="mt-4 grid gap-3 sm:grid-cols-3 max-sm:flex max-sm:overflow-x-auto max-sm:snap-x max-sm:snap-mandatory"
        >
          {estimates.map((e) => (
            <div
              key={e.metricId}
              className="rounded-xl border border-graphite/15 bg-white p-5 shadow-2xs transition-colors duration-300 hover:border-graphite/40 max-sm:w-[82%] max-sm:shrink-0 max-sm:snap-center"
            >
              <p className="label-mono text-stone font-medium">{e.label}</p>
              <p className="mt-2 display text-3xl font-medium text-ink tabular-nums">
                {e.value}
                <span className="ml-1 text-base font-normal text-stone">
                  {e.unit}
                </span>
              </p>
              {e.range && (
                <p className="mt-1 text-xs text-stone font-mono">
                  likely {e.range.low}–{e.range.high} {e.unit}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-stone">
          <span className="label-mono mt-0.5 shrink-0 text-stone font-medium">
            Circularity
          </span>
          {staysInUse
            ? "This path keeps the device in use — no new device has to be manufactured yet."
            : "This path ends the device's service life; its materials re-enter the supply chain instead of being lost."}
        </p>

        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone">
          <span className="label-mono mt-0.5 shrink-0 text-stone font-medium">
            Estimate
          </span>
          Model-derived from category assumptions and this device&apos;s
          measured attributes — not measured facts. Assumptions:{" "}
          {estimates[0]?.assumptions
            .filter((a) => a.includes("Base extension") || a.includes("Category"))
            .join(" ") ?? ""}
        </p>
      </div>
    </div>
  );
}
