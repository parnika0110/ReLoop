/**
 * AI analysis contract.
 *
 * The AI (Bedrock or local mock) extracts/assesses device characteristics only.
 * It never produces the ReLoop score — that is deterministic (src/engine).
 */

export const SUPPORTED_DEVICE_TYPES = ["laptop", "smartphone", "tablet"] as const;
export type DeviceType = (typeof SUPPORTED_DEVICE_TYPES)[number];

export function isSupportedDeviceType(value: unknown): value is DeviceType {
  return (
    typeof value === "string" &&
    (SUPPORTED_DEVICE_TYPES as readonly string[]).includes(value)
  );
}

export type IssueSeverity = "minor" | "moderate" | "critical" | "unknown";

/** A concrete, observed defect — not a guess. */
export interface ObservedIssue {
  /** Stable machine code, e.g. "cracked_screen". */
  id: string;
  /** Human-readable label, e.g. "Cracked screen". */
  label: string;
  severity: IssueSeverity;
}

/**
 * Structured AI output. All scores are 0–100.
 * Fields that cannot be determined from the image must be null, never invented.
 */
export interface DeviceAnalysis {
  deviceType: DeviceType;
  brand: string | null;
  model: string | null;
  /** Age in years. null when unknown from the image. */
  estimatedAge: number | null;
  condition: number;
  repairability: number;
  reusePotential: number;
  resalePotential: number;
  materialRecoveryPotential: number;
  observedIssues: ObservedIssue[];
  /** Model's own confidence in this analysis, 0–100. */
  confidence: number;
}

/** Provenance of an analysis — surfaced in the UI so mock output is never mistaken for real AI. */
export interface AnalysisSource {
  provider: "mock" | "bedrock";
  modelId: string | null;
  requestedAt: string;
}

/** Machine-readable failure categories (mapped to HTTP statuses by the API layer). */
export type AnalysisErrorKind =
  | "unsupported_device"
  | "insufficient_information"
  | "malformed_output"
  | "provider_failure"
  | "timeout";

/**
 * Result of an analysis attempt. Explicitly discriminated so the product can
 * never present a failed analysis as a successful one.
 */
export type AnalysisOutcome =
  | { ok: true; analysis: DeviceAnalysis; source: AnalysisSource }
  | {
      ok: false;
      kind: AnalysisErrorKind;
      message: string;
      /** What the image was missing, when kind === "insufficient_information". */
      missing?: string[];
    };

export interface AnalysisInput {
  imageKey: string;
  contentType: string;
  /**
   * Raw bytes when available (local mode). The Bedrock provider fetches from
   * the image store when only a key is provided.
   */
  bytes?: Uint8Array;
}

/** Implemented by the mock provider now and the Bedrock provider during AWS integration. */
export interface AnalysisProvider {
  readonly id: "mock" | "bedrock";
  analyze(input: AnalysisInput): Promise<AnalysisOutcome>;
}
