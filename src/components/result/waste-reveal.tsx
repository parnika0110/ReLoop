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
    <section aria-labelledby="reveal-heading" className="pt-10 md:pt-16">
      <div className="grid gap-10 md:grid-cols-[1.05fr,0.95fr] md:items-center md:gap-12">
        {/* ── The message ──────────────────────────────────────────── */}
        <div className="min-w-0 animate-fade-up">
          <p className="label-mono text-lime">
            Scan {scanId.slice(0, 8)} — analysis complete
          </p>

          <h1
            id="reveal-heading"
            className="display mt-5 text-[clamp(2.6rem,7.5vw,5rem)] text-bone animate-reveal-wipe"
          >
            Your device isn’t{" "}
            <span className="text-lime">waste</span> yet.
          </h1>

          <p className="display mt-4 text-[clamp(1.4rem,3.6vw,2.2rem)] text-bone/65 animate-reveal-wipe">
            {revealSubhead(recommendation)}
          </p>

          {/* Identity — the device this is about */}
          <div className="mt-8 min-w-0">
            <p className="display truncate text-2xl text-bone md:text-3xl">
              {deviceName}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{analysis.deviceType}</Badge>
              <Badge variant="mint">confidence {analysis.confidence}/100</Badge>
              {isMock && <Badge variant="neutral">mock analysis</Badge>}
              <span className="label-mono text-muted/60">{date}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
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
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted"
                  >
                    {issue.label}
                    <span className="text-muted/50"> · {issue.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Supporting evidence: the score, deliberately secondary */}
          <div className="mt-8 flex items-center gap-5 rounded-2xl border border-white/10 bg-charcoal/60 p-4 backdrop-blur-sm">
            <ScoreRing value={score.overall} size={132} />
            <div className="min-w-0">
              <p className="label-mono text-muted">Next Life Score</p>
              <p className="display mt-1.5 truncate text-3xl text-bone">
                {recommendation.headline}
              </p>
              <p className="mt-1 text-sm text-muted">Best next life</p>
            </div>
          </div>

          <a
            href="#dna"
            className="mt-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-bone"
          >
            What’s left
            <ArrowDown className="size-4 text-lime" />
          </a>
        </div>

        {/* ── The device ───────────────────────────────────────────── */}
        <figure className="relative min-w-0 animate-fade-up">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-[36px] bg-lime/[0.09] blur-3xl"
          />
          <div className="relative overflow-hidden rounded-3xl border border-lime/25 bg-charcoal/80">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned/local URL
              <img
                src={imageUrl}
                alt={`Uploaded ${analysis.deviceType} — the device this result is about`}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 text-muted">
                <ScanLine className="size-8 text-lime/70" />
                <span className="label-mono">Photo unavailable</span>
              </div>
            )}
            <figcaption className="label-mono absolute bottom-0 left-0 right-0 bg-ink/75 px-4 py-2.5 text-muted backdrop-blur-sm">
              Your device — uploaded {date}
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
