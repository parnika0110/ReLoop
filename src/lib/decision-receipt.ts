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

/** Escape HTML entities to prevent XSS in generated HTML receipts. */
function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Safely coerce a possibly-undefined value to a string. */
function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "Unknown";
  return String(val);
}

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
  const { scanId, createdAt, analysis, score, recommendation, chosenPathway, completedActions = [] } = data;
  const name = deviceDisplayName(analysis);
  const dateStr = new Date(createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

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
  const { scanId, createdAt, analysis, score, recommendation, chosenPathway, completedActions = [] } = data;
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
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>ReLoop Circular Decision Receipt — ${escHtml(scanId.slice(0, 8))}</title>
<style>
  @page {
    size: A4;
    margin: 1.5cm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #f8fafc;
    padding: 24px;
    line-height: 1.4;
  }
  .receipt-card {
    max-width: 680px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 32px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .brand {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .brand span { color: #16a34a; }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
    font-size: 13px;
  }
  .meta-item strong {
    display: block;
    color: #64748b;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }
  .verdict-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 24px;
  }
  .verdict-box h3 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #166534;
  }
  .verdict-box .headline {
    font-size: 18px;
    font-weight: 700;
    color: #14532d;
    margin-top: 2px;
  }
  .score-badge {
    text-align: center;
    padding-left: 20px;
    border-left: 1px solid #bbf7d0;
  }
  .score-badge .score-num {
    font-size: 28px;
    font-weight: 800;
    color: #16a34a;
  }
  .score-badge .score-label {
    font-size: 10px;
    text-transform: uppercase;
    color: #166534;
    letter-spacing: 0.05em;
  }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #334155;
    margin: 20px 0 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-bottom: 16px;
  }
  th, td {
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    text-align: left;
  }
  th {
    color: #64748b;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  td.num { text-align: right; }
  ul {
    list-style: none;
    font-size: 13px;
    margin-bottom: 16px;
  }
  li {
    padding: 4px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .severity {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .severity.critical { background: #fee2e2; color: #991b1b; }
  .severity.warning { background: #fef3c7; color: #92400e; }
  .severity.info { background: #e0f2fe; color: #075985; }
  .check { color: #16a34a; font-weight: bold; }
  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #94a3b8;
  }
</style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div>
        <div class="brand">RE<span>LOOP</span></div>
        <p style="font-size: 12px; color: #64748b; margin-top: 2px;">Circular Electronics Decision Receipt</p>
      </div>
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
        ${escHtml(name)} (${escHtml(safeStr(analysis.deviceType?.toUpperCase()))})
      </div>
      <div class="meta-item">
        <strong>Estimated Age &amp; Confidence</strong>
        ${analysis.estimatedAge !== null ? `${analysis.estimatedAge} years` : "Unknown"} · ${analysis.confidence}/100 confidence
      </div>
    </div>

    <div class="verdict-box">
      <div>
        <h3>Winning Circular Pathway</h3>
        <div class="headline">${escHtml(recommendation.headline)} (${escHtml((chosenPathway || recommendation.path).toUpperCase())})</div>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Rule: ${escHtml(safeStr(recommendation.matchedRuleId))} · Engine v${escHtml(safeStr(score.engineVersion))}</p>
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
      <span>Evaluated under Indian E-Waste Management Rules (2022).</span>
      <span>reloop.in</span>
    </div>
  </div>
</body>
</html>`;
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

