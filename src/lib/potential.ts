/**
 * "WHAT CAN STILL BE SAVED?" — presentation-only logic.
 *
 * Turns the existing DeviceAnalysis (five measured attributes + observed
 * visible issues) into honest recovery opportunities for the result page.
 *
 * HONESTY CONTRACT — this module must never:
 *  - claim a component was identified that a single external photo cannot
 *    show (battery health, RAM/storage, board faults → REQUIRES_INSPECTION),
 *  - introduce a number that is not one of the measured attribute values or
 *    a value interpolated from the observed issue (severity/label),
 *  - decide anything about the score or recommendation (that is the engine).
 *
 * Thresholds below are PRESENTATION gates for highlighting measured values,
 * not new measurements: a device only earns a "worth mentioning" card when
 * the real value clears the bar, and the value is always shown next to it.
 */
import type { DeviceAnalysis, ObservedIssue } from "@/types/analysis";
import type {
  NextLifePath,
  Recommendation,
  ReLoopScore,
} from "@/types/score";

/** One honest, evidence-backed opportunity — rendered as a card. */
export interface RecoveryOpportunity {
  id: string;
  title: string;
  /** What this opportunity is, grounded in the values quoted beside it. */
  detail: string;
  /** Exactly where the claim comes from — rendered verbatim as provenance. */
  evidence: string;
  /** Which of the six futures this opportunity unlocks. */
  paths: NextLifePath[];
}

/** A visible defect that needs safe handling before any path is chosen. */
export interface SafetyNote {
  id: string;
  /** The observed issue verbatim — never paraphrased into a diagnosis. */
  observed: string;
  guidance: string;
}

/**
 * What a single external photo structurally cannot show. Always displayed
 * with the opportunity cards so the feature's limits are as visible as its
 * claims.
 */
export const REQUIRES_INSPECTION: ReadonlyArray<{
  id: string;
  label: string;
  why: string;
}> = [
  {
    id: "battery_health",
    label: "Battery health",
    why: "Capacity and cell wear are not visible from outside the case.",
  },
  {
    id: "internal_components",
    label: "Internal components",
    why: "RAM, storage and the mainboard are hidden — a photo cannot confirm what is inside.",
  },
  {
    id: "board_faults",
    label: "Board-level faults",
    why: "Corrosion, liquid damage and solder faults require opening the device.",
  },
  {
    id: "accessories",
    label: "Charger & accessories",
    why: "Not in frame, so not assessed — accessory condition needs hands-on checking.",
  },
];

/** Visible issues that call for careful handling before deciding. */
const CAUTION_ISSUE = /batter|swell|bent|overheat|corros|liquid|water|damaged port/i;
/** Visible issues that are the classic display-repair candidate. */
const SCREEN_ISSUE = /screen|glass|display|panel/i;

/* Presentation gates — documented, conservative, value-shown-alongside. */
const GATE = {
  intactCondition: 60,
  repairableRepairability: 60,
  fixableCondition: 70,
  reusableReuse: 50,
  marketableResale: 55,
  recoverableMaterial: 40,
} as const;

function findIssue(
  issues: ObservedIssue[],
  pattern: RegExp,
): ObservedIssue | undefined {
  return issues.find((issue) => pattern.test(`${issue.id} ${issue.label}`));
}

function issueEvidence(issue: ObservedIssue): string {
  return `Observed in your photo: “${issue.label}” · ${issue.severity}`;
}

function attributeEvidence(...parts: string[]): string {
  return `Measured from your photo: ${parts.join(", ")}`;
}

/**
 * Recovery opportunities visible from this analysis, in reading order:
 * repair-shaped opportunities first (they preserve the most), material
 * recovery last (the floor that always exists).
 *
 * Deterministic: same analysis → same list, same wording.
 */
