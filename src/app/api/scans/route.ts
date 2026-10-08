/**
 * POST /api/scans — local stand-in for API Gateway + Lambda.
 *
 * Contract (identical to the gateway route, and identical to the deployed
 * Lambda in infra/lambda/index.ts — both call src/lib/scan-pipeline):
 *   multipart/form-data { image }
 *   → validate → store via ImageStore → run AI analysis (strictly validated)
 *   → persist → 201 UploadScanResponse
 *
 * Analysis outcomes map to honest statuses:
 *   analyzed                → validated DeviceAnalysis (score still pending)
 *   insufficient_information / failed → error recorded, never a fake result
 *
 * Credentials come exclusively from the environment (never hardcoded).
 * This file only does HTTP framing; the pipeline itself is shared.
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  processUploadImage,
  statusForErrorKind,
  type ApiErrorKind,
} from "@/lib/scan-pipeline";

function error(kind: ApiErrorKind, message: string) {
  return NextResponse.json(
    { error: { kind, message } },
    { status: statusForErrorKind(kind) },
  );
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(
      "unsupported_input",
      "Expected multipart/form-data with an 'image' field.",
    );
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return error("unsupported_input", "No image file provided.");
  }

  const outcome = await processUploadImage(image);
  if (!outcome.ok) {
    return error(outcome.kind, outcome.message);
  }
  return NextResponse.json(outcome.body, { status: outcome.status });
}
