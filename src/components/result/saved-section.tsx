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
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-sm leading-relaxed text-muted">
            Nothing in this photo cleared the bar for a specific opportunity —
            no claim is made that the image cannot support.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((o) => (
          <article
            key={o.id}
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors duration-300 hover:border-lime/30"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-lime/10 text-lime">
                <Lightbulb className="size-4" />
              </span>
              <h3 className="text-[15px] font-medium text-bone">{o.title}</h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {o.detail}
            </p>
            <p className="label-mono mt-4 text-mint/70">{o.evidence}</p>
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
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-300" />
            <h3 className="text-[15px] font-medium text-amber-200">
              Handle with care
            </h3>
          </div>
          <ul className="mt-3 space-y-2.5">
            {cautions.map((note) => (
              <li key={note.id} className="text-sm leading-relaxed">
                <span className="text-amber-100/90">{note.observed}</span>
                <p className="mt-0.5 text-amber-100/70">{note.guidance}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The honest boundary — always present, same weight as the cards. */}
      <article className="rounded-2xl border border-dashed border-white/20 bg-white/[0.01] p-5 md:col-span-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-muted">
            <SearchCheck className="size-4" />
          </span>
          <h3 className="text-[15px] font-medium text-bone">
            Requires physical inspection
          </h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          One external photo cannot show these, so ReLoop makes no claim about
          them — a hands-on inspection is required:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {REQUIRES_INSPECTION.map((entry) => (
            <li key={entry.id} className="text-sm leading-relaxed">
              <span className="text-bone/90">{entry.label}</span>
              <p className="mt-0.5 text-xs text-muted/80">{entry.why}</p>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