export function recoveryOpportunities(
  analysis: DeviceAnalysis,
): RecoveryOpportunity[] {
  const out: RecoveryOpportunity[] = [];
  const { observedIssues: issues } = analysis;

  const screen = findIssue(issues, SCREEN_ISSUE);
  if (screen) {
    out.push({
      id: "display_repair",
      title: "A display is a fixable thing",
      detail: `The visible fault is the screen. Repairability measures ${analysis.repairability}/100 — a display replacement is the first quote to get, and that number says whether it will pay.`,
      evidence: issueEvidence(screen),
      paths: ["repair", "refurbish"],
    });
  } else if (
    !issues.some((issue) => issue.severity === "critical") &&
    analysis.condition >= GATE.intactCondition
  ) {
    out.push({
      id: "intact_exterior",
      title: "Still whole on the outside",
      detail: `No critical damage is visible and condition measures ${analysis.condition}/100 — nothing structural is asking to be thrown away.`,
      evidence: attributeEvidence(`condition ${analysis.condition}/100`),
      paths: ["reuse", "donate", "resell"],
    });
  }

  if (
    analysis.repairability >= GATE.repairableRepairability &&
    analysis.condition < GATE.fixableCondition &&
    !screen
  ) {
    out.push({
      id: "fixable",
      title: "Fixable, not finished",
      detail: `Repairability ${analysis.repairability}/100 with condition ${analysis.condition}/100 describes a device with something fixable rather than something dead.`,
      evidence: attributeEvidence(
        `repairability ${analysis.repairability}/100`,
        `condition ${analysis.condition}/100`,
      ),
      paths: ["repair"],
    });
  }

  if (analysis.reusePotential >= GATE.reusableReuse) {
    out.push({
      id: "reuse_life",
      title: "Another user is waiting",
      detail: `Reuse potential ${analysis.reusePotential}/100 — as it is today, this device can still do its job for someone.`,
      evidence: attributeEvidence(`reuse potential ${analysis.reusePotential}/100`),
      paths: ["reuse", "donate"],
    });
  }

  if (analysis.resalePotential >= GATE.marketableResale) {
    out.push({
      id: "market_value",
      title: "The market still pays",
      detail: `Resale potential ${analysis.resalePotential}/100 — part of this device's value has not evaporated yet.`,
      evidence: attributeEvidence(`resale potential ${analysis.resalePotential}/100`),
      paths: ["resell", "refurbish"],
    });
  }

  if (analysis.materialRecoveryPotential >= GATE.recoverableMaterial) {
    out.push({
      id: "materials",
      title: "Even at the end, nothing is wasted",
      detail: `Material recovery ${analysis.materialRecoveryPotential}/100 — if no working life remains, its materials still re-enter the supply chain instead of a landfill.`,
      evidence: attributeEvidence(
        `material recovery ${analysis.materialRecoveryPotential}/100`,
      ),
      paths: ["recycle"],
    });
  }

  return out;
}

/**
 * Visible issues that deserve careful handling — quoted verbatim, with
 * generic safety guidance (never a diagnosis the model did not make).
 */
export function safetyNotes(analysis: DeviceAnalysis): SafetyNote[] {
  return analysis.observedIssues
    .filter((issue) => CAUTION_ISSUE.test(`${issue.id} ${issue.label}`))
    .map((issue) => ({
      id: issue.id,
      observed: `“${issue.label}” · ${issue.severity} — observed in your photo`,
      guidance:
        "Have this checked before deciding: damaged batteries and bent housings need professional handling, not a quick decision.",
    }));
}

/** Plain-English interpretation of the Device DNA — only if supported. */
export interface DnaInsight {
  /** The concise headline statement. */
  statement: string;
  /** One sentence naming the real values behind the statement. */
  detail: string;
}

/**
 * Statement + support, derived strictly from the measured score and the
 * engine's recommendation. Returns null only if the score has no
 * contributions to speak about (defensive — the API never persists that).
 */
export function dnaInsight(
  score: ReLoopScore,
  recommendation: Recommendation,
): DnaInsight | null {
  const top = score.contributions.reduce((best, c) =>
    c.weighted > best.weighted ? c : best,
  );
  if (!top) return null;

  const support = `${top.label} (${top.value}/100) carries the most weight in a Next Life Score of ${score.overall}/100.`;

  if (recommendation.path === "recycle") {
    return {
      statement: "No working life left — but its materials still count.",
      detail: support,
    };
  }

  return {
    statement: "Your device still has meaningful potential for another life.",
    detail: support,
  };
}
