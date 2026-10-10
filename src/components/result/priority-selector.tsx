"use client";

/**
 * "WHAT MATTERS TO YOU?" — the decision control.
 *
 * A pure user preference: it tells the futures section what to highlight.
 * It never feeds the engine — the deterministic recommendation stays
 * authoritative, and the caption below says so.
 */
import { CircleDollarSign, Sprout, X, Zap, type LucideIcon } from "lucide-react";
import { PRIORITY_OPTIONS, type Priority } from "@/lib/priority";
import { cn } from "@/lib/utils";

const ICONS: Record<Priority, LucideIcon> = {
  value: CircleDollarSign,
  impact: Sprout,
  effort: Zap,
};

export function PrioritySelector({
  value,
  onChange,
}: {
  value: Priority | null;
  onChange: (priority: Priority | null) => void;
}) {
  return (
    <div>
      <div
        role="group"
        aria-label="What matters to you"
        className="flex flex-wrap gap-3"
      >
        {PRIORITY_OPTIONS.map((option) => {
          const Icon = ICONS[option.id];
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : option.id)}
              className={cn(
                "group flex min-w-40 flex-col items-start gap-1.5 rounded-2xl border px-5 py-4 text-left transition-all duration-200",
                active
                  ? "border-vermilion bg-white shadow-2xs ring-1 ring-vermilion/30"
                  : "border-graphite/15 bg-white/70 hover:border-graphite/40",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-4",
                    active ? "text-vermilion" : "text-stone group-hover:text-ink",
                  )}
                />
                <span
                  className={cn(
                    "label-mono font-medium",
                    active ? "text-vermilion" : "text-ink",
                  )}
                >
                  {option.label}
                </span>
              </span>
              <span className="text-xs leading-snug text-stone">
                {option.hint}
              </span>
            </button>
          );
        })}

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1.5 self-center rounded-full border border-graphite/20 bg-white px-3.5 py-2 text-xs text-stone transition-colors hover:border-graphite hover:text-ink shadow-2xs"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-stone">
        <span className="label-mono mt-0.5 shrink-0 text-stone font-medium">Note</span>
        Your priority changes what ReLoop highlights below — never the
        engine&apos;s recommendation, which comes from the measured attributes
        alone.
      </p>
    </div>
  );
}
