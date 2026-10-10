/**
 * Action section — four next-step choices with real guidance (no marketplace
 * yet, per scope). Pure presentational; no fabricated links to partners.
 */
import { Wrench, Gift, Tag, Recycle, ArrowUpRight } from "lucide-react";

const ACTIONS = [
  {
    id: "repair",
    label: "Repair",
    icon: Wrench,
    steps: [
      "Get a quote from a certified repair shop or the manufacturer's service program.",
      "Compare the quote against the estimated retained value — if repair costs approach replacement, consider refurbish or recycle instead.",
      "Ask for original or equivalent-quality parts and a warranty on the work.",
    ],
  },
  {
    id: "donate",
    label: "Donate",
    icon: Gift,
    steps: [
      "Wipe your data first: sign out of accounts, remove SIM/SD cards, and factory-reset the device.",
      "Donate to a school, community center, or charity that accepts electronics.",
      "Include the charger and any accessories you have — working accessories extend the device's useful life.",
    ],
  },
  {
    id: "resell",
    label: "Resell",
    icon: Tag,
    steps: [
      "Factory-reset and de-account the device, then photograph it honestly — including any damage.",
      "Price against recent completed sales for the same model and condition, not asking prices.",
      "Sell locally to avoid shipping damage, or use a platform with seller protection.",
    ],
  },
  {
    id: "recycle",
    label: "Recycle",
    icon: Recycle,
    steps: [
      "Use a certified e-waste recycler (e.g. an R2 or e-Stewards certified facility) — never general trash.",
      "Remove batteries where possible; damaged lithium batteries must not go in ordinary bins.",
      "Check manufacturer take-back programs — many accept devices free of charge.",
    ],
  },
];

export function ActionSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ACTIONS.map(({ id, label, icon: Icon, steps }) => (
        <details
          key={id}
          className="group rounded-2xl border border-graphite/15 bg-white/80 shadow-2xs transition-colors duration-300 hover:border-graphite/40 open:border-graphite/40"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl border border-graphite/15 bg-secondary-paper/60 text-vermilion transition-colors group-open:bg-vermilion/10">
                <Icon className="size-4" />
              </span>
              <span className="text-[15px] font-medium text-ink">{label}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-stone transition-transform duration-300 group-open:rotate-90 group-open:text-vermilion" />
          </summary>
          <ol className="space-y-3 border-t border-graphite/10 p-5 pt-4 bg-secondary-paper/20 rounded-b-2xl">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-stone">
                <span className="label-mono mt-0.5 shrink-0 text-vermilion font-medium">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
