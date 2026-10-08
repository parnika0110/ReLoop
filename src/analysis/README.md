# AI analysis layer

Structured device analysis. The AI only extracts observations/attributes —
scoring and the recommendation live in `src/engine` and are deterministic.

## Modules

- `schema.ts` — runtime validation. `parseModelPayload` is the ONLY gateway
  into `DeviceAnalysis`: strict 0–100 checks, supported device types only,
  nulls preserved (never invented), model-declared `insufficient` honoured,
  malformed output rejected (not repaired). `extractJsonObject` tolerates
  code fences but the payload still must validate.
- `mock.ts` — `MockAnalysisProvider`, local fixtures for development/tests.
  Refuses images <4 KB with `insufficient_information`. Every result is
  stamped `source.provider: "mock"`.
- `bedrock.ts` — `BedrockAnalysisProvider`, Amazon Bedrock Converse with a
  FORCED tool schema (the model must call `report_device_analysis`; prose is
  impossible by construction) + `AbortSignal` timeout. Output still passes
  through `parseModelPayload`.

  **Status: implemented but NOT live-tested** — AWS credentials were expired
  in this environment when it was written. Activate with
  `RELOOP_ANALYSIS_PROVIDER=bedrock` + `RELOOP_BEDROCK_MODEL_ID` after
  `aws login` and Bedrock model access are confirmed.
- `fixtures.ts` — representative laptop / smartphone / tablet payloads plus
  insufficient / unsupported / malformed cases.
- `index.ts` — `createAnalysisProvider()` (explicit selection, no silent
  mock fallback when bedrock is requested) and `runAnalysis()` (timeout-safe,
  never throws, logs only provider/kind/latency — no secrets, no image bytes).

## Tests

`schema.test.ts` (validation matrix) + `pipeline.test.ts` (provider →
validation → outcome) run against the representative fixtures.
