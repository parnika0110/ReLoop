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
import { env } from "@/lib/env";
import type { UploadScanResponse } from "@/types/scan";

type Phase = "idle" | "uploading" | "stored" | "error";

function Attribute({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-bone">{value}</dd>
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
      <div className="w-full max-w-xl animate-fade-up">
        <div className="rounded-2xl border border-lime/25 bg-charcoal/80 p-8 text-center backdrop-blur-sm">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview, deliberately not optimized
            <img
              src={previewUrl}
              alt="Uploaded device"
              className="mx-auto mb-6 h-44 w-full max-w-sm rounded-2xl border border-white/10 object-cover"
            />
          )}

          {scan.status === "complete" && analysis && scan.score && scan.recommendation ? (
            <>
              <div className="flex items-center justify-center gap-2 text-lime">
                <CheckCircle2 className="size-5" />
                <span className="label-mono">Next life found</span>
              </div>

              {/* Hero: score + recommendation */}
              <div className="mt-6 flex items-end justify-center gap-6">
                <div className="text-left">
                  <p className="display text-6xl text-lime">{scan.score.overall}</p>
                  <p className="label-mono mt-1 text-muted">Next Life Score</p>
                </div>
                <div className="mb-1 h-12 w-px bg-white/10" />
                <div className="text-left">
                  <p className="display text-3xl text-bone">
                    {scan.recommendation.headline}
                  </p>
                  <p className="label-mono mt-1 text-muted">Best next life</p>
                </div>
              </div>

              <p className="mt-4 text-left text-sm leading-relaxed text-bone/90">
                {scan.engine?.reasoning}
              </p>

              {/* Attribute breakdown with contributions */}
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left">
                <div className="flex items-center justify-between">
                  <span className="label-mono text-lime uppercase">
                    {analysis.deviceType}
                  </span>
                  <span className="label-mono text-muted">
                    confidence {analysis.confidence}
                  </span>
                </div>
                <p className="mt-2 text-lg text-bone">
                  {[analysis.brand, analysis.model].filter(Boolean).join(" ") || (
                    <span className="text-muted">Brand not identifiable</span>
                  )}
                </p>
                <dl className="mt-4 space-y-2">
                  {scan.score.contributions.map((c) => (
                    <div key={c.key} className="flex items-center gap-3 text-sm">
                      <dt className="w-40 shrink-0 text-muted">{c.label}</dt>
                      <dd className="flex flex-1 items-center gap-3">
                        <span className="font-mono w-8 text-right tabular-nums text-bone">
                          {c.value}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full bg-lime/70"
                            style={{ width: `${c.value}%` }}
                          />
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
                {analysis.observedIssues.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {analysis.observedIssues.map((issue) => (
                      <li
                        key={issue.id}
                        className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted"
                      >
                        {issue.label}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="label-mono mt-4 text-muted/70">
                  {isMock
                    ? "Mock analysis — local fixture, not a live model"
                    : `Bedrock · ${scan.analysisSource?.modelId ?? "model unknown"}`}
                  {scan.engine ? ` · ${scan.engine.engineVersion}` : ""}
                </p>
              </div>

              <Link href={`/result/${scan.scanId}`} className="mt-5 block">
                <Button className="w-full">
                  View full result
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </>
          ) : scan.status === "analyzed" && analysis ? (
            <>
              <div className="flex items-center justify-center gap-2 text-lime">
                <CheckCircle2 className="size-5" />
                <span className="label-mono">Device analyzed</span>
              </div>

              <p className="mt-3 text-sm text-muted">
                Scan <span className="font-mono text-bone">{scan.scanId.slice(0, 8)}</span>
                {result.storage === "s3" ? " · stored in S3" : " · local storage"}
                {!result.persisted && " · record not persisted"}
              </p>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left">
                <div className="flex items-center justify-between">
                  <span className="label-mono text-lime uppercase">
                    {analysis.deviceType}
                  </span>
                  <span className="label-mono text-muted">
                    confidence {analysis.confidence}
                  </span>
                </div>
                <p className="mt-2 text-lg text-bone">
                  {[analysis.brand, analysis.model].filter(Boolean).join(" ") || (
                    <span className="text-muted">Brand not identifiable</span>
                  )}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <Attribute label="Condition" value={analysis.condition} />
                  <Attribute label="Repairability" value={analysis.repairability} />
                  <Attribute label="Reuse potential" value={analysis.reusePotential} />
                  <Attribute label="Resale potential" value={analysis.resalePotential} />
                </dl>
                {analysis.observedIssues.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {analysis.observedIssues.map((issue) => (
                      <li
                        key={issue.id}
                        className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted"
                      >
                        {issue.label}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="label-mono mt-4 text-muted/70">
                  {isMock
                    ? "Mock analysis — local fixture, not a live model"
                    : `Bedrock · ${scan.analysisSource?.modelId ?? "model unknown"}`}
                </p>
              </div>

              <p className="mt-4 text-sm text-bone/90">
                <span className="label-mono mr-2 text-lime">Next</span>
                ReLoop score and best-next-life recommendation — engine
                connecting next.
              </p>
            </>
          ) : scan.status === "failed" || scan.status === "insufficient_information" ? (
            <>
              <div className="flex items-center justify-center gap-2 text-amber-300">
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
              <div className="flex items-center justify-center gap-2 text-lime">
                <CheckCircle2 className="size-5" />
                <span className="label-mono">Image secured</span>
              </div>
              <p className="mt-3 text-sm text-muted">
                Scan <span className="font-mono text-bone">{scan.scanId.slice(0, 8)}</span>{" "}
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
          "group relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300",
          "border-white/15 bg-charcoal/60 backdrop-blur-sm",
          dragging && "border-lime bg-lime/[0.06] scale-[1.01]",
          phase === "uploading" && "pointer-events-none opacity-70",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(420px_circle_at_var(--x,50%)_0%,rgba(201,242,77,0.07),transparent_65%)]"
        />

        {phase === "uploading" ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4"
          >
            {analyzing ? (
              <ScanSearch className="size-6 animate-pulse-glow text-lime" />
            ) : (
              <Loader2 className="size-6 animate-spin text-lime" />
            )}
            <p className="label-mono text-bone">
              {analyzing ? "Analyzing" : "Uploading"}
            </p>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              {analyzing || progress === 0 ? (
                <div className="h-full w-2/5 rounded-full bg-lime animate-progress-indeterminate" />
              ) : (
                <div
                  className="h-full rounded-full bg-lime shadow-[0_0_12px_-2px_var(--color-lime)] transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>
            <p className="font-mono text-xs tabular-nums text-muted">
              {analyzing ? "identifying device · scoring" : `${progress}%`}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition-colors duration-300 group-hover:border-lime/40 group-hover:bg-lime/10">
              <ImagePlus className="size-7 text-lime" />
            </div>
            <p className="text-lg font-medium text-bone">
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
          className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/[0.07] p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {phase === "error" && selectedFile && (
          <Button
            className="flex-1"
            onClick={() => void startUpload(selectedFile)}
          >
            <RotateCw className="size-4" />
            Try again
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => cameraRef.current?.click()}
          disabled={phase === "uploading"}
        >
          <Camera className="size-4" />
          Use camera
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => inputRef.current?.click()}
          disabled={phase === "uploading"}
        >
          <UploadCloud className="size-4" />
          {selectedFile ? "Choose another" : "Choose file"}
        </Button>
      </div>

      {inputs}
    </div>
  );
}
