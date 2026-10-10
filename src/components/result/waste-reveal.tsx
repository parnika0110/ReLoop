"use client";

/**
 * THE REVEAL — the first screen after a scan.
 *
 * Narrative order: the uploaded device and the message come first, and the
 * Next Life Score sits below as supporting evidence rather than the hero.
 * The headline is the brand moment; the line under it is
 * recommendation-aware so the reveal never promises the device a working
 * life the deterministic engine says it does not have (and never hides the
 * recommendation — that still reads in the score strip below).
 *
 * Motion contract (same as the score ring): the base state of every element
 * is the final state — if the reveal animation never runs (reduced motion,
 * suspended page), the message and the score are still fully on screen.
 */
import { ArrowDown, ScanLine } from "lucide-react";
import { deviceDisplayName } from "@/lib/brand";
import { ScoreRing } from "@/components/result/score-ring";
import { Badge } from "@/components/ui/badge";
import type { DeviceAnalysis } from "@/types/analysis";
import type { Recommendation, ReLoopScore } from "@/types/score";

/**
 * The supporting line under the headline, shaped by the engine's
 * recommendation — a presentation decision only; nothing here feeds back
 * into the engine.
 *
 *  - any working-life path → the device's possible next use, phrased as a
 *    question (no promise of success);
 *  - recycle → recoverable material value: the MATERIALS get another life,
 *    never implying the device itself stays in use.
 */
export function revealSubhead(recommendation: Recommendation): string {
  if (recommendation.path === "recycle") {
    return "Its materials still have another life.";
  }
  return "What could it still become?";
}

export function WasteReveal({
  scanId,
  createdAt,
  imageUrl,
  analysis,
  score,
  recommendation,
  isMock,
}: {
  scanId: string;
  createdAt: string;
  imageUrl: string | null;
  analysis: DeviceAnalysis;
  score: ReLoopScore;
  recommendation: Recommendation;
  isMock: boolean;
}) {
  const deviceName = deviceDisplayName(analysis);
  const date = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section aria-labelledby="reveal-heading" className="pt-8 md:pt-12 pb-2">
      <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center lg:gap-12">
        {/* ── The message & details ─────────────────────────────────── */}
        <div className="min-w-0 animate-fade-up flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-vermilion animate-pulse" />
            <p className="label-mono font-medium text-vermilion">
              Scan {scanId.slice(0, 8)} — analysis complete
            </p>
          </div>

          <h1
            id="reveal-heading"
            className="display mt-3 text-[clamp(2.5rem,6.5vw,4.5rem)] text-ink animate-reveal-wipe uppercase tracking-tighter leading-[0.95]"
          >
            Your device isn’t{" "}
            <span className="text-vermilion">waste</span> yet.
          </h1>

          <p className="mt-3 text-[clamp(1.15rem,2.4vw,1.65rem)] font-light text-stone leading-snug animate-reveal-wipe">
            {revealSubhead(recommendation)}
          </p>

          {/* Identity — the device this is about */}
          <div className="mt-6 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="display truncate text-2xl text-ink md:text-3xl font-medium tracking-tight">
                {deviceName}
              </p>
              <span className="font-mono text-sm text-stone">
                est. age{" "}
                {analysis.estimatedAge !== null
                  ? `${analysis.estimatedAge} yrs`
                  : "unknown"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{analysis.deviceType}</Badge>
              <Badge variant="mint">confidence {analysis.confidence}/100</Badge>
              {isMock && <Badge variant="neutral">mock analysis</Badge>}
              <span className="label-mono text-stone ml-1">{date}</span>
            </div>

            {analysis.observedIssues.length > 0 && (
              <ul className="mt-3.5 flex flex-wrap gap-2">
                {analysis.observedIssues.map((issue) => (
                  <li
                    key={issue.id}
                    className="rounded-full border border-graphite/20 bg-white/90 px-3 py-1 text-xs text-stone font-mono shadow-2xs"
                  >
                    {issue.label}
                    <span className="text-stone/60"> · {issue.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Supporting evidence: the score, integrated seamlessly */}
          <div className="mt-6 flex items-center gap-5 rounded-2xl border border-graphite/20 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
            <ScoreRing value={score.overall} size={118} />
            <div className="min-w-0 flex-1">
              <span className="label-mono font-medium text-stone block">Next Life Score</span>
              <p className="display mt-1 truncate text-2xl sm:text-3xl font-medium tracking-tight text-ink">
                {recommendation.headline}
              </p>
              <p className="mt-1 text-xs text-stone label-mono">Best next life</p>
            </div>
          </div>

          <div className="mt-6">
            <a
              href="#dna"
              className="inline-flex items-center gap-2 text-xs label-mono text-stone transition-colors hover:text-ink font-medium"
            >
              Explore Device DNA
              <ArrowDown className="size-3.5 text-vermilion" />
            </a>
          </div>
        </div>

        {/* ── The device photo ─────────────────────────────────────── */}
        <figure className="relative min-w-0 animate-fade-up">
          <div className="relative overflow-hidden rounded-2xl border border-graphite/20 bg-white shadow-sm">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned/local URL
              <img
                src={imageUrl}
                alt={`Uploaded ${analysis.deviceType} — the device this result is about`}
                className="aspect-[4/3] w-full object-cover max-h-[460px]"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full max-h-[460px] flex-col items-center justify-center gap-3 text-stone bg-secondary-paper/40">
                <ScanLine className="size-8 text-vermilion/70" />
                <span className="label-mono">Photo unavailable</span>
              </div>
            )}
            <figcaption className="label-mono absolute bottom-0 left-0 right-0 bg-ink/90 px-4 py-2.5 text-paper backdrop-blur-sm flex items-center justify-between text-[11px]">
              <span>Uploaded device photo</span>
              <span className="text-stone">{date}</span>
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
