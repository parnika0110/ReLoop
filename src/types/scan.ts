/**
 * Scan persistence contract — the single record written to DynamoDB and
 * returned to the frontend. Designed for scan history without user accounts
 * (query by scanId now; time-ordered access patterns later via a GSI).
 */
import type { DeviceAnalysis, AnalysisSource, AnalysisErrorKind } from "./analysis";
import type {
  ReLoopScore,
  Recommendation,
  ImpactEstimate,
  ContributingFactor,
} from "./score";

/**
 * pending                = image stored, analysis not yet run.
 * analyzed               = validated DeviceAnalysis exists; score pending.
 * complete               = full pipeline succeeded (score + recommendation).
 * insufficient/failed    = honest failure/limit states — never shown as results.
 */
export type ScanStatus =
  | "pending"
  | "analyzed"
  | "complete"
  | "insufficient_information"
  | "failed";

export interface ScanImage {
  /** Object key in the image bucket (never a public URL). */
  key: string;
  contentType: string;
  byteSize: number | null;
}

export interface ScanError {
  kind: AnalysisErrorKind | "aws_failure" | "unsupported_input";
  message: string;
}

export interface ScanResult {
  scanId: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
  status: ScanStatus;
  image: ScanImage;
  /** null when analysis failed or returned insufficient information. */
  analysis: DeviceAnalysis | null;
  analysisSource: AnalysisSource | null;
  /** null unless status === "complete" (score is never fabricated). */
  score: ReLoopScore | null;
  recommendation: Recommendation | null;
  /**
   * Full structured engine result (confidence, contributing factors,
   * reasoning). Present iff status === "complete". score/recommendation above
   * are the canonical display fields mirrored from here.
   */
  engine: {
    confidence: number;
    contributingFactors: ContributingFactor[];
    reasoning: string;
    engineVersion: string;
  } | null;
  /** Populated during the impact milestone; null until computed for real. */
  impactEstimates: ImpactEstimate[] | null;
  /** Present whenever status !== "complete". */
  error: ScanError | null;
}

/** POST /analyze response — includes whether persistence succeeded. */
export interface ProcessScanResponse {
  scan: ScanResult;
  persisted: boolean;
}

/** POST /api/scans response — upload only; analysis runs in a later phase. */
export interface UploadScanResponse {
  scan: ScanResult;
  /** Whether the scan record reached DynamoDB (false = local dev memory). */
  persisted: boolean;
  /** Honest storage provenance — "local" means S3 is NOT configured. */
  storage: "s3" | "local";
  repository: "dynamodb" | "memory";
}

/** Uniform error envelope for API failures. */
export interface ApiErrorBody {
  error: {
    kind:
      | "not_found"
      | "unsupported_input"
      | "insufficient_information"
      | "aws_failure"
      | "provider_failure"
      | "timeout"
      | "malformed_output";
    message: string;
  };
}

/** GET /api/scans/:scanId response — scan + time-limited image URL. */
export interface ScanFetchResponse {
  scan: ScanResult;
  /** Presigned (S3) or local route URL; null when the URL could not be built. */
  imageUrl: string | null;
}
