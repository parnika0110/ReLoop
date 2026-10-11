"use client";

/**
 * THE RESULT PAGE — the hero screen of ReLoop.
 *
 * Fetches the real scan through the API abstraction (never hardcoded data),
 * then tells the story the product is about:
 *
 *   IT'S NOT WASTE YET → WHAT CAN STILL BE SAVED? → DEVICE DNA
 *   → WHAT MATTERS TO YOU? → COMPARE ITS FUTURES → THE WINNING PATH
 *   → WHAT TO DO NEXT → EVIDENCE & ASSUMPTIONS
 *
 * Wow first, evidence second: measured facts, assumptions and provenance all
 * stay below the story, still one scroll away. Factual analysis (AI
 * observations) and estimates (assumption-based impact) are visually
 * separated and individually labelled.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Boxes,
  CalendarClock,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  Dna,
  Download,
  Lightbulb,
  MapPin,
  RotateCw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { getScan, ApiError } from "@/lib/api/client";
import { deviceDisplayName } from "@/lib/brand";
import { classifyAssessmentEvidence } from "@/lib/evidence";
import { resolveImpactEstimates } from "@/engine/impact";
import { saveDeviceToLibrary } from "@/lib/passport";
import { downloadDecisionReceipt } from "@/lib/decision-receipt";
import { WasteReveal } from "@/components/result/waste-reveal";
import { DeviceDna } from "@/components/result/device-dna";
import { SavedSection } from "@/components/result/saved-section";
import { PrioritySelector } from "@/components/result/priority-selector";
import { FutureSimulator } from "@/components/result/future-simulator";
import { EvidenceBreakdown } from "@/components/result/evidence-breakdown";
import { RepairCalculator } from "@/components/result/repair-calculator";
import { PathwayActionPlan } from "@/components/result/pathway-action-plan";
import { DestinationFinder } from "@/components/result/destination-finder";
import { AttributeBreakdown } from "@/components/result/attribute-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Priority } from "@/lib/priority";
import type { ScanFetchResponse } from "@/types/scan";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: ScanFetchResponse }
  | { phase: "error"; message: string; kind: string };

function SectionHeading({
  step,
  title,
  icon: Icon,
  /** The reveal's headline is this page's top-level heading; the rest are h2. */
  level: Level = "h2",
}: {
  step: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  level?: "h1" | "h2";
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-lg border border-graphite/20 bg-white text-vermilion shadow-2xs">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="label-mono font-medium text-vermilion">{step}</p>
        <Level className="text-xl font-medium tracking-tight text-ink md:text-2xl">
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
  /** User preference for the futures section — presentation only. */
  const [priority, setPriority] = useState<Priority | null>(null);

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
    const name = deviceDisplayName(scan.analysis);
    document.title = `${name} — ${scan.score.overall} Next Life Score`;
  }, [state]);

  // Auto-save this scan to the local device library for passport tracking.
  // Declared here (with the other hooks) so the hook count is stable across renders.
  useEffect(() => {
    if (state.phase !== "ready") return;
    const { scan } = state.data;
    if (scan.status !== "complete" || !scan.analysis || !scan.score) return;
    saveDeviceToLibrary(scan);
  }, [state]);

  // --- Loading --------------------------------------------------------------
  if (state.phase === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="landing-theme flex min-h-screen flex-col items-center justify-center gap-5 bg-paper text-ink"
      >
        <RotateCw className="size-6 animate-spin text-vermilion" />
        <p className="label-mono font-medium text-stone">Loading result</p>
      </div>
    );
  }

  // --- Error / not found -----------------------------------------------------
  if (state.phase === "error") {
    return (
      <div className="landing-theme flex min-h-screen flex-col items-center justify-center px-6 text-center bg-paper text-ink">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/[0.08]">
          <AlertTriangle className="size-6 text-amber-700" />
        </div>
        <h1 className="display mt-6 text-3xl text-ink font-medium tracking-tight">
          {state.kind === "not_found" ? "Scan not found" : "Could not load result"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-stone">
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
      <div className="landing-theme flex min-h-screen flex-col items-center justify-center px-6 text-center bg-paper text-ink">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/[0.08]">
          <ScanLine className="size-6 text-amber-700" />
        </div>
        <h1 className="display mt-6 text-3xl text-ink font-medium tracking-tight">
          {scan.status === "insufficient_information"
            ? "Not enough information"
            : "Analysis incomplete"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-stone">
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
  const deviceName = deviceDisplayName(analysis);
  const isMock = scan.analysisSource?.provider === "mock";

  // Classify evidence from the assessment for the evidence breakdown
  const evidence = classifyAssessmentEvidence(analysis);

  // Safely resolve impact estimates: preserve existing INR, safely derive transparent
  // INR for legacy USD scans without relabeling, and handle missing attributes gracefully.
  const currentImpactEstimates = resolveImpactEstimates(
    impactEstimates,
    analysis,
    recommendation.path
  );

  // Extract estimated value for the repair calculator (if available)
  const valueEstimate = currentImpactEstimates?.find(
    (e) => e.metricId === "valueRetainedInr" || e.metricId === "valueRetainedUsd"
  );


  return (
    // overflow-x-clip (not hidden) — `hidden` on one axis makes the other
    // computed `auto`, which turns this wrapper into a scroll container and
    // silently kills `position: sticky` for the header and the mobile
    // simulator selector. `clip` contains any decorative bleed without that.
    <div className="landing-theme relative min-h-screen overflow-x-clip bg-paper text-ink selection:bg-vermilion selection:text-paper">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-graphite/20 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="label-mono text-ink font-medium tracking-wider">
            RE<span className="text-vermilion">LOOP</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="label-mono hidden text-stone font-mono sm:inline">
              {scan.scanId.slice(0, 8)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadDecisionReceipt({
                  scanId: scan.scanId,
                  createdAt: scan.createdAt,
                  analysis,
                  score,
                  recommendation,
                });
              }}
              title="Download Circular Economy Decision Receipt"
            >
              <Download className="size-3.5 text-stone" />
              Receipt
            </Button>
            <Link href="/scan">
              <Button variant="outline" size="sm">
                <ScanLine className="size-3.5 text-vermilion" />
                New scan
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
        {/* ── THE REVEAL ───────────────────────────────────────────── */}
        <WasteReveal
          scanId={scan.scanId}
          createdAt={scan.createdAt}
          imageUrl={imageUrl}
          analysis={analysis}
          score={score}
          recommendation={recommendation}
          isMock={isMock}
        />

        {/* ── 1. DEVICE DNA ────────────────────────────────────────── */}
        <section id="dna" className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
          <SectionHeading step="01 — Understand" title="Device DNA" icon={Dna} />
          <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
            Five measured attributes — the same numbers the engine scored.
            Nothing here is invented; it is what a single photo can honestly
            say about what remains.
          </p>
          <DeviceDna score={score} recommendation={recommendation} />
        </section>

        {/* ── 2. WHAT CAN STILL BE SAVED ───────────────────────────── */}
        <section className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
          <SectionHeading
            step="02 — Reveal"
            title="What can still be saved?"
            icon={Lightbulb}
          />
          <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
            Opportunities grounded in what Nova actually observed — each card
            quotes its evidence, and the limits are shown alongside the claims.
          </p>
          <SavedSection analysis={analysis} />
        </section>

        {/* ── 3. WHAT MATTERS TO YOU? ──────────────────────────────── */}
        <section className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
          <SectionHeading
            step="03 — Decide"
            title="What matters to you?"
            icon={SlidersHorizontal}
          />
          <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
            Pick a priority and ReLoop re-ranks the six futures below to match
            it.
          </p>
          <PrioritySelector value={priority} onChange={setPriority} />
        </section>

        {/* ── 4. COMPARE ITS FUTURES ───────────────────────────────── */}
        <section className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
          <SectionHeading
            step="04 — Compare"
            title="Compare its futures"
            icon={ArrowDown}
          />
          <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
            Today, your device, six possible futures — and what each one
            actually means for it.
          </p>
          <FutureSimulator
            analysis={analysis}
            recommendation={recommendation}
            priority={priority}
          />
        </section>

        {/* ── 5. THE WINNING PATH ──────────────────────────────────── */}
        <section
          id="winning-path"
          className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15"
        >
          <SectionHeading
            step="05 — Recommendation"
            title="The winning path"
            icon={Sparkles}
          />
          <div className="relative overflow-hidden rounded-3xl border border-graphite/20 bg-white p-6 shadow-xs backdrop-blur-sm md:p-9">
            <div className="relative">
              <span className="label-mono font-medium text-vermilion">Best next life</span>
              <p className="display mt-2 text-[clamp(2.25rem,6vw,4rem)] font-medium text-ink tracking-tight">
                {recommendation.headline}
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone">
                {engine?.reasoning ?? recommendation.rationale}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Badge variant="neutral">rule: {recommendation.matchedRuleId}</Badge>
                <Badge variant="mint">
                  confidence {engine?.confidence ?? analysis.confidence}/100
                </Badge>
                <Badge variant="neutral">{score.engineVersion}</Badge>
              </div>

              {engine && engine.contributingFactors.length > 0 && (
                <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:items-start lg:grid-cols-3">
                  <p className="label-mono font-medium text-stone sm:col-span-2 lg:col-span-3">
                    Contributing factors
                  </p>
                  {engine.contributingFactors.slice(0, 3).map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between rounded-xl border border-graphite/15 bg-secondary-paper/40 px-4 py-3 shadow-2xs"
                    >
                      <span className="text-sm font-medium text-ink">{f.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-sm text-stone">
                          {f.value}
                        </span>
                        <span
                          className={`label-mono font-medium ${
                            f.effect === "lift" ? "text-vermilion" : "text-amber-700"
                          }`}
                        >
                          {f.effect === "lift" ? "↑" : "↓"} {f.contribution}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-xl border border-graphite/15 bg-secondary-paper/50 p-4 sm:p-5">
                <p className="label-mono font-medium text-stone">Measured facts</p>
                <p className="mt-1.5 text-xs leading-relaxed text-stone">
                  The values behind this decision come from AI observation of
                  your photo — factual attributes of this device, not
                  predictions. Device: {deviceName}.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. REPAIR VS. REPLACE CALCULATOR ──────────────────── */}
        {recommendation.path === "repair" && (
          <section className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
            <SectionHeading
              step="06 — Calculate"
              title="Repair vs. Replace"
              icon={Calculator}
            />
            <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
              Enter your repair quote to see if repairing is financially
              justified — benchmarked to the consumer electronics 50% rule.
            </p>
            <RepairCalculator
              estimatedCurrentValueInr={
                valueEstimate ? Math.round(valueEstimate.value * 0.6) : undefined
              }
              estimatedPostRepairValueInr={
                valueEstimate ? valueEstimate.value : undefined
              }
            />
          </section>
        )}

        {/* ── 7. ACTION PLAN ──────────────────────────────────────── */}
        <section className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
          <SectionHeading
            step={recommendation.path === "repair" ? "07 — Action" : "06 — Action"}
            title="Your action plan"
            icon={ClipboardList}
          />
          <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
            Step-by-step checklist for {recommendation.headline.toLowerCase()} — check
            off actions as you go. Progress is saved locally.
          </p>
          <PathwayActionPlan
            scanId={scan.scanId}
            recommendedPathway={recommendation.path}
          />
        </section>

        {/* ── 8. DESTINATION FINDER ───────────────────────────────── */}
        <section className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
          <SectionHeading
            step={recommendation.path === "repair" ? "08 — Find" : "07 — Find"}
            title="Where to take it"
            icon={MapPin}
          />
          <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
            Verified recyclers, repair centers, and circular economy partners
            across India — every entity is CPCB-documented.
          </p>
          <DestinationFinder recommendedCategory={recommendation.path} />
        </section>

        {/* ── EVIDENCE (below the story, still one scroll away) ─── */}
        <section className="animate-fade-up pt-12 md:pt-16 border-t border-graphite/15">
          <SectionHeading
            step={recommendation.path === "repair" ? "09 — Evidence" : "08 — Evidence"}
            title="Evidence & assumptions"
            icon={Activity}
          />
          <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-stone">
            Everything the decision rests on — provenance, the scored
            breakdown, and every estimate with its assumptions.
          </p>

          {/* Provenance */}
          <div className="mb-6 rounded-xl border border-graphite/15 bg-white/80 p-4 sm:p-5 shadow-2xs">
            <p className="label-mono font-medium text-stone">Provenance</p>
            <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-xs text-stone">
              <span>
                {isMock
                  ? "provider: mock (local fixture)"
                  : `model: ${scan.analysisSource?.modelId ?? "unknown"}`}
              </span>
              <span>engine: {score.engineVersion}</span>
              <span>confidence: {analysis.confidence}/100</span>
              <span>scan: {scan.scanId.slice(0, 8)}</span>
              <span>
                {new Date(scan.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Evidence Breakdown: Observed / Inferred / Unknown */}
          <div className="mb-8">
            <p className="label-mono mb-4 font-medium text-vermilion">Assessment evidence breakdown</p>
            <EvidenceBreakdown evidence={evidence} />
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="label-mono mb-4 font-medium text-vermilion">Score breakdown</p>
              <AttributeBreakdown score={score} />
              <p className="mt-4 text-xs leading-relaxed text-stone">
                Each attribute × its weight contributes to the Next Life
                Score. Weights: condition 25%, repairability 20%, reuse 25%,
                resale 15%, material recovery 15%.
              </p>
            </div>

            <div>
              <p className="label-mono mb-4 font-medium text-vermilion">
                Estimated impact — {recommendation.headline}
              </p>
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-600/30 bg-amber-500/[0.08] p-3.5 sm:p-4">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <p className="text-xs leading-relaxed text-amber-950">
                  <strong className="font-medium text-amber-900">
                    Estimates, not facts.
                  </strong>{" "}
                  Model-derived from category-level assumptions and this
                  device&apos;s measured attributes — not measured for your
                  device.
                </p>
              </div>

              {/* 3 balanced impact cards: stacked on mobile, 3 equal columns on tablet/desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {currentImpactEstimates?.map((e) => {
                  const Icon =
                    e.metricId === "lifeExtensionMonths"
                      ? CalendarClock
                      : e.metricId === "wasteAvoidedKg"
                        ? Boxes
                        : CircleDollarSign;
                  const isCurrency =
                    e.metricId === "valueRetainedInr" ||
                    e.metricId === "valueRetainedUsd" ||
                    e.unit === "INR" ||
                    e.unit === "USD";
                  return (
                    <div
                      key={e.metricId}
                      className="flex flex-col justify-between rounded-2xl border border-graphite/15 bg-white p-4 sm:p-5 shadow-2xs transition-colors duration-300 hover:border-graphite/40"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="flex size-8 items-center justify-center rounded-xl bg-secondary-paper/70 text-vermilion">
                            <Icon className="size-4" />
                          </span>
                          <span className="label-mono text-[10px] rounded-full border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-amber-800 font-medium">
                            Estimated
                          </span>
                        </div>
                        <p className="display mt-3 text-3xl sm:text-4xl font-medium text-ink tabular-nums leading-none">
                          {isCurrency ? (
                            formatCurrency(e.value, e.metricId, e.unit)
                          ) : (
                            <>
                              {e.value}
                              <span className="ml-1 text-sm font-normal text-stone">
                                {e.unit}
                              </span>
                            </>
                          )}
                        </p>
                        <p className="mt-2 text-xs sm:text-sm font-medium text-ink leading-snug">{e.label}</p>
                      </div>
                      {e.range && (
                        <p className="mt-3 pt-2 border-t border-graphite/10 font-mono text-[11px] text-stone">
                          plausible{" "}
                          {isCurrency
                            ? `${formatCurrency(e.range.low, e.metricId, e.unit)}–${formatCurrency(e.range.high, e.metricId, e.unit)}`
                            : `${e.range.low}–${e.range.high} ${e.unit}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {currentImpactEstimates && currentImpactEstimates.length > 0 && (
                <details className="group mt-4 rounded-xl border border-graphite/15 bg-white/70 shadow-2xs">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm text-stone font-medium [&::-webkit-details-marker]:hidden">
                    <span className="label-mono">
                      How these estimates are built
                    </span>
                    <span className="transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-graphite/10 p-4 pt-3 bg-secondary-paper/20 rounded-b-xl">
                    {currentImpactEstimates.map((e) => (
                      <div key={e.metricId}>
                        <p className="text-sm font-medium text-ink">{e.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-stone">
                          {e.basis}
                        </p>
                        <ul className="mt-1.5 space-y-0.5">
                          {e.assumptions.map((a, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-xs text-stone"
                            >
                              <span className="text-vermilion">·</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="mt-14 flex flex-col items-center gap-4 rounded-3xl border border-graphite/20 bg-secondary-paper/60 p-8 text-center shadow-xs">
          <p className="display text-2xl font-medium text-ink tracking-tight">
            Every device has a next life.
          </p>
          <Link href="/scan">
            <Button size="lg" className="bg-ink text-paper hover:bg-graphite">
              Scan another device
              <ArrowRight className="size-5 text-vermilion" />
            </Button>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-stone transition-colors hover:text-ink font-medium"
          >
            <ArrowLeft className="size-3.5" />
            Back home
          </Link>
        </div>
      </main>
    </div>
  );
}
