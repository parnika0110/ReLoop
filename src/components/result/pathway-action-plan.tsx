/**
 * Pathway Action Plan — personalized checklist powered by action-plan.ts.
 *
 * Renders the structured action templates for the recommended pathway,
 * with local-storage backed checkbox progress via passport.ts.
 * Also shows action templates for alternative pathways in a collapsed state.
 *
 * No fabricated partners or marketplace links.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  RefreshCw,
  Users,
  Gift,
  Tag,
  Recycle,
  CheckCircle2,
  Circle,
  ChevronDown,
} from "lucide-react";
import type { NextLifePath } from "@/types/score";
import { NEXT_LIFE_PATHS } from "@/types/score";
import {
  getActionPlanForPathway,
  type ActionPlanItem,
} from "@/lib/action-plan";
import { togglePassportAction } from "@/lib/passport";

const PATHWAY_ICONS: Record<NextLifePath, React.ComponentType<{ className?: string }>> = {
  repair: Wrench,
  refurbish: RefreshCw,
  reuse: Users,
  donate: Gift,
  resell: Tag,
  recycle: Recycle,
};

const PATHWAY_LABELS: Record<NextLifePath, string> = {
  repair: "Repair",
  refurbish: "Refurbish",
  reuse: "Reuse",
  donate: "Donate",
  resell: "Resell",
  recycle: "Recycle",
};

const CATEGORY_LABELS: Record<ActionPlanItem["category"], string> = {
  prepare: "Prepare",
  action: "Take Action",
  verify: "Verify",
};

interface PathwayActionPlanProps {
  scanId: string;
  recommendedPathway: NextLifePath;
  initialCompletedActions?: string[];
}

function ActionChecklist({
  scanId,
  pathway,
  items,
  completedIds,
  onToggle,
}: {
  scanId: string;
  pathway: NextLifePath;
  items: ActionPlanItem[];
  completedIds: Set<string>;
  onToggle: (actionId: string) => void;
}) {
  const Icon = PATHWAY_ICONS[pathway];
  const categories = ["prepare", "action", "verify"] as const;

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat}>
            <p className="label-mono mb-2 text-[10px] font-medium uppercase tracking-wider text-stone">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="space-y-2">
              {catItems.map((item) => {
                const done = completedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggle(item.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                      done
                        ? "border-emerald-500/20 bg-emerald-50/40"
                        : "border-graphite/15 bg-white/70 hover:border-graphite/30"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-stone/50" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          done
                            ? "text-emerald-800 line-through decoration-emerald-400/50"
                            : "text-ink"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-stone">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PathwayActionPlan({
  scanId,
  recommendedPathway,
  initialCompletedActions = [],
}: PathwayActionPlanProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(initialCompletedActions)
  );
  const [expandedAlt, setExpandedAlt] = useState<NextLifePath | null>(null);

  const handleToggle = useCallback(
    (actionId: string) => {
      togglePassportAction(scanId, actionId);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(actionId)) {
          next.delete(actionId);
        } else {
          next.add(actionId);
        }
        return next;
      });
    },
    [scanId]
  );

  const primaryItems = getActionPlanForPathway(recommendedPathway);
  const PrimaryIcon = PATHWAY_ICONS[recommendedPathway];
  const completedCount = primaryItems.filter((i) =>
    completedIds.has(i.id)
  ).length;

  const alternativePathways = NEXT_LIFE_PATHS.filter(
    (p) => p !== recommendedPathway
  );

  return (
    <div className="space-y-6">
      {/* Primary recommended pathway */}
      <div className="rounded-2xl border border-vermilion/20 bg-white/80 p-5 shadow-2xs sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-vermilion/10 text-vermilion">
              <PrimaryIcon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                {PATHWAY_LABELS[recommendedPathway]} — Recommended Action Plan
              </p>
              <p className="text-xs text-stone">
                {completedCount}/{primaryItems.length} steps completed
              </p>
            </div>
          </div>
          {/* Progress ring */}
          {primaryItems.length > 0 && (
            <div className="flex size-10 items-center justify-center">
              <svg className="size-10 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-graphite/10"
                  d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-vermilion transition-all duration-500"
                  d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(completedCount / primaryItems.length) * 97.5} 97.5`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
        <ActionChecklist
          scanId={scanId}
          pathway={recommendedPathway}
          items={primaryItems}
          completedIds={completedIds}
          onToggle={handleToggle}
        />
      </div>

      {/* Alternative pathways (collapsed) */}
      <div className="space-y-2">
        <p className="label-mono text-xs font-medium text-stone">
          Other pathways
        </p>
        {alternativePathways.map((pathway) => {
          const AltIcon = PATHWAY_ICONS[pathway];
          const altItems = getActionPlanForPathway(pathway);
          const isExpanded = expandedAlt === pathway;

          return (
            <details
              key={pathway}
              open={isExpanded}
              onToggle={(e) => {
                const open = (e.target as HTMLDetailsElement).open;
                setExpandedAlt(open ? pathway : null);
              }}
              className="group rounded-xl border border-graphite/15 bg-white/60 shadow-2xs transition-colors hover:border-graphite/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-secondary-paper/60 text-stone group-open:text-vermilion">
                    <AltIcon className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {PATHWAY_LABELS[pathway]}
                  </span>
                  <span className="label-mono text-[10px] text-stone">
                    {altItems.length} steps
                  </span>
                </span>
                <ChevronDown className="size-3.5 text-stone transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="border-t border-graphite/10 p-4">
                <ActionChecklist
                  scanId={scanId}
                  pathway={pathway}
                  items={altItems}
                  completedIds={completedIds}
                  onToggle={handleToggle}
                />
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
