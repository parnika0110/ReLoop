/**
 * Centralised, typed environment access.
 *
 * Rules:
 * - No secrets are read anywhere except through process.env.
 * - Nothing throws at import time (so `next build` works without .env).
 * - `missingAwsConfig()` reports honestly what is not configured; local
 *   adapters are used instead — we never pretend AWS is available.
 */

export type AnalysisProviderId = "mock" | "bedrock";

function read(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim();
}

function readInt(name: string): number | undefined {
  const raw = read(name);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MiB
const DEFAULT_ANALYSIS_TIMEOUT_MS = 30_000;

export const env = {
  /** AWS region. Defaults to us-east-1 for SDK clients. */
  get awsRegion(): string {
    return read("AWS_REGION") ?? read("AWS_DEFAULT_REGION") ?? "us-east-1";
  },

  /** DynamoDB scan table name; undefined when not configured. */
  get scanTable(): string | undefined {
    return read("RELOOP_SCAN_TABLE");
  },

  /** Private S3 image bucket; undefined when not configured. */
  get imageBucket(): string | undefined {
    return read("RELOOP_IMAGE_BUCKET");
  },

  /**
   * API Gateway base URL. Undefined means the frontend calls the built-in
   * Next.js route (/api/scans) as a local stand-in for the Lambda stack.
   *
   * Read with a LITERAL process.env member access on purpose: Next only
   * inlines NEXT_PUBLIC_ variables into the browser bundle for direct
   * references — a dynamic process.env[name] lookup returns undefined in the
   * client and would silently send the browser back to the local route.
   */
  get apiBaseUrl(): string | undefined {
    const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    return value ? value : undefined;
  },

  get analysisProvider(): AnalysisProviderId {
    return read("RELOOP_ANALYSIS_PROVIDER") === "bedrock" ? "bedrock" : "mock";
  },

  get bedrockModelId(): string | undefined {
    return read("RELOOP_BEDROCK_MODEL_ID");
  },

  /**
   * Region the Bedrock *client* calls.
   *
   * Separate from awsRegion because Bedrock model access is granted
   * per-region: an account can have a model enabled in one region and not
   * another. Unset → same region as everything else (no behaviour change).
   */
  get bedrockRegion(): string {
    return read("RELOOP_BEDROCK_REGION") ?? this.awsRegion;
  },

  get maxUploadBytes(): number {
    return readInt("RELOOP_MAX_UPLOAD_BYTES") ?? DEFAULT_MAX_UPLOAD_BYTES;
  },

  get analysisTimeoutMs(): number {
    return readInt("RELOOP_ANALYSIS_TIMEOUT_MS") ?? DEFAULT_ANALYSIS_TIMEOUT_MS;
  },
};

/**
 * AWS resource configuration that is still missing.
 * Empty array = fully configured. Used to decide local-adapter fallback and
 * to report status honestly — never to fake an AWS deployment.
 */
export function missingAwsConfig(): string[] {
  const missing: string[] = [];
  if (!env.scanTable) missing.push("RELOOP_SCAN_TABLE (DynamoDB table name)");
  if (!env.imageBucket) missing.push("RELOOP_IMAGE_BUCKET (S3 bucket name)");
  return missing;
}
