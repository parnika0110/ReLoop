/**
 * Device uploader — drag/drop, camera-friendly, validated, with real upload
 * progress. Uses the API abstraction in src/lib/api/client.ts (browser never
 * touches AWS credentials).
 *
 * After a successful upload the scan exists with status "pending" — the AI
 * analysis pipeline attaches here in the next milestone. We never show a
 * result the backend has not produced.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RotateCw,
  ScanSearch,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadDeviceImage, ApiError } from "@/lib/api/client";
import { brandModelLabel } from "@/lib/brand";
import { env } from "@/lib/env";
import type { UploadScanResponse } from "@/types/scan";

type Phase = "idle" | "uploading" | "stored" | "error";

function Attribute({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </div>
  );
}

function PreviewAttributeBars({
  contributions,
}: {
  contributions: { key: string; label: string; value: number }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const maxScore = Math.max(...contributions.map((c) => c.value));

  return (
    <div ref={containerRef} className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <span className="label-mono text-xs uppercase tracking-wider text-stone font-medium">
          Measured Attributes
        </span>
        <span className="label-mono text-[11px] text-stone">
          Rating out of 100
        </span>
      </div>

      <dl className="space-y-4">
        {contributions.map((c, i) => {
          const isHighest = c.value === maxScore;
          return (
            <div key={c.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <dt className="flex items-center gap-2 font-medium text-ink">
                  <span>{c.label}</span>
                  {isHighest && (
                    <span className="label-mono text-[10px] px-1.5 py-0.2 rounded border border-vermilion/30 bg-vermilion/10 text-vermilion font-medium">
                      Leading
                    </span>
                  )}
                </dt>
                <dd className="font-mono tabular-nums text-ink font-semibold">
                  {c.value}
                </dd>
              </div>
              {/* High contrast track and scroll-triggered animated fill */}
              <div className="h-2.5 overflow-hidden rounded-none bg-graphite/15 border border-graphite/10">
                <div
                  className={`h-full rounded-none ${
                    isHighest
                      ? "bg-gradient-to-r from-vermilion to-vermilion/85"
                      : "bg-graphite/85"
                  }`}
                  style={
                    isVisible
                      ? ({
                          // Width is the reduced-motion / animation-off fallback:
                          // the @keyframe animation overrides it when it runs.
                          width: `${c.value}%`,
                          "--attribute-bar-from": "0%",
                          "--attribute-bar-to": `${c.value}%`,
                          animation: `attribute-bar-in 900ms ease-out ${i * 110}ms both`,
                        } as React.CSSProperties)
                      : {
                          width: "0%",
                        }
                  }
                />
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/heic,image/heif";

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
    return `"${file.name}" isn't a supported format. Use JPEG, PNG, WebP, or HEIC.`;
  }
  if (file.size === 0) return "That file is empty — pick another image.";
  if (file.size > env.maxUploadBytes) {
    const mb = Math.round(env.maxUploadBytes / (1024 * 1024));
    return `That image is ${Math.round(file.size / (1024 * 1024))} MB — the limit is ${mb} MB.`;
  }
  return null;
}

