<p align="center">
  <strong>R E L O O P</strong><br/>
  <em>AI-powered circularity decision engine for electronics</em>
</p>

<p align="center">
  <a href="https://main.d1cln18prujyan.amplifyapp.com/">🌐 Live App</a> ·
  <a href="#quick-start">🚀 Quick Start</a> ·
  <a href="#aws-services--architecture">☁️ AWS Architecture</a> ·
  <a href="#deployment">📦 Deploy</a>
</p>

---

## What is ReLoop?

ReLoop gives every old electronic device a **next life**. Upload a single photo of a laptop, smartphone or tablet, and ReLoop:

1. **Analyses** the device's physical condition using AI (Amazon Bedrock / Amazon Nova 2 Lite)
2. **Scores** it with a transparent, deterministic **Next Life Score** (0–100)
3. **Recommends** the optimal circular pathway — **repair**, **refurbish**, **reuse**, **donate**, **resell** or **recycle**
4. **Explains** every decision with an attribute-by-attribute breakdown

The AI only supplies **observations**. Every score, recommendation and impact estimate is produced by a deterministic, tested engine — identical input always yields identical output and nothing is ever fabricated.

---

## Features

| Feature | Description |
|---|---|
| **AI-powered device analysis** | One photo is analysed for condition, repairability, reuse potential, resale value, and material recovery using Amazon Bedrock (Nova 2 Lite) — or a deterministic mock for offline use |
| **Deterministic scoring engine** | Transparent *Next Life Score* via weighted attribute scoring (condition 25%, repairability 20%, reuse potential 25%, resale potential 15%, material recovery 15%) |
| **Smart pathway recommendation** | 7 ordered rules evaluated top-down (first match wins, total fallback to recycle) to select the highest-value circular pathway |
| **Environmental impact estimation** | INR-based metrics — CO₂ saved, e-waste diverted, material value recovered — with clear sourcing and assumptions |
| **Decision receipt** | Printable HTML receipt documenting the full analysis, score breakdown, recommended pathway and completed actions |
| **Future simulator** | Explore how different repair/upgrade actions would change the score and impact in real time |
| **Pathway action plan** | Step-by-step actions for the chosen pathway with completion tracking |
| **Repair cost calculator** | Estimate repair costs based on identified issues |
| **Device DNA profile** | Visual fingerprint of the device's circularity attributes |
| **Evidence breakdown** | Transparent display of AI observations that fed the scoring engine |
| **Destination finder** | Locate nearby repair shops, donation centres and recyclers |
| **Priority selector** | Choose priorities (cost, environment, speed) to refine recommendations |
| **Zero-config local mode** | Works completely offline — no AWS account or API key required |
| **170 automated tests** | Vitest test suite covering engine, API, UI components and receipt generation |
| **Responsive design** | Works on mobile, tablet and desktop; `prefers-reduced-motion` honoured globally |

---

## Quick Start

### Prerequisites

- **Node.js** 20+ (24.x recommended)
- **npm** 10+

### Local Development (no AWS needed)

```bash
git clone https://github.com/parnika0110/ReLoop.git
cd ReLoop
npm install
npm run dev          # → http://localhost:3000
```

That's it. With no `.env.local`, the app runs entirely on local adapters:
- **Analysis**: deterministic mock (clearly labelled — never pretends to be Bedrock)
- **Image storage**: `.local-uploads/` directory
- **Scan records**: in-memory Map (resets on server restart)

### Production Build

```bash
npm run build        # Next.js optimised production build
npm run start        # serves the production bundle on port 3000
```

### Verification Commands

```bash
npm run typecheck    # tsc --noEmit — full TypeScript check
npm run lint         # ESLint
npm test             # Vitest — 20 files, 170 tests
node infra/build.mjs # bundle the Lambda (packaging only, no deploy)
```

---

