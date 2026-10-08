"use client";

/**
 * THE RESULT PAGE — the hero screen of ReLoop.
 *
 * Fetches the real scan through the API abstraction (never hardcoded data),
 * then presents the pipeline's output in the required hierarchy:
 *
 *   DEVICE → NEXT LIFE SCORE → BEST NEXT LIFE → WHY → ATTRIBUTE BREAKDOWN
 *   → IMPACT → COMPARE FUTURES → ACTION
 *
 * Factual analysis (AI observations) and estimates (assumption-based impact)
 * are visually separated and individually labelled.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  Cpu,
  RotateCw,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { getScan, ApiError } from "@/lib/api/client";
import { ScoreRing } from "@/components/result/score-ring";
import { AttributeBreakdown } from "@/components/result/attribute-breakdown";
import { FutureSimulator } from "@/components/result/future-simulator";
import { ActionSection } from "@/components/result/action-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScanFetchResponse } from "@/types/scan";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: ScanFetchResponse }
  | { phase: "error"; message: string; kind: string };

function SectionHeading({
  step,
  title,
  icon: Icon,
  /** The identity section is this page's top-level heading; the rest are h2. */
  level: Level = "h2",
}: {
  step: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  level?: "h1" | "h2";
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-lime">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="label-mono text-muted/70">{step}</p>
        <Level className="text-xl font-medium tracking-tight text-bone md:text-2xl">
          {title}
        </Level>
      </div>
    </div>
  );
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [scanId, setScanId] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setState({ phase: "loading" });
    try {
      const data = await getScan(id);
      setState({ phase: "ready", data });
    } catch (e) {
      setState({
        phase: "error",
        kind: e instanceof ApiError ? e.kind : "aws_failure",
        message:
          e instanceof ApiError
            ? e.message
            : "Something went wrong loading this result.",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void params.then(({ scanId: id }) => {
      if (cancelled) return;
      setScanId(id);

      void load(id);
    });
    return () => {
      cancelled = true;
    };
  }, [params, load]);

  // Client component, so Next can't export metadata for this route — give the
  // tab a real title once a result exists. Declared with the other hooks: it
  // must run on every render, not only after the early returns below. Any
  // later client-side navigation overwrites it with that route's metadata.
  useEffect(() => {
    if (state.phase !== "ready") return;
    const { scan } = state.data;
    if (scan.status !== "complete" || !scan.analysis || !scan.score) return;
    const name =
      [scan.analysis.brand, scan.analysis.model].filter(Boolean).join(" ") ||
      scan.analysis.deviceType;
    document.title = `${name} — ${scan.score.overall} Next Life Score`;
  }, [state]);

  // --- Loading --------------------------------------------------------------
  if (state.phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5">
        <RotateCw className="size-6 animate-spin text-lime" />
        <p className="label-mono text-muted">Loading result</p>
      </div>
    );
  }

  // --- Error / not found -----------------------------------------------------
  if (state.phase === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/[0.07]">
          <AlertTriangle className="size-6 text-amber-300" />
        </div>
        <h1 className="display mt-6 text-3xl text-bone">
          {state.kind === "not_found" ? "Scan not found" : "Could not load result"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          {state.message}
        </p>
        {/* Transient load failures are retryable in place; a missing scan is
            not — offering retry there would loop on the same 404. */}
        {state.kind !== "not_found" && scanId && (
          <Button className="mt-8" onClick={() => void load(scanId)}>
            <RotateCw className="size-4" />
            Try again
          </Button>
        )}
        <Link href="/scan" className="mt-8">
          <Button>
            Scan a device
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const { scan, imageUrl } = state.data;

  // A scan that failed analysis shows its honest failure — no fabricated result.
  if (scan.status !== "complete" || !scan.score || !scan.recommendation || !scan.analysis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/[0.07]">
          <ScanLine className="size-6 text-amber-300" />
        </div>
        <h1 className="display mt-6 text-3xl text-bone">
          {scan.status === "insufficient_information"
            ? "Not enough information"
            : "Analysis incomplete"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          {scan.error?.message ??
            "This scan did not complete, so no result exists. Nothing was fabricated."}
        </p>
        <Link href="/scan" className="mt-8">
          <Button>
            Try another photo
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const { analysis, score, recommendation, engine, impactEstimates } = scan;
  const deviceName =
    [analysis.brand, analysis.model].filter(Boolean).join(" ") ||
    analysis.deviceType;

  return (
    // overflow-x-clip (not hidden) — `hidden` on one axis makes the other
    // computed `auto`, which turns this wrapper into a scroll container and
    // silently kills `position: sticky` for the header and the mobile
    // simulator selector. `clip` contains the ambient glow without that.
    <div className="relative min-h-screen overflow-x-clip">
      {/* Ambient glow — restrained */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[460px] w-[460px] rounded-full bg-lime/[0.07] blur-[130px] animate-pulse-glow"
      />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="label-mono text-bone">
            RE<span className="text-lime">LOOP</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="label-mono hidden text-muted/60 sm:inline">
              {scan.scanId.slice(0, 8)}
            </span>
            <Link href="/scan">
              <Button variant="outline" size="sm">
                <ScanLine className="size-3.5" />
                New scan
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 md:px-8">
        {/* ── 1. DEVICE ─────────────────────────────────────────────── */}
        <section className="animate-fade-up pt-10 md:pt-14">
          <SectionHeading
            step="01 — Identity"
            title="Device"
            icon={Cpu}
            level="h1"
          />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {imageUrl && (
              <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:w-56">
                {/* eslint-disable-next-line @next/next/no-img-element -- presigned/local URL */}
                <img
                  src={imageUrl}
                  alt={`Uploaded ${analysis.deviceType}`}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{analysis.deviceType}</Badge>
                <Badge variant="mint">
                  confidence {analysis.confidence}/100
                </Badge>
                {scan.analysisSource?.provider === "mock" && (
                  <Badge variant="neutral">mock analysis</Badge>
                )}
              </div>
              <p className="display mt-3 truncate text-3xl text-bone md:text-4xl">
                {deviceName}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                <span>
                  est. age{" "}
                  {analysis.estimatedAge !== null
                    ? `${analysis.estimatedAge} yrs`
                    : "unknown"}
                </span>
                <span>
                  {new Date(scan.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
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
          </div>
        </section>

        {/* ── 2+3. SCORE + BEST NEXT LIFE ───────────────────────────── */}
        <section className="animate-fade-up pt-14 md:pt-20">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-charcoal/70 backdrop-blur-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_15%_0%,rgba(201,242,77,0.06),transparent_60%)]"
            />
            <div className="relative flex flex-col items-center gap-8 p-7 md:flex-row md:gap-12 md:p-10">
              {/* Score ring */}
              <div className="text-center">
                <ScoreRing value={score.overall} size={230} />
                <p className="label-mono mt-4 text-muted">Next Life Score</p>
                <p className="label-mono mt-1 text-muted/50">
                  {score.engineVersion}
                </p>
              </div>

              {/* Recommendation */}
              <div className="flex-1 text-left">
                <p className="label-mono text-lime">Best next life</p>
                <p className="display mt-2 text-[clamp(2.5rem,7vw,4.5rem)] text-bone">
                  {recommendation.headline}
                </p>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
                  {engine?.reasoning ?? recommendation.rationale}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                  <Badge variant="neutral">
                    rule: {recommendation.matchedRuleId}
                  </Badge>
                  <Badge variant="mint">
                    confidence {engine?.confidence ?? analysis.confidence}/100
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4+5. WHY + ATTRIBUTE BREAKDOWN ────────────────────────── */}
        <section className="animate-fade-up pt-14 md:pt-20">
          <div className="grid gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <SectionHeading step="03 — Why" title="Why this path" icon={Sparkles} />
              <p className="text-[15px] leading-relaxed text-muted">
                {recommendation.rationale}
              </p>

              {engine && engine.contributingFactors.length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:items-start lg:grid-cols-1 xl:grid-cols-2">
                  <p className="label-mono text-muted/70 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    Contributing factors
                  </p>
                  {engine.contributingFactors.slice(0, 3).map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
                    >
                      <span className="text-sm text-bone/90">{f.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted">
                          {f.value}
                        </span>
                        <span
                          className={`label-mono ${
                            f.effect === "lift" ? "text-lime" : "text-amber-300/80"
                          }`}
                        >
                          {f.effect === "lift" ? "↑" : "↓"} {f.contribution}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-xl border border-white/[0.08] bg-mint-deep/40 p-4">
                <p className="label-mono text-mint">Measured facts</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  The values to the right come from AI observation of your
                  photo — factual attributes of this device, not predictions.
                </p>
              </div>
            </div>

            <div>
              <SectionHeading
                step="04 — Breakdown"
                title="Attribute breakdown"
                icon={Activity}
              />
              <AttributeBreakdown score={score} />
              <p className="mt-5 text-xs leading-relaxed text-muted/70">
                Each attribute × its weight contributes to the Next Life
                Score. Weights: condition 25%, repairability 20%, reuse 25%,
                resale 15%, material recovery 15%.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. IMPACT ─────────────────────────────────────────────── */}
        <section className="animate-fade-up pt-14 md:pt-20">
          <SectionHeading step="05 — Impact" title="Estimated impact" icon={Sparkles} />
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-100/80">
              <strong className="font-medium text-amber-200">Estimates, not facts.</strong>{" "}
              These figures are model-derived from category-level assumptions
              (typical device mass and value) and this device&apos;s measured
              attributes. They were not measured for your device.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {impactEstimates?.map((e) => {
              const icon =
                e.metricId === "lifeExtensionMonths"
                  ? CalendarClock
                  : e.metricId === "wasteAvoidedKg"
                    ? Boxes
                    : CircleDollarSign;
              const Icon = icon;
              return (
                <div
                  key={e.metricId}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors duration-300 hover:border-lime/25"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-lime/10 text-lime">
                      <Icon className="size-4" />
                    </span>
                    <span className="label-mono rounded-full border border-amber-400/30 px-2 py-0.5 text-amber-300/90">
                      Estimated
                    </span>
                  </div>
                  <p className="display mt-4 text-4xl text-bone tabular-nums">
                    {e.value}
                    <span className="ml-1.5 text-sm font-normal text-muted">
                      {e.unit}
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm text-muted">{e.label}</p>
                  {e.range && (
                    <p className="mt-2 font-mono text-xs text-muted/60">
                      plausible {e.range.low}–{e.range.high} {e.unit}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {impactEstimates && impactEstimates.length > 0 && (
            <details className="group mt-4 rounded-xl border border-white/[0.08]">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm text-muted [&::-webkit-details-marker]:hidden">
                <span className="label-mono">
                  How these estimates are built
                </span>
                <span className="transition-transform group-open:rotate-90">
                  ›
                </span>
              </summary>
              <div className="space-y-3 border-t border-white/[0.06] p-4 pt-3">
                {impactEstimates.map((e) => (
                  <div key={e.metricId}>
                    <p className="text-sm text-bone/90">{e.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {e.basis}
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {e.assumptions.map((a, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-xs text-muted/70"
                        >
                          <span className="text-lime/50">·</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* ── 6. COMPARE FUTURES ────────────────────────────────────── */}
        <section className="animate-fade-up pt-14 md:pt-20">
          <SectionHeading
            step="06 — Simulator"
            title="Compare its futures"
            icon={RotateCw}
          />
          <p className="-mt-2 mb-6 text-sm text-muted">
            See what each pathway could mean for this device. Estimates update
            live from the same assumptions used above.
          </p>
          <FutureSimulator
            analysis={analysis}
            recommendedPath={recommendation.path}
          />
        </section>

        {/* ── 7. ACTION ─────────────────────────────────────────────── */}
        <section className="animate-fade-up pt-14 md:pt-20">
          <SectionHeading step="07 — Action" title="What to do next" icon={ArrowRight} />
          <ActionSection />
        </section>

        {/* Footer CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-charcoal/60 p-8 text-center">
          <p className="display text-2xl text-bone">
            Give every device a next life.
          </p>
          <Link href="/scan">
            <Button size="lg">
              Scan another device
              <ArrowRight className="size-5" />
            </Button>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-bone"
          >
            <ArrowLeft className="size-3.5" />
            Back home
          </Link>
        </div>
      </main>
    </div>
  );
}