export function DeviceUploader() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<UploadScanResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight uploads only when the uploader unmounts. This must NOT
  // depend on previewUrl: the preview is created at upload start, so a
  // preview-keyed cleanup would abort the very upload that just began.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Revoke the object URL when it is replaced or on unmount.
  useEffect(() => {
    const url = previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [previewUrl]);

  const startUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setPhase("error");
      // No file was accepted, so clear any stale selection — selectedFile
      // doubles as "the last attempt got past validation and can be retried".
      setSelectedFile(null);
      return;
    }

    // A new upload supersedes any in-flight one (sample re-trigger, or a
    // drop while a previous request is still running).
    abortRef.current?.abort();

    setError(null);
    setProgress(0);
    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPhase("uploading");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await uploadDeviceImage(file, {
        onProgress: setProgress,
        signal: controller.signal,
      });
      setResult(response);
      setProgress(100);
      setPhase("stored");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const message =
        e instanceof ApiError
          ? e.message
          : "Something went wrong uploading the image. Please try again.";
      setError(message);
      setPhase("error");
    }
  }, []);

  const onFileSelected = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void startUpload(file);
  };

  // "Try a sample device" (/scan?sample=<token>): fetch the bundled sample
  // photo and run it through the exact same upload + analysis path — no
  // special-casing downstream. The token VALUE is the dependency, so landing
  // with ?sample=1 starts once, and a later click carrying a fresh token
  // starts again — while an unchanged URL never re-triggers it.
  const searchParams = useSearchParams();
  const sampleToken = searchParams.get("sample");

  useEffect(() => {
    if (!sampleToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/samples/device-photo.jpg");
        if (!response.ok) {
          throw new Error(`sample fetch returned ${response.status}`);
        }
        const blob = await response.blob();
        if (cancelled) return;
        const file = new File([blob], "sample-device.jpg", {
          type: blob.type || "image/jpeg",
        });
        void startUpload(file);
      } catch {
        if (cancelled) return;
        setError(
          "The sample device could not be loaded — upload your own photo instead.",
        );
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sampleToken, startUpload]);

  const reset = () => {
    abortRef.current?.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhase("idle");
    setProgress(0);
    setError(null);
    setPreviewUrl(null);
    setResult(null);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  // --- Hidden inputs: gallery + camera -----------------------------------
  const inputs = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files)}
      />
    </>
  );

  if (phase === "stored" && result) {
    const { scan } = result;
    const analysis = scan.analysis;
    const isMock = scan.analysisSource?.provider === "mock";

    return (
      <div className="w-full max-w-2xl md:max-w-3xl animate-fade-up">
        <div className="rounded-none border border-graphite/20 bg-white shadow-xl p-6 sm:p-8 md:p-10 text-left">
          {previewUrl && (
            <div className="relative mb-8 overflow-hidden rounded-none border border-graphite/20 bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, deliberately not optimized */}
              <img
                src={previewUrl}
                alt="Uploaded device"
                className="h-52 sm:h-64 md:h-72 w-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-paper/90 backdrop-blur-xs px-2.5 py-1 border border-graphite/20 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-vermilion animate-pulse" />
                <span className="label-mono text-xs text-ink font-medium">
                  Scan {scan.scanId.slice(0, 8)}
                </span>
              </div>
            </div>
          )}

          {scan.status === "complete" && analysis && scan.score && scan.recommendation ? (
            <>
              {/* Status Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-graphite/15">
                <div className="flex items-center gap-2 text-vermilion">
                  <CheckCircle2 className="size-5" />
                  <span className="label-mono font-medium tracking-wider uppercase">
                    Next Life Found
                  </span>
                </div>
                <span className="label-mono text-stone text-xs">
                  Assessment Complete
                </span>
              </div>

              {/* Score + Recommendation Reveal Banner */}
              <div className="mt-6 grid gap-6 sm:grid-cols-[auto,1fr] sm:items-center sm:divide-x sm:divide-graphite/15 rounded-none border border-graphite/15 bg-paper/60 p-6 md:p-7">
                <div className="flex flex-col items-start pr-0 sm:pr-8">
                  <span className="label-mono text-xs text-stone uppercase tracking-wider">
                    Next Life Score
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="display text-6xl md:text-7xl tabular-nums font-medium text-vermilion tracking-tight">
                      {scan.score.overall}
                    </p>
                    <span className="label-mono text-xs text-stone">/ 100</span>
                  </div>
                </div>

                <div className="min-w-0 sm:pl-8">
                  <div className="flex items-center gap-2">
                    <span className="label-mono text-[11px] uppercase tracking-wider text-stone">
                      Recommended Pathway
                    </span>
                    <span className="label-mono text-[10px] px-1.5 py-0.5 rounded border border-vermilion/30 bg-vermilion/10 text-vermilion uppercase font-medium">
                      Primary
                    </span>
                  </div>
                  <p className="display mt-1 text-2xl sm:text-3xl text-ink tracking-tight font-medium">
                    {scan.recommendation.headline}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone">
                    {scan.engine?.reasoning}
                  </p>
                </div>
              </div>

              {/* Device Information & Measured DNA Panel */}
              <div className="mt-6 rounded-none border border-graphite/20 bg-secondary-paper/70 p-6 md:p-7">
                {/* Identification Bar */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-graphite/15">
                  <div>
                    <span className="label-mono text-xs uppercase tracking-wider text-vermilion font-medium">
                      {analysis.deviceType}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-medium text-ink mt-0.5">
                      {brandModelLabel(analysis) ?? (
                        <span className="text-stone">Brand not identifiable from photo</span>
                      )}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="label-mono text-xs text-stone block">
                      Visual Confidence
                    </span>
                    <span className="label-mono text-ink font-medium capitalize">
                      {analysis.confidence}
                    </span>
                  </div>
                </div>

                {/* Attribute measurements with enhanced contrast and scroll-triggered fill animation */}
                <PreviewAttributeBars contributions={scan.score.contributions} />

                {/* Condition observations / tags */}
                {analysis.observedIssues.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-graphite/15">
                    <span className="label-mono text-xs uppercase tracking-wider text-stone block mb-2">
                      Condition Observations
                    </span>
                    <ul className="flex flex-wrap gap-2">
                      {analysis.observedIssues.map((issue) => (
                        <li
                          key={issue.id}
                          className="rounded-none border border-graphite/20 bg-paper/60 px-3 py-1 text-xs text-ink font-mono"
                        >
                          {issue.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Model / Provider metadata */}
                <div className="mt-6 pt-4 border-t border-graphite/15 flex flex-wrap items-center justify-between gap-2">
                  <p className="label-mono text-[11px] text-stone">
                    {isMock
                      ? "Mock analysis — local fixture, not a live model"
                      : `Bedrock · ${scan.analysisSource?.modelId ?? "model unknown"}`}
                    {scan.engine ? ` · engine v${scan.engine.engineVersion}` : ""}
                  </p>
                  <p className="label-mono text-[11px] text-stone">
                    Non-invasive visual assessment
                  </p>
                </div>
              </div>

              <Link href={`/result/${scan.scanId}`} className="mt-6 block">
                <Button className="w-full py-6 text-base">
                  View full result
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </>
          ) : scan.status === "analyzed" && analysis ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-graphite/15">
                <div className="flex items-center gap-2 text-vermilion">
                  <CheckCircle2 className="size-5" />
                  <span className="label-mono font-medium uppercase tracking-wider">
                    Device Analyzed
                  </span>
                </div>
                <span className="label-mono text-stone text-xs">
                  Scan {scan.scanId.slice(0, 8)}
                  {result.storage === "s3" ? " · S3" : " · local"}
                </span>
              </div>

              <div className="mt-6 rounded-none border border-graphite/20 bg-secondary-paper/70 p-6 md:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-graphite/15">
                  <span className="label-mono text-vermilion uppercase font-medium">
                    {analysis.deviceType}
                  </span>
                  <span className="label-mono text-stone">
                    confidence {analysis.confidence}
                  </span>
                </div>
                <p className="mt-3 text-xl font-medium text-ink">
                  {brandModelLabel(analysis) ?? (
                    <span className="text-stone">Brand not identifiable</span>
                  )}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <Attribute label="Condition" value={analysis.condition} />
                  <Attribute label="Repairability" value={analysis.repairability} />
                  <Attribute label="Reuse potential" value={analysis.reusePotential} />
                  <Attribute label="Resale potential" value={analysis.resalePotential} />
                </dl>
                {analysis.observedIssues.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-graphite/15">
                    {analysis.observedIssues.map((issue) => (
                      <li
                        key={issue.id}
                        className="rounded-none border border-graphite/20 bg-paper/60 px-3 py-1 text-xs text-ink font-mono"
                      >
                        {issue.label}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="label-mono mt-5 text-[11px] text-stone">
                  {isMock
                    ? "Mock analysis — local fixture, not a live model"
                    : `Bedrock · ${scan.analysisSource?.modelId ?? "model unknown"}`}
                </p>
              </div>

              <p className="mt-5 text-sm text-stone">
                <span className="label-mono mr-2 text-vermilion font-medium">Next</span>
                ReLoop score and best-next-life recommendation — engine connecting next.
              </p>
            </>
          ) : scan.status === "failed" || scan.status === "insufficient_information" ? (
            <>
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <ScanSearch className="size-5" />
                <span className="label-mono">
                  {scan.status === "insufficient_information"
                    ? "Not enough information"
                    : "Analysis failed"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {scan.error?.message ?? "The analysis could not be completed."}
              </p>
              {scan.error?.kind && (
                <p className="label-mono mt-3 text-muted/60">
                  code: {scan.error.kind}
                </p>
              )}
              <p className="mt-4 text-xs text-muted/70">
                The image was stored (scan {scan.scanId.slice(0, 8)}) — no
                result was fabricated.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-vermilion">
                <CheckCircle2 className="size-5" />
                <span className="label-mono">Image secured</span>
              </div>
              <p className="mt-3 text-sm text-muted">
                Scan <span className="font-mono text-ink">{scan.scanId.slice(0, 8)}</span>{" "}
                stored — analysis did not run.
              </p>
            </>
          )}

          <Button variant="outline" className="mt-6" onClick={reset}>
            Scan another device
          </Button>
        </div>
      </div>
    );
  }

  // Past 100% the bytes are sent and the server is analysing the image, which
  // is the slow half of the request — that step gets its own honest state
  // instead of a progress bar frozen at "100%".
  const analyzing = phase === "uploading" && progress >= 100;

  return (
    <div className="w-full max-w-xl animate-fade-up">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a device image"
        aria-disabled={phase === "uploading"}
        onClick={() => {
          if (phase !== "uploading") inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (phase === "uploading") return;
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (phase !== "uploading") setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (phase !== "uploading") onFileSelected(e.dataTransfer.files);
        }}
        className={cn(
          "group relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-none border-2 border-dashed p-10 text-center transition-all duration-300",
          "border-graphite/20 bg-white ",
          dragging && "border-lime bg-vermilion/[0.06] scale-[1.01]",
          phase === "uploading" && "pointer-events-none opacity-70",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-none opacity-0 transition-opacity duration-300 group-hover:opacity-100 "
        />

        {phase === "uploading" ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 w-full"
          >
            {previewUrl && (
              <div className="relative mb-2 w-full max-w-xs overflow-hidden border border-graphite/25 bg-secondary-paper/40 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Uploaded device preview"
                  className="aspect-[4/3] w-full object-cover filter contrast-[0.95]"
                />
                {/* Retrained technical scan frame */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 border border-graphite/40 animate-scan-frame"
                >
                  <div className="absolute top-1.5 left-1.5 size-3 border-t-2 border-l-2 border-vermilion" />
                  <div className="absolute top-1.5 right-1.5 size-3 border-t-2 border-r-2 border-vermilion" />
                  <div className="absolute bottom-1.5 left-1.5 size-3 border-b-2 border-l-2 border-vermilion" />
                  <div className="absolute bottom-1.5 right-1.5 size-3 border-b-2 border-r-2 border-vermilion" />
                </div>
                {/* Scan-line sweep beam */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-vermilion to-transparent shadow-[0_0_8px_rgba(232,69,30,0.8)] animate-scan-beam"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              {analyzing ? (
                <ScanSearch className="size-4 animate-pulse-glow text-vermilion" />
              ) : (
                <Loader2 className="size-4 animate-spin text-vermilion" />
              )}
              <p className="label-mono font-medium text-ink">
                {analyzing ? "Analyzing Device" : "Uploading Image"}
              </p>
            </div>
            <div className="h-1.5 w-56 overflow-hidden rounded-none bg-graphite/10">
              {analyzing || progress === 0 ? (
                <div className="h-full w-2/5 rounded-none bg-vermilion animate-progress-indeterminate" />
              ) : (
                <div
                  className="h-full rounded-none bg-vermilion transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>
            <p className="font-mono text-xs tabular-nums text-stone">
              {analyzing ? "identifying device · scoring attributes" : `${progress}%`}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-none border border-graphite/20 bg-graphite/5 transition-colors duration-300 group-hover:border-lime/40 group-hover:bg-vermilion/10">
              <ImagePlus className="size-7 text-vermilion" />
            </div>
            <p className="text-lg font-medium text-ink">
              Drop a device photo here
            </p>
            <p className="mt-2 text-sm text-muted">
              or click to browse — laptops, smartphones, tablets
            </p>
            <p className="label-mono mt-4 text-muted/60">
              JPEG · PNG · WEBP · HEIC — max{" "}
              <span className="whitespace-nowrap">
                {Math.round(env.maxUploadBytes / (1024 * 1024))} MB
              </span>
            </p>
          </>
        )}
      </div>

      {phase === "error" && error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-none border border-red-500/20 bg-red-50 p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {phase === "error" && selectedFile && (
          <Button
            className="flex-1 bg-vermilion text-paper hover:bg-ink hover:text-paper shadow-sm"
            onClick={() => void startUpload(selectedFile)}
          >
            <RotateCw className="size-4" />
            Try again
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1 bg-white text-ink border-graphite/30 hover:bg-secondary-paper hover:border-ink hover:text-ink shadow-2xs font-medium"
          onClick={() => cameraRef.current?.click()}
          disabled={phase === "uploading"}
        >
          <Camera className="size-4 text-vermilion" />
          Use camera
        </Button>
        <Button
          variant="outline"
          className="flex-1 bg-white text-ink border-graphite/30 hover:bg-secondary-paper hover:border-ink hover:text-ink shadow-2xs font-medium"
          onClick={() => inputRef.current?.click()}
          disabled={phase === "uploading"}
        >
          <UploadCloud className="size-4 text-ink" />
          {selectedFile ? "Choose another" : "Choose file"}
        </Button>
      </div>

      {inputs}
    </div>
  );
}
