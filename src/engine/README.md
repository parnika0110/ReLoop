# ReLoop Decision Engine

Deterministic scoring + recommendation. The AI supplies observations only —
every score and recommendation originates here, from measured attributes.

## Public API

```ts
import { runEngine } from "@/engine";

const result = runEngine(deviceAnalysis);
// {
//   score: { overall, contributions[], engineVersion },
//   recommendation: { path, headline, rationale, matchedRuleId },
//   confidence,                 // propagated from the analysis, never altered
//   contributingFactors[],      // ranked lift/drag per attribute
//   reasoning,                  // attribute-grounded explanation (+ uncertainty caveat)
//   engineVersion
// }
```

Pure, synchronous, no I/O — identical input always yields identical output.

## Scoring model (`config.ts` → `SCORE_WEIGHTS`)

| Attribute | Weight |
|---|---|
| condition | 25% |
| repairability | 20% |
| reusePotential | 25% |
| resalePotential | 15% |
| materialRecoveryPotential | 15% |

`score = Σ value × weight`, weights sum to 1, both bounds asserted in tests.
Attributes are validated 0–100 upstream (`src/analysis/schema.ts`); `score.ts`
still clamps defensively.

## Recommendation rules (`config.ts` → `RECOMMENDATION_RULES`)

Evaluated top-down, **first match wins**; the last rule is an unconditional
fallback so evaluation is total. Each threshold is documented inline with its
rationale. Summary:

1. `recycle-unusable` — reuse < 35 AND repairability < 40
2. `repair-fixable` — repairability ≥ 70, 35 ≤ condition < 70, reuse ≥ 40
3. `resell-market` — resale ≥ 80 AND condition ≥ 75
4. `refurbish-restorable` — 45 ≤ condition < 75, resale ≥ 55, reuse ≥ 50
5. `reuse-working` — condition ≥ 70 AND reuse ≥ 70
6. `donate-functional` — condition ≥ 45, reuse ≥ 45, resale < 55
7. `fallback-recover` — always → recycle

Ordering rationale: cheap/preserving paths before destructive ones (recycle
appears first as an unusable-device gate and last as the fallback); economic
value (resell) before giving value away (donate).

## Confidence handling

Confidence never changes which path fires — it only appends an uncertainty
caveat to `reasoning` when below `LOW_CONFIDENCE_THRESHOLD` (40), telling the
user to re-scan before acting. Deterministic rules + honest uncertainty.

## Tuning

Rules and thresholds are plain data in `config.ts` — adjust there, tests in
`engine.test.ts` will catch coverage regressions (all six paths must remain
reachable; the fallback must remain total).
