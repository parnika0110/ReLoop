/**
 * Repair vs. Replace Financial Decision Calculator.
 *
 * Grounded in Indian electronics repair economics:
 * - Compares estimated repair costs against replacement options.
 * - Incorporates expected post-repair life extension and retained economic value.
 * - Does NOT alter the deterministic Next Life Score.
 */
import { formatInr } from "@/lib/utils";

export interface RepairVsReplaceInput {
  /** User or technician repair quote in INR */
  repairQuoteInr: number;
  /** Estimated device value today as-is in INR */
  currentValueInr: number;
  /** Estimated fair market value after successful repair in INR */
  postRepairValueInr: number;
  /** Alternative replacement price (new, refurbished, or used) in INR */
  replacementPriceInr: number;
  /** Additional anticipated costs (e.g. charger, diagnostics, battery) */
  additionalCostsInr?: number;
}

export type DecisionRecommendation = "repair" | "replace" | "borderline";

export interface RepairVsReplaceResult {
  totalRepairCostInr: number;
  netBenefitOfRepairInr: number;
  repairToPostRepairRatio: number; // Quote / PostRepairValue
  repairToReplacementRatio: number; // Quote / ReplacementPrice
  recommendation: DecisionRecommendation;
  headline: string;
  explanation: string;
}

/**
 * Calculates financial trade-offs between repairing and replacing.
 * Benchmarked to standard consumer electronics 50% rule:
 * If repair cost exceeds 50% of the replacement price or post-repair value, replacement is financially favored.
 */
export function calculateRepairVsReplace(input: RepairVsReplaceInput): RepairVsReplaceResult {
  const quote = Math.max(0, input.repairQuoteInr || 0);
  const additional = Math.max(0, input.additionalCostsInr || 0);
  const totalRepairCost = quote + additional;

  const currentVal = Math.max(0, input.currentValueInr || 0);
  const postRepairVal = Math.max(currentVal, input.postRepairValueInr || 0);
  const replacementPrice = Math.max(0, input.replacementPriceInr || 0);

  // Net benefit of repair = Post Repair Value - Total Repair Cost - Current As-Is Value
  const netBenefitOfRepair = postRepairVal - totalRepairCost - currentVal;

  const repairToPostRepairRatio = postRepairVal > 0 ? (totalRepairCost / postRepairVal) : 1;
  const repairToReplacementRatio = replacementPrice > 0 ? (totalRepairCost / replacementPrice) : 1;

  let recommendation: DecisionRecommendation = "borderline";
  let headline = "";
  let explanation = "";

  if (totalRepairCost === 0 && replacementPrice === 0) {
    recommendation = "borderline";
    headline = "Enter repair quote to calculate";
    explanation = "Provide an estimated repair quote or diagnostic cost to evaluate financial feasibility.";
  } else if (totalRepairCost > postRepairVal || (replacementPrice > 0 && repairToReplacementRatio > 0.65)) {
    recommendation = "replace";
    headline = "Replacement is financially favored";
    explanation = `The repair investment (${formatInr(totalRepairCost)}) exceeds 65% of replacement price or is greater than the post-repair device value (${formatInr(postRepairVal)}). Economic return on repair is negative.`;
  } else if (repairToPostRepairRatio < 0.45 && netBenefitOfRepair >= 0) {
    recommendation = "repair";
    headline = "Repairing offers clear positive value";
    explanation = `Estimated repair cost (${formatInr(totalRepairCost)}) is under 45% of post-repair value (${formatInr(postRepairVal)}), preserving ${formatInr(netBenefitOfRepair)} in net equity compared to disposing as-is.`;
  } else {
    recommendation = "borderline";
    headline = "Near the break-even threshold";
    explanation = `Total repair (${formatInr(totalRepairCost)}) is between 45% and 65% of device worth. Consider repair if data retention or sentimental value is high; otherwise compare refurbished replacement warranty.`;
  }

  return {
    totalRepairCostInr: totalRepairCost,
    netBenefitOfRepairInr: netBenefitOfRepair,
    repairToPostRepairRatio: Math.round(repairToPostRepairRatio * 100) / 100,
    repairToReplacementRatio: Math.round(repairToReplacementRatio * 100) / 100,
    recommendation,
    headline,
    explanation,
  };
}
