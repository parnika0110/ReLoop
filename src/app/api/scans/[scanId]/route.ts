/**
 * GET /api/scans/:scanId — retrieve a persisted scan.
 *
 * Local stand-in for the API Gateway + Lambda GET route. Returns the scan
 * plus a time-limited image URL (presigned when S3 is configured, local
 * private route otherwise) — the browser never touches bucket credentials.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createScanRepository } from "@/lib/aws/dynamodb";
import { createImageStore } from "@/lib/aws/s3";
import type { ApiErrorBody, ScanFetchResponse } from "@/types/scan";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await params;

  const repository = createScanRepository();
  let scan = null;
  try {
    scan = await repository.get(scanId);
  } catch (e) {
    console.error("[scan] read failure:", e);
    const body: ApiErrorBody = {
      error: {
        kind: "aws_failure",
        message: "Could not read the scan record. Check AWS configuration.",
      },
    };
    return NextResponse.json(body, { status: 502 });
  }

  if (!scan) {
    const body: ApiErrorBody = {
      error: { kind: "not_found", message: `No scan found for id ${scanId}.` },
    };
    return NextResponse.json(body, { status: 404 });
  }

  // Time-limited image URL — presigned for S3, local route otherwise.
  let imageUrl: string | null = null;
  try {
    imageUrl = await createImageStore().getReadUrl(scan.image.key, 900);
  } catch (e) {
    console.warn("[scan] image url failure:", e);
  }

  const body: ScanFetchResponse = { scan, imageUrl };
  return NextResponse.json(body);
}
