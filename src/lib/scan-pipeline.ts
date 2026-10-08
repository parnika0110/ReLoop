/**
 * Shared upload → analysis → engine → persistence pipeline.
 *
 * Used by BOTH HTTP front-ends:
 *   - the local Next.js route  (src/app/api/scans/route.ts)
 *   - the API Gateway + Lambda handler (infra/lambda/index.ts)
 * so there is exactly ONE implementation of the contract — the Lambda is not a
 * parallel rewrite of the app.
 *
 * Boundary: this module owns validation rules, image storage, AI analysis, the
 * deterministic ReLoop engine, impact estimation and persistence, and reports
 * outcomes as plain data. HTTP framing (multipart parsing, error envelopes,
 * response objects) stays in the caller.
 *
 * Credentials always come from the environment (never hardcoded). Adapters are
 * selected by the factories — S3/DynamoDB when configured, clearly-labelled
 * local fallbacks otherwise.
 */
import { randomUUID } from "crypto";
import { env } from "@/lib/env";
import { createScanRepository } from "@/lib/aws/dynamodb";
import {
  buildImageKey,
  createImageStore,
  isAcceptedImageType,
} from "@/lib/aws/s3";
import { createAnalysisProvider, runAnalysis } from "@/analysis";
import { runEngine } from "@/engine";
import { estimateImpact } from "@/engine/impact";
import type { ApiErrorBody, ScanResult, UploadScanResponse } from "@/types/scan";

export type ApiErrorKind = ApiErrorBody["error"]["kind"];

/** Uniform HTTP status for an error kind — one mapping, never restated. */
export function statusForErrorKind(kind: ApiErrorKind): number {
  return kind === "aws_failure" ? 502 : 400;
}

export type UploadOutcome =
  | { ok: false; kind: ApiErrorKind; message: string }
  | { ok: true; status: number; body: UploadScanResponse };

/**
 * Validate a single uploaded device image and run the full pipeline.
 * Never throws: every failure is returned as a typed outcome.
 */
export async function processUploadImage(image: File): Promise<UploadOutcome> {
  // --- Validation: type + size (server-enforced, not just UI) -------------
  const contentType = image.type.toLowerCase();
  if (!isAcceptedImageType(contentType)) {
    return {
      ok: false,
      kind: "unsupported_input",
      message: `Unsupported file type "${image.type || "unknown"}". Use JPEG, PNG, WebP, or HEIC.`,
    };
  }
  if (image.size === 0) {
    return {
      ok: false,
      kind: "unsupported_input",
      message: "The file is empty.",
    };
  }
  if (image.size > env.maxUploadBytes) {
    const mb = Math.round(env.maxUploadBytes / (1024 * 1024));
    return {
      ok: false,
      kind: "unsupported_input",
      message: `Image exceeds the ${mb} MB limit.`,
    };
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const scanId = randomUUID();
  const createdAt = new Date().toISOString();
  const key = buildImageKey(scanId, contentType);

  // --- Store image (S3 when configured, local private store otherwise) ----
  const store = createImageStore();
  try {
    await store.put({ key, body: bytes, contentType });
  } catch (e) {
    console.error("[scan] image store failure:", e);
    return {
      ok: false,
      kind: "aws_failure",
      message:
        store.id === "s3"
          ? "Could not store the image in S3. Check AWS credentials and RELOOP_IMAGE_BUCKET."
          : "Could not store the image locally.",
    };
  }

  // --- AI analysis: observations only, strictly validated -----------------
  const provider = createAnalysisProvider();
  const outcome = await runAnalysis(provider, { imageKey: key, contentType, bytes });

  const scan: ScanResult = {
    scanId,
    createdAt,
    status: outcome.ok ? "analyzed" : "pending",
    image: { key, contentType, byteSize: image.size },
    analysis: outcome.ok ? outcome.analysis : null,
    analysisSource: outcome.ok ? outcome.source : null,
    score: null, // populated by the deterministic engine below — never faked
    recommendation: null,
    engine: null,
    impactEstimates: null,
    error: outcome.ok ? null : { kind: outcome.kind, message: outcome.message },
  };

  // --- ReLoop Decision Engine: deterministic score + recommendation -------
  if (outcome.ok) {
    const engineResult = runEngine(outcome.analysis);
    scan.score = engineResult.score;
    scan.recommendation = engineResult.recommendation;
    scan.engine = {
      confidence: engineResult.confidence,
      contributingFactors: engineResult.contributingFactors,
      reasoning: engineResult.reasoning,
      engineVersion: engineResult.engineVersion,
    };
    // Transparent impact estimates — assumption-based, labelled in the UI.
    scan.impactEstimates = estimateImpact(
      outcome.analysis,
      engineResult.recommendation.path,
    );
    scan.status = "complete";
  } else {
    scan.status =
      outcome.kind === "insufficient_information" ||
      outcome.kind === "unsupported_device"
        ? "insufficient_information"
        : "failed";
  }

  // --- Persist scan record (DynamoDB when configured) ---------------------
  const repository = createScanRepository();
  let persisted = false;
  try {
    await repository.put(scan);
    persisted = true;
  } catch (e) {
    // Image + analysis exist but the record is not durable. Report honestly
    // rather than claiming persistence that didn't happen.
    console.error("[scan] persistence failure:", e);
  }

  return {
    ok: true,
    status: 201,
    body: {
      scan,
      persisted,
      storage: store.id,
      repository: repository.id,
    },
  };
}
