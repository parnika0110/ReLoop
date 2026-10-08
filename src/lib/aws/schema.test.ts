import { describe, expect, it } from "vitest";
import { buildImageKey, isAcceptedImageType } from "@/lib/aws/s3";
import { buildScanKeys } from "@/lib/aws/schema";

describe("image keys", () => {
  it("builds a deterministic scan-scoped key", () => {
    expect(buildImageKey("abc-123", "image/jpeg")).toBe("scans/abc-123.jpg");
    expect(buildImageKey("abc-123", "image/png")).toBe("scans/abc-123.png");
  });

  it("accepts only known image types", () => {
    expect(isAcceptedImageType("image/jpeg")).toBe(true);
    expect(isAcceptedImageType("image/webp")).toBe(true);
    expect(isAcceptedImageType("application/pdf")).toBe(false);
  });
});

describe("scan keys", () => {
  it("builds single-table keys for the scan access pattern", () => {
    const keys = buildScanKeys("scan-1", "2026-10-08T00:00:00.000Z");
    expect(keys).toEqual({
      PK: "SCAN#scan-1",
      SK: "META",
      GSI1PK: "ENTITY#SCAN",
      GSI1SK: "2026-10-08T00:00:00.000Z#scan-1",
    });
  });
});
