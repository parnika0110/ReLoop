/**
 * Repair vs. Replace Calculator — interactive financial comparison.
 *
 * Users enter a repair quote and optional additional costs; the component
 * runs the 50%-rule benchmark (src/lib/calculator/repair-vs-replace.ts)
 * and shows the recommendation. Pre-populates value estimates from the
 * scan's impact data where available.
 *
 * Does NOT invent prices — unknown values start blank and must be entered.
 */
"use client";

import { useState, useMemo } from "react";
import {
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  IndianRupee,
} from "lucide-react";
import {
  calculateRepairVsReplace,
  type RepairVsReplaceInput,
} from "@/lib/calculator/repair-vs-replace";
import { formatInr } from "@/lib/utils";

interface RepairCalculatorProps {
  /** Pre-populated estimate from impact estimates (if available) */
  estimatedCurrentValueInr?: number;
  /** Pre-populated post-repair value from impact estimates (if available) */
  estimatedPostRepairValueInr?: number;
}

function CurrencyInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
          <IndianRupee className="size-3.5" />
        </span>
        <input
          type="number"
          min="0"
          step="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="w-full rounded-xl border border-graphite/20 bg-white py-2.5 pl-8 pr-4 font-mono text-sm text-ink shadow-2xs outline-none transition-colors placeholder:text-stone/50 focus:border-vermilion/60 focus:ring-2 focus:ring-vermilion/10"
        />
      </div>
      {hint && (
        <p className="mt-1 text-[11px] leading-snug text-stone">{hint}</p>
      )}
    </div>
  );
}

export function RepairCalculator({
  estimatedCurrentValueInr,
  estimatedPostRepairValueInr,
}: RepairCalculatorProps) {
  const [repairQuote, setRepairQuote] = useState("");
  const [additionalCosts, setAdditionalCosts] = useState("");
  const [currentValue, setCurrentValue] = useState(
    estimatedCurrentValueInr?.toString() ?? ""
  );
  const [postRepairValue, setPostRepairValue] = useState(
    estimatedPostRepairValueInr?.toString() ?? ""
  );
  const [replacementPrice, setReplacementPrice] = useState("");

  const canCalculate =
    Number(repairQuote) > 0 && Number(replacementPrice) > 0;

  const result = useMemo(() => {
    if (!canCalculate) return null;
    const input: RepairVsReplaceInput = {
      repairQuoteInr: Number(repairQuote) || 0,
      currentValueInr: Number(currentValue) || 0,
      postRepairValueInr: Number(postRepairValue) || 0,
      replacementPriceInr: Number(replacementPrice) || 0,
      additionalCostsInr: Number(additionalCosts) || 0,
    };
    return calculateRepairVsReplace(input);
  }, [repairQuote, additionalCosts, currentValue, postRepairValue, replacementPrice, canCalculate]);

  const resultColor =
    result?.recommendation === "repair"
      ? "emerald"
      : result?.recommendation === "replace"
        ? "red"
        : "amber";

  const ResultIcon =
    result?.recommendation === "repair"
      ? TrendingUp
      : result?.recommendation === "replace"
        ? TrendingDown
        : Minus;

  return (
    <div className="rounded-2xl border border-graphite/15 bg-white/80 p-5 shadow-2xs sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl border border-graphite/15 bg-secondary-paper/60 text-vermilion">
          <ArrowRightLeft className="size-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">
            Repair vs. Replace Calculator
          </p>
          <p className="text-xs text-stone">
            Enter your repair quote to see if it&apos;s worth it
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CurrencyInput
          label="Repair quote (INR)"
          value={repairQuote}
          onChange={setRepairQuote}
          placeholder="e.g. 3500"
          hint="What the technician quoted for parts + labor"
        />
        <CurrencyInput
          label="Additional costs (INR)"
          value={additionalCosts}
          onChange={setAdditionalCosts}
          placeholder="0"
          hint="Diagnostics, new charger, battery top-up etc."
        />
        <CurrencyInput
          label="Current as-is value (INR)"
          value={currentValue}
          onChange={setCurrentValue}
          placeholder="e.g. 5000"
          hint={
            estimatedCurrentValueInr
              ? `Pre-filled from AI estimate — adjust if you have a better figure`
              : "What the device is worth today in current condition"
          }
        />
        <CurrencyInput
          label="Post-repair value (INR)"
          value={postRepairValue}
          onChange={setPostRepairValue}
          placeholder="e.g. 12000"
          hint="Expected resale or trade-in value after repair"
        />
        <CurrencyInput
          label="Replacement price (INR)"
          value={replacementPrice}
          onChange={setReplacementPrice}
          placeholder="e.g. 18000"
          hint="Cost of buying a new or refurbished replacement"
        />
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mt-6 rounded-xl border p-5 transition-all duration-300 ${
            resultColor === "emerald"
              ? "border-emerald-500/20 bg-emerald-50/50"
              : resultColor === "red"
                ? "border-red-500/20 bg-red-50/50"
                : "border-amber-500/20 bg-amber-50/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex size-9 items-center justify-center rounded-xl ${
                resultColor === "emerald"
                  ? "bg-emerald-100 text-emerald-700"
                  : resultColor === "red"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              <ResultIcon className="size-4" />
            </span>
            <div>
              <p
                className={`text-sm font-medium ${
                  resultColor === "emerald"
                    ? "text-emerald-900"
                    : resultColor === "red"
                      ? "text-red-900"
                      : "text-amber-900"
                }`}
              >
                {result.headline}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-stone">
            {result.explanation}
          </p>

          {/* Key ratios */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-graphite/10 bg-white/60 px-3 py-2.5">
              <p className="label-mono text-[10px] text-stone">Total repair</p>
              <p className="mt-0.5 font-mono text-sm font-medium text-ink tabular-nums">
                {formatInr(result.totalRepairCostInr)}
              </p>
            </div>
            <div className="rounded-lg border border-graphite/10 bg-white/60 px-3 py-2.5">
              <p className="label-mono text-[10px] text-stone">
                Net benefit
              </p>
              <p
                className={`mt-0.5 font-mono text-sm font-medium tabular-nums ${
                  result.netBenefitOfRepairInr >= 0
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {result.netBenefitOfRepairInr >= 0 ? "+" : ""}
                {formatInr(result.netBenefitOfRepairInr)}
              </p>
            </div>
            <div className="rounded-lg border border-graphite/10 bg-white/60 px-3 py-2.5">
              <p className="label-mono text-[10px] text-stone">
                Cost / value ratio
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium text-ink tabular-nums">
                {Math.round(result.repairToPostRepairRatio * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {!canCalculate && (
        <p className="mt-5 text-center text-xs text-stone">
          Enter at least a repair quote and replacement price to calculate.
        </p>
      )}
    </div>
  );
}
