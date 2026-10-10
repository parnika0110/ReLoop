"use client";

/**
 * "WHAT CAN STILL BE SAVED?" — the recovery-opportunities section.
 *
 * Every card is produced by src/lib/potential from what Nova could actually
 * see: the five measured attributes and the observed visible issues. The
 * section shows its own limits with the same prominence as its claims:
 *
 *  - evidence line on every card (the observed issue or measured values);
 *  - safety notes quote the observed defect verbatim;
 *  - REQUIRES_INSPECTION always renders — components a photo structurally
 *    cannot show are named as unknown, never guessed.
 */
import { AlertTriangle, Lightbulb, SearchCheck } from "lucide-react";
import {
  REQUIRES_INSPECTION,
  recoveryOpportunities,
  safetyNotes,
} from "@/lib/potential";
import { Badge } from "@/components/ui/badge";
import type { DeviceAnalysis } from "@/types/analysis";

export function SavedSection({ analysis }: { analysis: DeviceAnalysis }) {
  const opportunities = recoveryOpportunities(analysis);
  const cautions = safetyNotes(analysis);

  return (
    <div className="space-y-4">
      {opportunities.length === 0 && (
        <div className="rounded-2xl border border-graphite/15 bg-white/70 p-5 shadow-2xs">
          <p className="text-sm leading-relaxed text-stone">
            Nothing in this photo cleared the bar for a specific opportunity —
            no claim is made that the image cannot support.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((o) => (
          <article
            key={o.id}
            className="flex flex-col rounded-2xl border border-graphite/15 bg-white/80 p-6 shadow-2xs transition-colors duration-300 hover:border-graphite/40"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-vermilion/10 text-vermilion">
                <Lightbulb className="size-4" />
              </span>
              <h3 className="text-[15px] font-medium text-ink">{o.title}</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-stone">
              {o.detail}
            </p>
            <p className="label-mono mt-4 text-xs text-stone font-mono">{o.evidence}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {o.paths.map((path) => (
                <Badge key={path} variant="neutral">
                  {path}
                </Badge>
              ))}
            </div>
          </article>
        ))}
      </div>

      {cautions.length > 0 && (
        <div className="rounded-2xl border border-amber-600/30 bg-amber-500/[0.08] p-5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-700" />
            <h3 className="text-[15px] font-medium text-amber-900">
              Handle with care
            </h3>
          </div>
          <ul className="mt-3 space-y-2.5">
            {cautions.map((note) => (
              <li key={note.id} className="text-sm leading-relaxed">
                <span className="font-medium text-amber-950">{note.observed}</span>
                <p className="mt-0.5 text-amber-900/80">{note.guidance}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The honest boundary — always present, same weight as the cards. */}
      <article className="rounded-2xl border border-dashed border-graphite/25 bg-secondary-paper/40 p-6 md:col-span-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-graphite/20 bg-white text-stone">
            <SearchCheck className="size-4" />
          </span>
          <h3 className="text-[15px] font-medium text-ink">
            Requires physical inspection
          </h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone">
          One external photo cannot show these, so ReLoop makes no claim about
          them — a hands-on inspection is required:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {REQUIRES_INSPECTION.map((entry) => (
            <li key={entry.id} className="text-sm leading-relaxed">
              <span className="font-medium text-ink">{entry.label}</span>
              <p className="mt-0.5 text-xs text-stone">{entry.why}</p>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
