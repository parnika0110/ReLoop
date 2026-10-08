/**
 * GET /api/images/[...key] — serves objects from the LOCAL image store only.
 *
 * S3-backed images are never served here: S3ImageStore.getReadUrl() issues
 * short-lived presigned URLs instead. This route returns 503 when S3 is
 * configured, so local files can't quietly stand in for cloud objects.
 */
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createImageStore, LocalImageStore } from "@/lib/aws/s3";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (env.imageBucket) {
    return NextResponse.json(
      { error: { kind: "aws_failure", message: "Local image route disabled when S3 is configured; use presigned URLs." } },
      { status: 503 },
    );
  }

  const key = (await params).key.join("/");
  const store = createImageStore();
  if (!(store instanceof LocalImageStore)) {
    return NextResponse.json(
      { error: { kind: "aws_failure", message: "Local image store unavailable." } },
      { status: 503 },
    );
  }

  const bytes = await store.get(key);
  if (!bytes) {
    return NextResponse.json(
      { error: { kind: "unsupported_input", message: "Image not found." } },
      { status: 404 },
    );
  }

  const contentType = key.endsWith(".png")
    ? "image/png"
    : key.endsWith(".webp")
      ? "image/webp"
      : key.endsWith(".heic") || key.endsWith(".heif")
        ? "image/heic"
        : "image/jpeg";

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
