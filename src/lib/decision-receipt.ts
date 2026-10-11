/**
 * Decision Receipt generator & print/download utility.
 *
 * Formats a clean, authoritative Circular Economy Decision Receipt
 * for an evaluated device. Generates formatted text/markdown and triggers
 * clean browser print or text file download.
 *
 * No external PDF dependencies needed — uses native browser print stylesheets
 * and text blob downloads.
 */

import type { DeviceAnalysis } from "@/types/analysis";
import type { Recommendation, ReLoopScore } from "@/types/score";
import type { NextLifePath } from "@/types/score";
import { deviceDisplayName } from "@/lib/brand";

export interface DecisionReceiptData {
  /** Scan identifier */
  scanId: string;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** Analysis result */
  analysis: DeviceAnalysis;
  /** Scoring result */
  score: ReLoopScore;
  /** Recommendation result */
  recommendation: Recommendation;
  /** Pathway selected by user (optional) */
  chosenPathway?: NextLifePath;
  /** Engine details (optional) */
  engine?: {
    confidence: number;
    contributingFactors: {
      key: string;
      label: string;
      value: number;
      effect: string;
      contribution: number;
    }[];
    reasoning: string;
    engineVersion: string;
  } | null;
  /** List of actions the user has marked completed */
  completedActions?: string[];
}

