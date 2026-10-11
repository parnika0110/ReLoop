import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui class-merge helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an amount in Indian Rupees (INR) with Indian numbering grouping (e.g. ₹28,000). */
export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format an amount in USD ($) for legacy assessment compatibility without silent INR relabeling. */
export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency by inspecting metricId and unit so legacy USD records are NEVER
 * silently rendered with a ₹ symbol.
 */
export function formatCurrency(amount: number, metricId?: string, unit?: string): string {
  if (metricId === "valueRetainedUsd" || unit === "USD" || unit === "$") {
    return formatUsd(amount);
  }
  return formatInr(amount);
}
