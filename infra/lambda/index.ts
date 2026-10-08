/**
 * API Gateway (HTTP API, payload v2.0) → ReLoop.
 *
 * Thin transport adapter ONLY: parse the event, delegate to the exact same
 * shared pipeline the Next.js route uses (src/lib/scan-pipeline), frame the
 * response. No business logic, no second copy of validation/engine rules.
 *
 * Environment (set by the CloudFormation template):
 *   RELOOP_SCAN_TABLE / RELOOP_IMAGE_BUCKET  → real S3 + DynamoDB adapters
 *   RELOOP_ANALYSIS_PROVIDER=bedrock + RELOOP_BEDROCK_MODEL_ID → real Bedrock
 *   RELOOP_ALLOWED_ORIGINS                   → browser origins allowed by CORS
 *
 * CORS is emitted HERE (never by API Gateway) so error responses carry the
 * same headers as successes — one source of truth, no duplicate headers.
 *
 * Nothing here ever logs credentials, image bytes, or full model output.
 */
import {
  processUploadImage,
  statusForErrorKind,
  type ApiErrorKind,
} from "@/lib/scan-pipeline";
import { createImageStore } from "@/lib/aws/s3";
import { createScanRepository } from "@/lib/aws/dynamodb";
import type { ApiErrorBody, ScanFetchResponse, UploadScanResponse } from "@/types/scan";

/* ---- Minimal API Gateway HTTP API (payload v2.0) shapes ------------------ */

interface ApiGatewayProxyEventV2 {
  version: string;
  routeKey: string;
  rawPath: string;
  headers: Record<string, string | undefined>;
  requestContext: { http: { method: string; path: string } };
  pathParameters?: Record<string, string> | null;
  body?: string;
  isBase64Encoded?: boolean;
}

interface ApiGatewayProxyResultV2 {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

/* ---- CORS ---------------------------------------------------------------- */

const DEFAULT_ORIGINS = "http://localhost:3000,http://localhost:3100";

const ALLOWED_ORIGINS = (
  process.env.RELOOP_ALLOWED_ORIGINS ?? DEFAULT_ORIGINS
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function corsHeaders(origin: string | undefined): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type,accept",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function respond(
  statusCode: number,
  payload: unknown,
  origin: string | undefined,
): ApiGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify(payload),
  };
}

function apiError(
  kind: ApiErrorKind,
  message: string,
): ApiErrorBody {
  return { error: { kind, message } };
}

/* ---- Handlers ------------------------------------------------------------ */

async function handleUpload(
  event: ApiGatewayProxyEventV2,
  origin: string | undefined,
): Promise<ApiGatewayProxyResultV2> {
  const raw =
    event.isBase64Encoded && event.body
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body ?? "", "utf8");

  let form: FormData;
  try {
    // Node's undici Request parses multipart — same parser the app relies on.
    const request = new Request("http://reloop.internal/scans", {
      method: "POST",
      headers: { "content-type": event.headers["content-type"] ?? "" },
      body: raw,
    });
    form = await request.formData();
  } catch {
    return respond(
      400,
      apiError(
        "unsupported_input",
        "Expected multipart/form-data with an 'image' field.",
      ),
      origin,
    );
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return respond(
      400,
      apiError("unsupported_input", "No image file provided."),
      origin,
    );
  }

  const outcome = await processUploadImage(image);
  if (!outcome.ok) {
    return respond(
      statusForErrorKind(outcome.kind),
      apiError(outcome.kind, outcome.message),
      origin,
    );
  }

  const body: UploadScanResponse = outcome.body;
  console.log(
    JSON.stringify({
      event: "scan.upload",
      scanId: body.scan.scanId,
      status: body.scan.status,
      storage: body.storage,
      repository: body.repository,
      persisted: body.persisted,
      provider: body.scan.analysisSource?.provider ?? null,
      modelId: body.scan.analysisSource?.modelId ?? null,
      errorKind: body.scan.error?.kind ?? null,
    }),
  );
  return respond(outcome.status, body, origin);
}

async function handleGet(
  scanId: string,
  origin: string | undefined,
): Promise<ApiGatewayProxyResultV2> {
  const repository = createScanRepository();
  let scan = null;
  try {
    scan = await repository.get(scanId);
  } catch (e) {
    console.error("[scan] read failure:", e);
    return respond(
      502,
      apiError(
        "aws_failure",
        "Could not read the scan record. Check AWS configuration.",
      ),
      origin,
    );
  }

  if (!scan) {
    return respond(
      404,
      apiError("not_found", `No scan found for id ${scanId}.`),
      origin,
    );
  }

  // Time-limited image URL — presigned for S3, local route otherwise.
  let imageUrl: string | null = null;
  try {
    imageUrl = await createImageStore().getReadUrl(scan.image.key, 900);
  } catch (e) {
    console.warn("[scan] image url failure:", e);
  }

  const body: ScanFetchResponse = { scan, imageUrl };
  console.log(
    JSON.stringify({
      event: "scan.fetch",
      scanId,
      status: scan.status,
      imageUrl: imageUrl ? "issued" : "none",
    }),
  );
  return respond(200, body, origin);
}

/* ---- Entry point --------------------------------------------------------- */

export async function handler(
  event: ApiGatewayProxyEventV2,
): Promise<ApiGatewayProxyResultV2> {
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const method = (event.requestContext?.http?.method ?? "").toUpperCase();

  try {
    if (method === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(origin), body: "" };
    }

    const scanId = event.pathParameters?.scanId;

    if (method === "POST" && !scanId) return await handleUpload(event, origin);
    if (method === "GET" && scanId) return await handleGet(scanId, origin);

    return respond(
      404,
      apiError("not_found", `No route for ${method} ${event.rawPath}.`),
      origin,
    );
  } catch (error) {
    // Never let an exception become an opaque API Gateway 502 without CORS.
    console.error("[scan] unhandled error", {
      method,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage:
        error instanceof Error ? error.message.slice(0, 300) : "unknown",
    });
    return respond(
      500,
      apiError("aws_failure", "The scan service failed unexpectedly."),
      origin,
    );
  }
}