## User Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  1. LANDING PAGE (/)                                              │
│     "Your old tech isn't waste yet" — begin scan                  │
├──────────────────────────────────────────────────────────────────┤
│  2. SCAN PAGE (/scan)                                             │
│     Drop or pick a photo (JPEG / PNG / WebP / HEIC, ≤ 8 MB)      │
│     → Upload with progress → AI analysis animation                │
├──────────────────────────────────────────────────────────────────┤
│  3. RESULT PAGE (/result/<scanId>)                                │
│     ┌─ Score Ring ────── Next Life Score (0-100)                  │
│     ├─ Recommendation ── Winning pathway + headline               │
│     ├─ Attribute Breakdown ── 5 weighted attributes               │
│     ├─ Evidence ──────── AI observations feeding the score        │
│     ├─ Impact ────────── CO₂, e-waste, material value (INR)       │
│     ├─ Future Simulator ── "What if I repair this?"               │
│     ├─ Action Plan ────── Step-by-step pathway actions            │
│     ├─ Repair Calculator ── Cost estimation                       │
│     ├─ Device DNA ─────── Visual circularity fingerprint          │
│     ├─ Destination Finder ── Nearby repair/recycle centres        │
│     └─ Decision Receipt ── Print / download                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## AWS Services & Architecture

ReLoop uses **7 AWS services** in production. Each adapter is environment-driven: set the variable to activate the real service, leave it empty to fall back to a local adapter.

### Architecture Diagram

```
                         ┌──────────────────┐
                         │   AWS Amplify     │
                         │  (Static Hosting) │
                         └────────┬─────────┘
                                  │ HTTPS
                                  ▼
┌─────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│   Browser   │────▶│  Amazon API Gateway     │────▶│  AWS Lambda      │
│  (Next.js)  │     │  (HTTP API, v2.0)       │     │  (Node.js 24.x)  │
└─────────────┘     └─────────────────────────┘     └──────┬──────────┘
                                                           │
                    ┌──────────────────────────────────────┼──────────────────┐
                    │                                      │                  │
                    ▼                                      ▼                  ▼
          ┌─────────────────┐                ┌──────────────────┐  ┌─────────────────┐
          │   Amazon S3     │                │ Amazon Bedrock   │  │ Amazon DynamoDB  │
          │ (Device Images) │                │ (AI Analysis)    │  │ (Scan Records)   │
          │  AES256 SSE     │                │ Nova 2 Lite      │  │ Single-table     │
          │  No public ACLs │                │ Forced tool call │  │ PK/SK + GSI1     │
          └─────────────────┘                └──────────────────┘  └─────────────────┘
                    │                                                        │
                    ▼                                                        ▼
          ┌─────────────────┐                                      ┌─────────────────┐
          │ Presigned URLs  │                                      │ Structured Logs  │
          │ (15 min TTL)    │                                      │ Amazon CloudWatch│
          └─────────────────┘                                      └─────────────────┘
```

### Service-by-Service Breakdown

#### 1. Amazon S3 — Device Image Storage

