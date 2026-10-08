/**
 * BedrockAnalysisProvider — vision model analysis via Amazon Bedrock Converse.
 *
 * IMPORTANT HONESTY NOTE: this provider is only instantiated when
 * RELOOP_ANALYSIS_PROVIDER=bedrock AND RELOOP_BEDROCK_MODEL_ID are set. Any
 * other provider value selects the mock; "bedrock" without a model id yields a
 * provider that fails honestly on every call — the mock is never silently
 * substituted for a real one.
 *
 * Live status: structured output IS verified against real Bedrock from this
 * account — the forced tool call returns a schema-valid payload that passes
 * parseModelPayload (README "Honest status" tracks the end-to-end status).
 * The adapter is model-agnostic: the id comes from RELOOP_BEDROCK_MODEL_ID,
 * currently the Amazon Nova 2 Lite inference profile. Any rejection still
 * surfaces as provider_failure; a failure is never converted into a result.
 *
 * Design:
 *  - Structured output is FORCED via a tool definition ("report_device_analysis")
 *    with a JSON Schema — the model cannot reply with free prose.
 *  - The tool payload is still validated by parseModelPayload (never trusted).
 *  - Observations only: the prompt forbids inventing specs; uncertainty must
 *    be expressed as nulls + lower confidence, or `insufficient: true`.
 *  - Timeout via AbortSignal.timeout(env.analysisTimeoutMs).
 *  - Logging: model id, latency, outcome kind only — no credentials, no
 *    image bytes, no full model text.
 */
import {
  ConverseCommand,
  ConverseCommandInput,
  type BedrockRuntimeClient,
} from "@aws-sdk/client-bedrock-runtime";
import type { DocumentType as __DocumentType } from "@smithy/types";
import { env } from "@/lib/env";
import { parseModelPayload } from "@/analysis/schema";
import type {
  AnalysisInput,
  AnalysisOutcome,
  AnalysisProvider,
} from "@/types/analysis";

