/**
 * Evidence Breakdown — Observed · Inferred · Unknown
 *
 * Surfaces the evidence taxonomy from src/lib/evidence.ts directly
 * in the result page. Every assessment data point is categorized:
 *   - Observed  (directly grounded in image analysis)
 *   - Inferred  (algorithmically derived from observed data)
 *   - Unknown   (structurally impossible from a photo alone)
 *
 * This component does NOT fabricate data — it labels honestly.
 */
import {
  Eye,
  Brain,
  HelpCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { EvidenceClassification } from "@/lib/evidence";

interface EvidenceBreakdownProps {
  evidence: EvidenceClassification;
}

export function EvidenceBreakdown({ evidence }: EvidenceBreakdownProps) {
  return (
    <div className="space-y-6">
      {/* ── Observed facts ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-600/20 bg-emerald-50/40 p-5 shadow-2xs">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Eye className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Observed — grounded in your photo
            </p>
            <p className="text-xs text-emerald-700/80">
              Directly extracted from image analysis
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          {evidence.observed.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-emerald-600/10 bg-white/70 px-4 py-3"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone">
                  {item.detail}
                </p>
                {item.confidence !== undefined && (
                  <span className="mt-1 inline-block rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                    {item.confidence}% confidence
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Inferred interpretations ────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-50/40 p-5 shadow-2xs">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Brain className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-amber-900">
              Inferred — algorithmically derived
            </p>
            <p className="text-xs text-amber-700/80">
              Computed from observed data, not directly measured
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          {evidence.inferred.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-amber-500/10 bg-white/70 px-4 py-3"
            >
              <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-amber-800">
                    {item.score}/100
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-stone">
                  {item.rationale}
                </p>
                {/* Mini bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Unknown — requires physical inspection ──────────────── */}
      <div className="rounded-2xl border border-graphite/15 bg-slate-50/60 p-5 shadow-2xs">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-slate-200/80 text-slate-600">
            <HelpCircle className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">
              Unknown — requires physical inspection
            </p>
            <p className="text-xs text-slate-500">
              Cannot be determined from a photo alone
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          {evidence.unknown.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3"
            >
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone">
                  {item.why}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