| Aspect | Detail |
|---|---|
| **Purpose** | Private bucket for uploaded device photos |
| **Operations** | `PutObject` (upload with `AES256` server-side encryption), presigned `GetObject` URLs (15 min TTL) for secure browser display |
| **Security** | `BlockPublicAcls: true`, `BlockPublicPolicy: true`, `IgnorePublicAcls: true`, `RestrictPublicBuckets: true`, `BucketOwnerEnforced` ownership, no public ACLs anywhere |
| **Lifecycle** | Images auto-expire after 365 days |
| **Fallback** | `.local-uploads/` directory when `RELOOP_IMAGE_BUCKET` is unset |
| **Code** | [`src/lib/aws/s3.ts`](file:///d:/ReLoop/src/lib/aws/s3.ts) |

#### 2. Amazon DynamoDB — Scan Record Persistence

| Aspect | Detail |
|---|---|
| **Purpose** | Single-table design to persist scan records (analysis results, scores, recommendations) |
| **Operations** | `PutItem` (create scan), `GetItem` (fetch by ID), `Query` on GSI1 (history lookup) |
| **Table design** | Partition key `PK = SCAN#<id>`, Sort key `SK = META`, Global Secondary Index `GSI1` for time-ordered queries |
| **Billing** | Pay-per-request (no provisioned capacity) |
| **Retention** | `DeletionPolicy: Retain` — table survives stack deletion |
| **Fallback** | In-memory `Map` when `RELOOP_SCAN_TABLE` is unset (resets on restart) |
| **Code** | [`src/lib/aws/dynamodb.ts`](file:///d:/ReLoop/src/lib/aws/dynamodb.ts) + [`schema.ts`](file:///d:/ReLoop/src/lib/aws/schema.ts) |

#### 3. Amazon Bedrock — AI Device Analysis

| Aspect | Detail |
|---|---|
| **Purpose** | AI-powered visual analysis of device condition from a single photo |
| **Model** | Amazon Nova 2 Lite (`global.amazon.nova-2-lite-v1:0`) via global inference profile |
| **Integration** | Converse API with a **forced tool schema** (`report_device_analysis`) — prose output is impossible by construction |
| **Validation** | Model output always passes through `parseModelPayload()` — schema-invalid responses are rejected, not repaired |
| **Region** | Configurable independently via `RELOOP_BEDROCK_REGION` (model access is granted per-region) |
| **Fallback** | Deterministic mock provider when `RELOOP_ANALYSIS_PROVIDER=mock` or unset |
| **Code** | [`src/analysis/bedrock.ts`](file:///d:/ReLoop/src/analysis/bedrock.ts) |

#### 4. AWS Lambda — Serverless Compute

| Aspect | Detail |
|---|---|
| **Purpose** | Runs the full scan pipeline (upload → Bedrock analysis → scoring → persistence) as a stateless function |
| **Runtime** | Node.js 24.x, 512 MB memory, 30s timeout, x86_64 |
| **Key design** | Thin transport adapter — delegates to the **same** shared pipeline (`src/lib/scan-pipeline`) as the local Next.js route. Zero business logic duplication |
| **Bundling** | esbuild ESM bundle via [`infra/build.mjs`](file:///d:/ReLoop/infra/build.mjs) |
| **Code** | [`infra/lambda/index.ts`](file:///d:/ReLoop/infra/lambda/index.ts) |

#### 5. Amazon API Gateway — HTTP API

| Aspect | Detail |
|---|---|
| **Purpose** | RESTful HTTP API exposing the Lambda to the browser |
| **Type** | HTTP API (payload v2.0, `$default` stage — no stage prefix in URL) |
| **Routes** | `POST /scans` (create scan), `GET /scans/{scanId}` (fetch scan), `OPTIONS /scans` + `OPTIONS /scans/{scanId}` (CORS preflight) |
| **CORS** | Enforced in the Lambda handler (not API Gateway) — error responses carry the same headers as successes |
| **Fallback** | When `NEXT_PUBLIC_API_BASE_URL` is unset, the frontend calls built-in Next.js API routes instead |

#### 6. Amazon CloudWatch — Structured Logging

| Aspect | Detail |
|---|---|
| **Purpose** | Structured JSON logs for all pipeline stages |
| **Log events** | `scan.upload`, `scan.fetch`, `[analysis]` — each with scanId, status, provider, and error kind |
| **Retention** | 14 days |
| **Log group** | `/aws/lambda/<stack-name>-scans` |

#### 7. AWS Amplify — Static Hosting

| Aspect | Detail |
|---|---|
| **Purpose** | Hosts the Next.js production build |
| **Live URL** | [main.d1cln18prujyan.amplifyapp.com](https://main.d1cln18prujyan.amplifyapp.com/) |
| **Integration** | Connected to the GitHub repository; auto-deploys on push to `main` |

#### IAM — Scoped Permissions

The Lambda's IAM role follows least-privilege:

| Permission | Scope |
|---|---|
| `s3:GetObject`, `s3:PutObject` | Image bucket objects only |
| `s3:GetBucketLocation`, `s3:ListBucket` | Image bucket metadata only |
| `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:Query` | Scan table + GSI1 only |
| `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream` | Nova 2 Lite inference profile + foundation model only |
| `AWSLambdaBasicExecutionRole` | CloudWatch log writing |

**No credentials, access keys, or tokens exist anywhere in this repository.** The Lambda gets its permissions solely from its IAM role.

---

## How It Works

### Request Flow

```
 photo ──► POST /api/scans (or POST /scans via API Gateway)
              │
              ├─ validate (content type, size ≤ 8MB, non-empty)  [server-enforced]
              ├─ store image ──── S3 (RELOOP_IMAGE_BUCKET)
              │                     or .local-uploads/
              ├─ AI analysis ──── Bedrock (forced tool call)
              │                     or deterministic mock
              │   └─ schema validation: the ONLY gateway into DeviceAnalysis
              ├─ decision engine (deterministic)
              │   ├─ score: Σ attribute × weight (weights sum to 1.0)
              │   ├─ recommendation: ordered rules, first match, total fallback
              │   └─ impact: labelled assumption-based estimates (INR)
              └─ persist record ── DynamoDB (RELOOP_SCAN_TABLE)
                                     or in-memory Map
                               ──► 201 UploadScanResponse

 GET /api/scans/:scanId  ──► scan record + time-limited image URL
                              (S3 presigned URL or local route)
```

### Scoring Model

| Attribute | Weight | What it measures |
|---|---|---|
| Condition | 25% | How intact the device is today |
| Repairability | 20% | How economically fixable it is |
| Reuse potential | 25% | How readily it serves another user |
| Resale potential | 15% | Market/economic value retained |
| Material recovery | 15% | Value recoverable at end of life |

### Recommendation Rules

7 rules evaluated top-down (first match wins). Cheaper, more value-preserving pathways are tried before destructive ones:

1. **Recycle** — device is unusable (condition gate)
2. **Repair** — fixable with high residual value
3. **Refurbish** — needs work but worth restoring
4. **Reuse** — functional enough for a new user
5. **Donate** — working but low resale value
6. **Resell** — good condition with market demand
7. **Recycle** — total fallback (always matches)

---

## Environment Configuration

Copy `.env.example` → `.env.local` and fill in values. **Never commit real credentials.**

| Variable | AWS Service | If Unset |
|---|---|---|
| `AWS_REGION` | Region for S3, DynamoDB, API Gateway, Lambda | `us-east-1` |
| `RELOOP_IMAGE_BUCKET` | S3 — private device images | `.local-uploads/` |
| `RELOOP_SCAN_TABLE` | DynamoDB — scan records | In-memory Map |
| `NEXT_PUBLIC_API_BASE_URL` | API Gateway base URL | Built-in Next.js routes |
| `RELOOP_ALLOWED_ORIGINS` | CORS origins for Lambda | `http://localhost:3000,http://localhost:3100` |
| `RELOOP_ANALYSIS_PROVIDER` | `mock` or `bedrock` | `mock` |
| `RELOOP_BEDROCK_MODEL_ID` | Bedrock inference profile | Unused unless provider is `bedrock` |
| `RELOOP_BEDROCK_REGION` | Region for Bedrock calls (can differ from `AWS_REGION`) | Same as `AWS_REGION` |
| `RELOOP_MAX_UPLOAD_BYTES` | Max upload size in bytes | 8 MiB |
| `RELOOP_ANALYSIS_TIMEOUT_MS` | Analysis timeout | Default |

---

## Deployment

### Infrastructure as Code (CloudFormation / SAM)

Everything AWS is declared in CloudFormation — **no resource is created by hand**:

| File | Purpose |
|---|---|
| [`infra/bootstrap.yaml`](file:///d:/ReLoop/infra/bootstrap.yaml) | Creates the S3 artifact bucket for `cloudformation package` |
| [`infra/template.yaml`](file:///d:/ReLoop/infra/template.yaml) | S3 image bucket, DynamoDB scan table, Lambda function, HTTP API, IAM role, CloudWatch log group |
| [`infra/lambda/index.ts`](file:///d:/ReLoop/infra/lambda/index.ts) | Lambda handler — thin transport adapter over the shared pipeline |
| [`infra/build.mjs`](file:///d:/ReLoop/infra/build.mjs) | esbuild bundler for the Lambda (ESM, Node 24, `@/*` path aliases) |

### Deploy to AWS (ap-south-1)

```bash
# 1. Bundle the Lambda
node infra/build.mjs

# 2. Create the artifact bucket (one-time)
aws cloudformation deploy \
  --template-file infra/bootstrap.yaml \
  --stack-name reloop-artifacts \
  --region ap-south-1 \
  --capabilities CAPABILITY_IAM

# 3. Package the Lambda bundle to S3
cd infra && aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket reloop-artifacts-<account>-ap-south-1 \
  --output-template-file packaged.yaml \
  --region ap-south-1 && cd ..

# 4. Deploy the full stack
aws cloudformation deploy \
  --template-file infra/packaged.yaml \
  --stack-name reloop-infra \
  --region ap-south-1 \
  --capabilities CAPABILITY_IAM
```

The stack outputs (`ApiBaseUrl`, `ImageBucketName`, `ScanTableName`, `LogGroupName`) go into `.env.local`. They are resource names, not secrets.

### AWS Amplify (Frontend)

The Next.js app is deployed to **AWS Amplify**, connected to the GitHub repo for auto-deploy on push to `main`.

**Live URL**: [https://main.d1cln18prujyan.amplifyapp.com/](https://main.d1cln18prujyan.amplifyapp.com/)

---

## Project Layout

```
src/
  app/                         Next.js App Router pages + API routes
    page.tsx                   Landing page — "Your old tech isn't waste yet"
    layout.tsx                 Root layout (Geist fonts, global CSS)
    globals.css                Design system (Tailwind v4 + custom properties)
    scan/                      Upload flow page
    result/[scanId]/           Score, recommendation, breakdown, simulator, actions
    api/scans/                 POST create scan, GET retrieve scan
    api/images/                Local image serving (disabled when S3 is active)
  components/
    scan/
      device-uploader.tsx      Drag-and-drop upload with progress + analysis states
      sample-button.tsx        Quick-start with sample device photos
    result/
      score-ring.tsx           Animated circular score visualisation
      attribute-breakdown.tsx  5-attribute weighted bar chart
      evidence-breakdown.tsx   AI observation evidence cards
      future-simulator.tsx     "What if?" scenario modeller
      pathway-action-plan.tsx  Step-by-step pathway actions with checkboxes
      repair-calculator.tsx    Issue-based repair cost estimator
      device-dna.tsx           Circularity attribute radar/fingerprint
      destination-finder.tsx   Nearby repair/recycle/donate centre lookup
      priority-selector.tsx    User priority preference selector
      waste-reveal.tsx         E-waste impact visualisation
      saved-section.tsx        Environmental savings display
      action-section.tsx       Quick action buttons (print, download, share)
    ui/                        Reusable primitives (button, badge)
  analysis/                    AI provider layer
    index.ts                   Provider factory (mock vs bedrock)
    bedrock.ts                 Amazon Bedrock integration (Converse API + forced tool)
    mock.ts                    Deterministic mock provider
    schema.ts                  Strict DeviceAnalysis schema validation
    fixtures.ts                Test fixtures
  engine/                      Deterministic scoring engine
    config.ts                  Weights, thresholds, 7 recommendation rules
    score.ts                   Weighted attribute scoring
    recommend.ts               Rule-based pathway recommendation
    impact.ts                  Environmental impact estimation
    impact-config.ts           Impact calculation parameters (INR-based)
    index.ts                   Engine entry point
  lib/
    scan-pipeline.ts           THE shared pipeline: upload → analysis → engine → persist
    env.ts                     Single point of access for all environment variables
    brand.ts                   Device display name resolution
    decision-receipt.ts        HTML/text receipt generator
    action-plan.ts             Pathway-specific action plans
    destinations.ts            Repair/recycle centre data
    evidence.ts                Evidence extraction from analysis
    potential.ts               Circularity potential calculator
    priority.ts                Priority-based recommendation adjustments
    passport.ts                Device circularity passport data
    aws/
      s3.ts                    S3 adapter (upload, presigned URLs, local fallback)
      dynamodb.ts              DynamoDB adapter (put, get, query, in-memory fallback)
      schema.ts                DynamoDB table schema definition
    api/                       Client-side API helpers
    calculator/                Repair cost calculation logic
  hooks/                       React hooks
  types/
    analysis.ts                DeviceAnalysis type contract
    scan.ts                    API request/response types + error kinds
    score.ts                   Score, Recommendation, NextLifePath types
infra/
  template.yaml                CloudFormation/SAM — all AWS resources
  bootstrap.yaml               Artifact bucket for packaging
  lambda/index.ts              API Gateway → shared pipeline adapter
  build.mjs                    esbuild Lambda bundler
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.4 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4, Lucide icons, Geist fonts |
| **AI** | Amazon Bedrock (Nova 2 Lite) via AWS SDK v3 |
| **Storage** | Amazon S3 (images), Amazon DynamoDB (records) |
| **Compute** | AWS Lambda (Node.js 24.x), Amazon API Gateway (HTTP API) |
| **Hosting** | AWS Amplify |
| **IaC** | AWS CloudFormation / SAM |
| **Testing** | Vitest (170 tests across 20 files) |
| **Bundling** | esbuild (Lambda), Turbopack (Next.js) |

---

## Testing

```bash
npm test             # Run all 170 tests
```

Test coverage spans:

| Area | Files | What's tested |
|---|---|---|
| Scoring engine | `engine.test.ts`, `score.test.ts` | Weight sums, score calculations, edge cases |
| Impact estimation | `impact.test.ts` | INR metrics, CO₂ calculations, boundary conditions |
| Analysis schema | `schema.test.ts` | Schema validation, rejection of invalid AI output |
| Analysis pipeline | `pipeline.test.ts` | End-to-end mock analysis flow |
| API routes | route tests | HTTP contracts, error handling |
| UI components | `score-ring.test.ts`, `attribute-breakdown.test.ts` | Rendering, accessibility |
| Decision receipt | `decision-receipt.test.ts` | HTML/text generation, XSS escaping |
| Utilities | `brand.test.ts`, `action-plan.test.ts`, `destinations.test.ts`, `evidence.test.ts`, `potential.test.ts`, `priority.test.ts` | Brand resolution, action plans, calculations |

---

## Verified Status

| Claim | Status |
|---|---|
| Local flow (upload → analysis → score → result) | ✅ Fully working, end-to-end tested |
| Unit/integration tests | ✅ 170 tests across 20 files |
| IaC deployment (`reloop-infra`, ap-south-1) | ✅ Deployed from `infra/` only — no manual resources |
| S3 image storage | ✅ Live-verified: AES256 encryption, presigned GET returns 200, bucket fully public-blocked |
| DynamoDB persistence | ✅ Live-verified: `SCAN#<id>` / `META` with GSI1 |
| API Gateway + Lambda + CORS | ✅ Live-verified from browser: OPTIONS 204 → POST 201 → GET 200 |
| CloudWatch logs | ✅ Structured `scan.upload` / `scan.fetch` / `[analysis]` events |
| Bedrock AI analysis | ✅ Live-verified with Amazon Nova 2 Lite — forced tool call returns schema-valid output |
| End-to-end browser → AWS → result | ✅ Upload → API Gateway → Lambda → S3 + Nova + DynamoDB → result page |
| Live web deployment (Amplify) | ✅ [main.d1cln18prujyan.amplifyapp.com](https://main.d1cln18prujyan.amplifyapp.com/) |
| In-memory records (dev) | ⚠️ Lost on restart — configure `RELOOP_SCAN_TABLE` for durability |

---

## Notable Design Decisions

- **No fake success.** A failed or low-quality analysis returns an honest failure with `score: null`; a store write failure sets `persisted: false`.
- **One pipeline, two frontends.** The Lambda and Next.js route both call `src/lib/scan-pipeline.ts` — zero business logic duplication.
- **Validation is server-enforced**, not just UI-side. AI output is rejected (not repaired) when it fails schema validation.
- **No credentials in code.** All AWS access is via IAM roles (Lambda) or environment variables (local dev). No secrets, tokens, or access keys exist in this repository.
- **Honest provenance.** Every result is stamped with its real provider (`mock` vs `bedrock`). A mock result is never presented as AI output.
- **`prefers-reduced-motion`** is honoured globally; decorative animation is deliberately minimal.

---

## Built with AI

- **Amazon Bedrock** is the AI analysis provider for the product itself (`RELOOP_ANALYSIS_PROVIDER=bedrock`). The deterministic mock (`mock`) is the default so the app works with zero credentials.
- This project was developed **with AI coding assistance**. The scoring engine, validation layer and test suite are deterministic and human-reviewable regardless of how they were authored.

---

## Dependencies & Licenses

All **direct** dependencies are permissive:

| Package | License |
|---|---|
| `next`, `react`, `react-dom`, `tailwindcss`, `clsx`, `tailwind-merge`, `vitest`, `eslint`, `esbuild` | MIT |
| `@aws-sdk/*`, `class-variance-authority`, `typescript` | Apache-2.0 |
| `lucide-react` | ISC |

Transitive weak-copyleft (indirect, expected):
- `@img/sharp-*` — LGPL-3.0-or-later (image processing via Next.js)
- `axe-core`, `lightningcss` — MPL-2.0 (file-level copyleft)

**No GPL or AGPL dependency is present.** Verify with `npm ls --all`.
