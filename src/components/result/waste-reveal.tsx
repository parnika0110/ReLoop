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
    <section aria-labelledby="reveal-heading" className="pt-8 md:pt-14">
      <div className="grid gap-10 md:grid-cols-[1.05fr,0.95fr] md:items-center md:gap-12">
        {/* ── The message ──────────────────────────────────────────── */}
        <div className="min-w-0 animate-fade-up">
          <p className="label-mono font-medium text-vermilion">
            Scan {scanId.slice(0, 8)} — analysis complete
          </p>

          <h1
            id="reveal-heading"
            className="display mt-4 text-[clamp(2.6rem,7vw,4.75rem)] text-ink animate-reveal-wipe uppercase tracking-tighter leading-none"
          >
            Your device isn’t{" "}
            <span className="text-vermilion">waste</span> yet.
          </h1>

          <p className="mt-4 text-[clamp(1.2rem,2.8vw,1.8rem)] font-light text-stone animate-reveal-wipe">
            {revealSubhead(recommendation)}
          </p>

          {/* Identity — the device this is about */}
          <div className="mt-8 min-w-0">
            <p className="display truncate text-2xl text-ink md:text-3xl font-medium tracking-tight">
              {deviceName}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{analysis.deviceType}</Badge>
              <Badge variant="mint">confidence {analysis.confidence}/100</Badge>
              {isMock && <Badge variant="neutral">mock analysis</Badge>}
              <span className="label-mono text-stone">{date}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-stone font-mono">
              <span>
                est. age{" "}
                {analysis.estimatedAge !== null
                  ? `${analysis.estimatedAge} yrs`
                  : "unknown"}
              </span>
            </div>
            {analysis.observedIssues.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {analysis.observedIssues.map((issue) => (
                  <li
                    key={issue.id}
                    className="rounded-full border border-graphite/20 bg-white/80 px-3 py-1 text-xs text-stone font-mono"
                  >
                    {issue.label}
                    <span className="text-stone/60"> · {issue.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Supporting evidence: the score, deliberately secondary */}
          <div className="mt-8 flex items-center gap-5 rounded-2xl border border-graphite/15 bg-white/85 p-5 shadow-2xs backdrop-blur-sm">
            <ScoreRing value={score.overall} size={132} />
            <div className="min-w-0">
              <p className="label-mono font-medium text-stone">Next Life Score</p>
              <p className="display mt-1 truncate text-3xl font-medium tracking-tight text-ink">
                {recommendation.headline}
              </p>
              <p className="mt-1 text-xs text-stone label-mono">Best next life</p>
            </div>
          </div>

          <a
            href="#dna"
            className="mt-8 inline-flex items-center gap-2 text-sm text-stone transition-colors hover:text-ink"
          >
            What’s left
            <ArrowDown className="size-4 text-vermilion" />
          </a>
        </div>

        {/* ── The device ───────────────────────────────────────────── */}
        <figure className="relative min-w-0 animate-fade-up">
          <div className="relative overflow-hidden rounded-2xl border border-graphite/20 bg-white shadow-sm">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned/local URL
              <img
                src={imageUrl}
                alt={`Uploaded ${analysis.deviceType} — the device this result is about`}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 text-stone bg-secondary-paper/40">
                <ScanLine className="size-8 text-vermilion/70" />
                <span className="label-mono">Photo unavailable</span>
              </div>
            )}
            <figcaption className="label-mono absolute bottom-0 left-0 right-0 bg-ink/85 px-4 py-2.5 text-paper backdrop-blur-sm">
              Your device — uploaded {date}
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