/** JSON Schema mirroring the DeviceAnalysis contract (strict, all fields required). */
const DEVICE_ANALYSIS_SCHEMA: { [key: string]: __DocumentType } = {
  type: "object",
  additionalProperties: false,
  required: [
    "deviceType",
    "brand",
    "model",
    "estimatedAge",
    "condition",
    "repairability",
    "reusePotential",
    "resalePotential",
    "materialRecoveryPotential",
    "observedIssues",
    "confidence",
  ],
  properties: {
    insufficient: {
      type: "boolean",
      description:
        "True when the image lacks enough information. Then also set reason/missing and leave the rest null-ish defaults.",
    },
    reason: { type: "string" },
    missing: { type: "array", items: { type: "string" } },
    deviceType: { type: "string", enum: ["laptop", "smartphone", "tablet"] },
    brand: { type: ["string", "null"] },
    model: { type: ["string", "null"] },
    estimatedAge: { type: ["number", "null"] },
    condition: { type: "number", minimum: 0, maximum: 100 },
    repairability: { type: "number", minimum: 0, maximum: 100 },
    reusePotential: { type: "number", minimum: 0, maximum: 100 },
    resalePotential: { type: "number", minimum: 0, maximum: 100 },
    materialRecoveryPotential: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 100 },
    observedIssues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "severity"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          severity: { type: "string", enum: ["minor", "moderate", "critical", "unknown"] },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are the device-analysis component of ReLoop, a circularity decision engine.
You observe a photo of an unwanted electronic device and report structured characteristics ONLY.

Rules:
- Only report what is visually observable. NEVER invent exact model numbers, specifications, or ages you cannot see.
- If a value cannot be determined, set it to null (or use your best coarse estimate only when the image supports it) and lower your confidence.
- deviceType must be laptop, smartphone, or tablet. If the photo clearly shows something else, or nothing usable, set insufficient=true with a reason.
- condition/repairability/reusePotential/resalePotential/materialRecoveryPotential/confidence are all 0-100 integers where 100 is best.
- observedIssues lists concrete visible defects with stable snake_case ids.
- You only report observations. You do NOT decide whether to repair, recycle, or resell — that is a separate deterministic engine.

Always respond by calling the report_device_analysis tool exactly once.`;

function imageFormat(contentType: string): "jpeg" | "png" | "webp" {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpeg";
}

/** Bedrock Converse does not accept HEIC — refuse honestly instead of sending garbage. */
function supportsFormat(contentType: string): boolean {
  return /jpeg|png|webp/.test(contentType);
}

export class BedrockAnalysisProvider implements AnalysisProvider {
  readonly id = "bedrock" as const;

  constructor(
    private readonly client: BedrockRuntimeClient,
    private readonly modelId: string,
  ) {}

  async analyze(input: AnalysisInput): Promise<AnalysisOutcome> {
    const requestedAt = new Date().toISOString();
    const source = { provider: "bedrock" as const, modelId: this.modelId, requestedAt };

    if (!supportsFormat(input.contentType)) {
      return {
        ok: false,
        kind: "insufficient_information",
        message: `Image format "${input.contentType}" is not supported by the vision model. Convert to JPEG or PNG.`,
        missing: ["JPEG or PNG image"],
      };
    }
    if (!input.bytes || input.bytes.byteLength === 0) {
      return {
        ok: false,
        kind: "insufficient_information",
        message: "No image bytes available for analysis.",
        missing: ["image"],
      };
    }

    const commandInput: ConverseCommandInput = {
      modelId: this.modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: [
            {
              image: {
                format: imageFormat(input.contentType),
                source: { bytes: input.bytes },
              },
            },
            { text: "Analyze this device photo." },
          ],
        },
      ],
      toolConfig: {
        tools: [
          {
            toolSpec: {
              name: "report_device_analysis",
              description: "Report structured observations about the device in the photo.",
              inputSchema: { json: DEVICE_ANALYSIS_SCHEMA },
            },
          },
        ],
        toolChoice: { tool: { name: "report_device_analysis" } },
      },
      inferenceConfig: { maxTokens: 1200, temperature: 0.1 },
    };

    const started = Date.now();
    try {
      const response = await this.client.send(new ConverseCommand(commandInput), {
        abortSignal: AbortSignal.timeout(env.analysisTimeoutMs),
      });
      const latencyMs = Date.now() - started;

      const toolUse = response.output?.message?.content?.find(
        (block) => "toolUse" in block && block.toolUse?.name === "report_device_analysis",
      );
      if (!toolUse || !("toolUse" in toolUse) || !toolUse.toolUse?.input) {
        console.warn("[analysis] bedrock: no tool payload", {
          modelId: this.modelId,
          latencyMs,
          stopReason: response.stopReason,
        });
        return {
          ok: false,
          kind: "malformed_output",
          message: "The model did not return the structured analysis payload.",
        };
      }

      const parsed = parseModelPayload(toolUse.toolUse.input);
      console.info("[analysis] bedrock: completed", {
        modelId: this.modelId,
        latencyMs,
        ok: parsed.ok,
        kind: parsed.ok ? undefined : parsed.kind,
      });

      if (!parsed.ok) {
        return { ok: false, kind: parsed.kind, message: parsed.message, missing: parsed.paths };
      }
      return { ok: true, analysis: parsed.analysis, source };
    } catch (error) {
      const latencyMs = Date.now() - started;
      if (error instanceof Error && error.name === "TimeoutError") {
        console.warn("[analysis] bedrock: timeout", { modelId: this.modelId, latencyMs });
        return {
          ok: false,
          kind: "timeout",
          message: `Analysis timed out after ${env.analysisTimeoutMs} ms.`,
        };
      }
      // Log only the error name/message — the SDK error may carry request
      // context, so we never log the full object.
      console.error("[analysis] bedrock: failure", {
        modelId: this.modelId,
        latencyMs,
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message.slice(0, 300) : "unknown",
      });
      return {
        ok: false,
        kind: "provider_failure",
        message:
          "The AI analysis service could not be reached. This is often expired AWS credentials or missing Bedrock model access.",
      };
    }
  }
}
