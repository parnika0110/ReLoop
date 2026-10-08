/**
 * Analysis provider factory + orchestration.
 *
 * Provider selection is explicit and honest:
 *  - RELOOP_ANALYSIS_PROVIDER=bedrock + model id → real Bedrock provider.
 *    (If AWS credentials/model access are missing, failures surface as
 *    provider_failure at request time — we never silently swap in the mock.)
 *  - anything else → MockAnalysisProvider, clearly labelled provider:"mock".
 *
 * `runAnalysis` adds a timeout guard and structured logging that never
 * includes credentials, image bytes, or full model output.
 */
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { env } from "@/lib/env";
import { BedrockAnalysisProvider } from "@/analysis/bedrock";
import { MockAnalysisProvider } from "@/analysis/mock";
import type {
  AnalysisInput,
  AnalysisOutcome,
  AnalysisProvider,
} from "@/types/analysis";

let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  // Credentials resolve from the environment/IAM role only — never hardcoded.
  // Region is env.bedrockRegion: Bedrock model access is per-region, so it can
  // differ from the region hosting S3/DynamoDB.
  bedrockClient ??= new BedrockRuntimeClient({ region: env.bedrockRegion });
  return bedrockClient;
}

export function createAnalysisProvider(): AnalysisProvider {
  if (env.analysisProvider === "bedrock") {
    const modelId = env.bedrockModelId;
    if (!modelId) {
      // Misconfiguration, not a reason to fake analysis: return a provider
      // that fails honestly on every call.
      return failingProvider(
        "Bedrock provider selected but RELOOP_BEDROCK_MODEL_ID is not set.",
      );
    }
    return new BedrockAnalysisProvider(getBedrockClient(), modelId);
  }
  return new MockAnalysisProvider();
}

function failingProvider(message: string): AnalysisProvider {
  return {
    id: "bedrock",
    async analyze(): Promise<AnalysisOutcome> {
      return { ok: false, kind: "provider_failure", message };
    },
  };
}

/**
 * Run analysis with timeout guard + safe logging.
 * Never throws — every failure becomes a typed AnalysisOutcome.
 */
export async function runAnalysis(
  provider: AnalysisProvider,
  input: AnalysisInput,
): Promise<AnalysisOutcome> {
  const started = Date.now();
  try {
    const outcome = await provider.analyze(input);
    if (!outcome.ok) {
      console.warn("[analysis] failed", {
        provider: provider.id,
        kind: outcome.kind,
        imageKey: input.imageKey,
        elapsedMs: Date.now() - started,
      });
    }
    return outcome;
  } catch (error) {
    console.error("[analysis] unexpected error", {
      provider: provider.id,
      imageKey: input.imageKey,
      elapsedMs: Date.now() - started,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return {
      ok: false,
      kind: "provider_failure",
      message: "The analysis failed unexpectedly. Please try again.",
    };
  }
}
