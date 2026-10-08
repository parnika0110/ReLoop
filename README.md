# ReLoop — AI-powered circularity decision engine

Give every old device a **next life**. ReLoop scans one photo of a laptop,
smartphone or tablet, extracts measurable condition attributes, then computes a
**Next Life Score** and a single recommended pathway — repair, refurbish, reuse,
donate, resell or recycle — with a transparent, attribute-by-attribute
breakdown of *why*.

The AI only supplies **observations**. Every score, recommendation and impact
estimate is produced by a deterministic, tested engine, so identical input
always yields identical output and nothing is ever fabricated.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

That's it — **no AWS account and no API key are required**. With no
`.env.local`, the app runs entirely locally on clearly-labelled adapters
(deterministic mock analysis, private local image store, in-memory scan
records). It never pretends AWS is configured when it isn't.

### Production

```bash
npm run build
npm run start        # serves the production build
```

### Verification commands

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run  (7 files, 101 tests)
npm run build        # production build
node infra/build.mjs # bundle the analysis Lambda (packaging only)
```

### First run-through

1. `/` — landing page
2. `/scan` — drop or pick a photo (JPEG / PNG / WebP / HEIC, ≤ 8 MB)
3. `/result/<scanId>` — device identity, Next Life Score, recommendation,
   attribute breakdown, impact estimates, Future Simulator, next actions

---

## How it works

```
 photo ──► POST /api/scans
             │
             ├─ validate (content type, size, non-empty)   [server-enforced]
             ├─ store image    ── S3  (RELOOP_IMAGE_BUCKET)      ┐
             │                          local .local-uploads/    ├ id reported in response
             ├─ AI analysis    ── Bedrock or local mock          │
             │      └─ schema validation: the ONLY gateway into DeviceAnalysis
             ├─ decision engine (deterministic)
             │      ├─ score: Σ attribute × weight  (weights sum to 1)
             │      ├─ recommendation: ordered rules, first match, total fallback
             │      └─ impact: labelled assumption-based estimates
             └─ persist record ── DynamoDB (RELOOP_SCAN_TABLE)    ┐
                                   in-memory Map (dev)           ┘ persisted flag is honest
                              ──► 201 UploadScanResponse

 GET /api/scans/:scanId  ──► scan + time-limited image URL
                              (S3 presigned URL when configured, local route otherwise)

 GET /api/images/*       ──► local store only; returns 503 when S3 is configured
```

### Layer map

| Concern | Implementation | Notes |
|---|---|---|
| Scoring | `src/engine/` | Pure functions, weights in `config.ts`, 7 rules (first match wins, always-total fallback) |
| AI analysis | `src/analysis/` | `parseModelPayload()` is the only entry point into `DeviceAnalysis` |
| Image storage | `src/lib/aws/s3.ts` | Private bucket, `AES256` SSE, presigned read URLs, no public ACLs |
| Persistence | `src/lib/aws/dynamodb.ts` + `schema.ts` | Single-table design `SCAN#<id>` / `META`, GSI1 for future history |
| HTTP contract | `src/types/scan.ts` | Typed request/response + `ApiErrorBody` error kinds |
| Env access | `src/lib/env.ts` | Every secret/config read goes through here |

Design detail: `src/analysis/README.md` (AI layer) and `src/engine/README.md`
(scoring rules, weights, confidence handling) document each subsystem.

---

## AWS configuration

Configuration is **entirely environment-driven**; each adapter switches on
whenever its variable is set, and reports its real identity back to the client
(`storage`, `repository`, `persisted`).

| Variable | Service | If unset |
|---|---|---|
| `AWS_REGION` | AWS region for S3, DynamoDB, API Gateway, Lambda | defaults to `us-east-1` |
| `RELOOP_IMAGE_BUCKET` | S3 — private device images | local `.local-uploads/` store |
| `RELOOP_SCAN_TABLE` | DynamoDB — scan records | in-memory Map (**resets on restart**) |
| `NEXT_PUBLIC_API_BASE_URL` | API Gateway base URL | built-in Next.js API routes (**local fallback**) |
| `RELOOP_ALLOWED_ORIGINS` | browser origins the Lambda allows by CORS | `http://localhost:3000,http://localhost:3100` |
| `RELOOP_ANALYSIS_PROVIDER` | `mock` or `bedrock` | `mock` |
| `RELOOP_BEDROCK_MODEL_ID` | Bedrock inference profile | unused unless provider is `bedrock` |
| `RELOOP_BEDROCK_REGION` | region the Bedrock **client** calls — Bedrock model access is granted per-region and can differ from `AWS_REGION` | same as `AWS_REGION` |

Copy `.env.example` → `.env.local` and fill in values. **Never commit real
credentials.** No secrets, access keys or tokens exist anywhere in this
repository, and no AWS credentials reach the browser — the browser only ever
speaks the HTTP contract in `src/types/scan.ts`.

AWS calls actually implemented:

- **S3** — `PutObject` (private, `ServerSideEncryption: "AES256"`, no ACL),
  `GetObject` via presigned URL (15 min), **no public access anywhere**
- **DynamoDB** — `PutItem`, `GetItem`, `Query` on `GSI1` (parameterised, no
  string-built queries)
- **Bedrock** — Converse API with a **forced tool schema** (`report_device_analysis`);
  prose output is impossible by construction, and the result still passes
  through `parseModelPayload()`
- **API Gateway + Lambda** — `infra/` deploys an HTTP API in front of a Lambda
  that runs the **same** shared pipeline (`src/lib/scan-pipeline`) as the
  Next.js route. The browser talks to the gateway whenever
  `NEXT_PUBLIC_API_BASE_URL` is set, and falls back to the Next.js route when it
  is not — no frontend code changes either way

### Infrastructure (IaC)

Everything AWS is declared in CloudFormation — **no resource in this project is
created by hand**:

| File | Creates |
|---|---|
| `infra/bootstrap.yaml` | the artifact bucket `aws cloudformation package` uploads the Lambda bundle to |
| `infra/template.yaml` | private S3 image bucket, DynamoDB scan table (matches `SCAN_TABLE_SCHEMA`), analysis Lambda, HTTP API, scoped IAM role, CloudWatch log group |
| `infra/lambda/index.ts` | the Lambda handler — a thin transport adapter over `src/lib/scan-pipeline` |
| `infra/build.mjs` | bundles the handler with esbuild (ESM, Node 24, `@/*` paths honoured) |

Deploy to `ap-south-1`:

```bash
node infra/build.mjs
aws cloudformation deploy --template-file infra/bootstrap.yaml \
  --stack-name reloop-artifacts --region ap-south-1 --capabilities CAPABILITY_IAM
(cd infra && aws cloudformation package --template-file template.yaml \
  --s3-bucket reloop-artifacts-<account>-ap-south-1 \
  --output-template-file packaged.yaml --region ap-south-1)
aws cloudformation deploy --template-file infra/packaged.yaml \
  --stack-name reloop-infra --region ap-south-1 --capabilities CAPABILITY_IAM
```

The stack outputs (`ApiBaseUrl`, `ImageBucketName`, `ScanTableName`,
`LogGroupName`) are what go into `.env.local`. They are resource names, not
secrets — **no credentials are stored in this repository or in the template**;
the Lambda gets its permissions only from its IAM role.

### Honest status

| Claim | Status |
|---|---|
| Local flow (upload → analysis → score → result) | ✅ fully working, end-to-end tested (unset `.env.local` to use it) |
| Unit/integration tests | ✅ 101 tests across 7 files |
| IaC deployment (`reloop-infra`, ap-south-1) | ✅ deployed and re-deployed from `infra/` only — no manually created resources |
| S3 image storage | ✅ live-verified: object written with `AES256`, presigned GET returns 200, bucket fully public-blocked (anonymous GET → 403) |
| DynamoDB persistence | ✅ live-verified: record stored under `SCAN#<id>` / `META` with GSI1, readable via `Query` |
| API Gateway + Lambda + CORS | ✅ live-verified **from the browser**: OPTIONS 204 → POST 201 → GET 200 against the deployed URL |
| CloudWatch logs | ✅ live-verified: structured `scan.upload` / `scan.fetch` / `[analysis]` events in `/aws/lambda/reloop-infra-scans` |
| Result retrieval from the browser | ✅ live-verified: the result page fetched the scan from API Gateway and rendered the presigned S3 image |
| **Bedrock image analysis** | ✅ **live-verified** with Amazon Nova 2 Lite — `global.amazon.nova-2-lite-v1:0` in ap-south-1. The forced `report_device_analysis` tool returns schema-valid output that passes `parseModelPayload` (e.g. `laptop`, condition 40, `screen_damage` on a cracked-screen photo). The Lambda role's IAM is scoped to exactly that inference profile plus `amazon.nova-2-lite-v1:0`. The previously configured Claude Haiku 4.5 profile was unusable from this account (`AccessDeniedException: INVALID_PAYMENT_INSTRUMENT`) |
| Complete browser → AWS → result scan **with an AI score** | ✅ **verified end-to-end in the browser**: upload → API Gateway 201 → Lambda → S3 + Nova analysis + DynamoDB → result page fetched via API Gateway and rendered the presigned S3 image. Scan `04e7fe8a…` is `status: complete`, `score 52`, `recycle`, and the UI is labelled `BEDROCK · GLOBAL.AMAZON.NOVA-2-LITE-V1:0 · RELOOP-ENGINE-1.0.0` |
| In-memory records | ⚠️ dev only — **lost on server restart**; configure `RELOOP_SCAN_TABLE` for durability |

No feature in this README is claimed to work unless it works.

---

## Built with AI

- **Amazon Bedrock** is the AI analysis provider option for the product itself
  (`RELOOP_ANALYSIS_PROVIDER=bedrock`); the deterministic local fixture
  provider (`mock`) is the default so the app runs with zero credentials.
  Every result is stamped with its real provenance
  (`analysisSource.provider`), so a mock result is never presented as model output.
- This project was developed **with AI coding assistance** (an AI agent
  working in this repository). The scoring engine, validation layer and test
  suite are deterministic and human-reviewable regardless of how they were
  authored.

---

## Dependencies and licenses

All **direct** dependencies are permissive: `next`, `react`, `react-dom`,
`tailwindcss`, `clsx`, `tailwind-merge`, `vitest`, `eslint`, `esbuild` (MIT);
`@aws-sdk/*`, `class-variance-authority`, `typescript` (Apache-2.0);
`lucide-react` (ISC).

Transitive dependencies are overwhelmingly MIT/Apache-2.0/ISC/BSD. The only
weak-copyleft packages are indirect and expected:

- `@img/sharp-*` — **LGPL-3.0-or-later** (image processing, pulled in by Next.js)
- `axe-core`, `lightningcss` — **MPL-2.0** (file-level copyleft)

**No GPL or AGPL dependency is present.** Verify any time with
`npm ls --all` and your license-checking tool of choice.

---

## Project layout

```
src/
  app/                  pages + API routes
    page.tsx            landing
    scan/               upload flow
    result/[scanId]/    score, recommendation, breakdown, simulator, actions
    api/scans/          POST create, GET retrieve
    api/images/         local image serving (disabled when S3 is configured)
  components/
    scan/               device uploader (progress, analyzing, errors, retry)
    result/             score ring, breakdown, simulator, actions
    ui/                 button, badge
  analysis/             AI provider + strict schema validation (+ README)
  engine/               deterministic scoring/recommendation/impact (+ README)
  lib/aws/              S3 + DynamoDB adapters, table schema, env selection
  lib/scan-pipeline.ts  the ONE upload→analysis→engine→persist pipeline
  lib/env.ts            the only place that reads process.env
  types/                shared typed contracts
infra/
  template.yaml         CloudFormation/SAM: S3 + DynamoDB + Lambda + HTTP API
  bootstrap.yaml        artifact bucket used by `cloudformation package`
  lambda/index.ts       API Gateway → shared pipeline adapter
  build.mjs             esbuild bundling for the Lambda
```

## Notable decisions

- **No fake success.** A failed or low-quality analysis returns an honest
  failure with `score: null`; a store write failure sets `persisted: false`.
- **Validation is server-enforced**, not just UI-side, and AI output is
  rejected rather than repaired when it fails schema validation.
- **`prefers-reduced-motion`** is honoured globally; decorative animation is
  deliberately minimal.