export function generateDecisionReceiptText(data: DecisionReceiptData): string {
  const name = escHtml(deviceDisplayName(analysis));
  const dateStr = new Date(createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Safely escape dynamic strings used in HTML
  const escapedName = safeStr(name);
  const escapedDeviceType = safeStr(analysis.deviceType?.toUpperCase());
  const escapedEstimatedAge = analysis.estimatedAge !== null ? `${analysis.estimatedAge} years` : "Unknown";
  const escapedConfidence = `${analysis.confidence}/100`;
  const escapedScoreOverall = `${score.overall}/100`;
  const escapedRecommendedPathway = `${recommendation.headline} (${recommendation.path.toUpperCase()})`;
  const escapedEngineVersion = safeStr(score.engineVersion);
  const escapedRuleId = safeStr(recommendation.matchedRuleId);


  const lines: string[] = [
    "============================================================",
    "                   RELOOP DECISION RECEIPT                  ",
    "            Circular Electronics Assessment Report          ",
    "============================================================",
    `Receipt ID:      REC-${scanId.slice(0, 8).toUpperCase()}`,
    `Date:            ${dateStr}`,
    `Device:          ${name}`,
    `Category:        ${analysis.deviceType.toUpperCase()}`,
    `Estimated Age:   ${analysis.estimatedAge !== null ? `${analysis.estimatedAge} years` : "Unknown"}`,
    `Assessment Conf: ${analysis.confidence}/100`,
    "------------------------------------------------------------",
    "CIRCULARITY SCORE & ENGINE VERDICT:",
    `  Next Life Score:       ${score.overall}/100`,
    `  Recommended Pathway:   ${recommendation.headline} (${recommendation.path.toUpperCase()})`,
    `  Scoring Engine:        ${score.engineVersion}`,
    `  Rule Matched:          ${recommendation.matchedRuleId}`,
    "",
    "ATTRIBUTE BREAKDOWN:",
    ...score.contributions.map(
      (c) => `  - ${c.label}: ${c.value}/100 (weight ${Math.round(c.weight * 100)}%)`
    ),
    "------------------------------------------------------------",
    "KEY OBSERVATIONS:",
  ];

  if (analysis.observedIssues.length === 0) {
    lines.push("  - No major physical defects identified from visual inspection.");
  } else {
    for (const issue of analysis.observedIssues) {
      lines.push(`  - [${issue.severity.toUpperCase()}] ${issue.label}`);
    }
  }

  lines.push("------------------------------------------------------------");
  lines.push("ACTION PLAN & OUTCOME STATUS:");
  lines.push(`  Chosen Pathway:        ${(chosenPathway || recommendation.path).toUpperCase()}`);
  lines.push(`  Completed Actions:     ${completedActions.length} recorded`);
  for (const act of completedActions) {
    lines.push(`    [X] ${act.replace(/_/g, " ")}`);
  }

  lines.push("------------------------------------------------------------");
  lines.push("PROVENANCE & COMPLIANCE NOTICE:");
  lines.push("  This receipt documents a non-destructive circular evaluation");
  lines.push("  conducted via the ReLoop engine. It adheres to Indian E-Waste");
  lines.push("  Management Rules (2022) criteria for authorized handling.");
  lines.push("============================================================");

  return lines.join("\n");
}

export function generateDecisionReceiptHtml(data: DecisionReceiptData): string {
  const { scanId, createdAt, analysis, score, recommendation, engine, chosenPathway, completedActions = [] } = data;
  const name = deviceDisplayName(analysis);
  const dateStr = new Date(createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const issuesList =
    analysis.observedIssues.length === 0
      ? "<li>No major physical defects identified from visual inspection.</li>"
      : analysis.observedIssues
          .map(
            (issue) =>
              `<li><span class="severity ${escHtml(issue.severity)}">${escHtml(issue.severity.toUpperCase())}</span> ${escHtml(issue.label)}</li>`
          )
          .join("");

  const actionsList =
    completedActions.length === 0
      ? "<li>No actions checked off yet.</li>"
      : completedActions
          .map((act) => `<li><span class="check">✓</span> ${escHtml(act.replace(/_/g, " "))}</li>`)
          .join("");

  const contributionsRows = score.contributions
    .map(
      (c) => `
      <tr>
        <td>${c.label}</td>
        <td class="num">${c.value}/100</td>
        <td class="num">${Math.round(c.weight * 100)}%</td>
      </tr>`
    )
    .join(""  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>ReLoop Circular Decision Receipt — ${escHtml(scanId.slice(0, 8))}</title>
<style>
${/* existing style block unchanged, keep as is */""}
</style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div>
        <div class="brand">RE<span>LOOP</span></div>
        <p style="font-size: 12px; color: #64748b; margin-top: 2px;">Circular Electronics Decision Receipt</p>
      </div>
      <!-- Badge removed for compliance -->
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <strong>Receipt ID</strong>
        REC-${escHtml(scanId.slice(0, 8).toUpperCase())}
      </div>
      <div class="meta-item">
        <strong>Assessment Date</strong>
        ${escHtml(dateStr)}
      </div>
      <div class="meta-item">
        <strong>Device Identifier</strong>
        ${escapedName} (${escapedDeviceType})
      </div>
      <div class="meta-item">
        <strong>Estimated Age &amp; Confidence</strong>
        ${escapedEstimatedAge} · ${escapedConfidence} confidence
      </div>
    </div>

    <div class="verdict-box">
      <div>
        <h3>Winning Circular Pathway</h3>
        <div class="headline">${escHtml(recommendation.headline)} (${escHtml((chosenPathway || recommendation.path).toUpperCase())})</div>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Rule: ${escapedRuleId} · Engine v${escapedEngineVersion}</p>
      </div>
      <div class="score-badge">
        <div class="score-num">${escHtml(String(score.overall))}</div>
        <div class="score-label">Next Life Score</div>
      </div>
    </div>

    <div class="section-title">Attribute Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Attribute</th>
          <th style="text-align: right;">Score</th>
          <th style="text-align: right;">Weight</th>
        </tr>
      </thead>
      <tbody>
        ${contributionsRows}
      </tbody>
    </table>

    <div class="section-title">Key Observations</div>
    <ul>
      ${issuesList}
    </ul>

    <div class="section-title">Action Plan Status</div>
    <ul>
      ${actionsList}
    </ul>

    <div class="footer">
      <span>Compliance evaluated per applicable regulations.</span>
      <span>reloop.in</span>
    </div>
  </div>
</body>
</html>`;
html>`;
}

export function downloadDecisionReceipt(data: DecisionReceiptData): void {
  if (typeof window === "undefined") return;

  const html = generateDecisionReceiptHtml(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } else {
    // If popups are blocked, download HTML receipt directly
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reloop-receipt-${data.scanId.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

