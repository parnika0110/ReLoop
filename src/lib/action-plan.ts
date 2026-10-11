/**
 * Personalized Next-Step Action Plan generation and progress tracking.
 * Provides actionable, real-world tasks for each of the 6 pathways in India:
 * - Data wipe / factory reset
 * - Battery safety & safe disconnection
 * - Official vs. independent technician quote guidelines
 * - Authorized e-waste recycling guidelines (E-Waste Management Rules, India)
 */
import type { NextLifePath } from "@/types/score";

export interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  category: "prepare" | "action" | "verify";
  suggestedDays?: number;
}

export const PATHWAY_ACTION_TEMPLATES: Record<NextLifePath, ActionPlanItem[]> = {
  repair: [
    {
      id: "backup_data",
      title: "Perform full offline or cloud data backup",
      description: "Ensure all personal photos, accounts, and authenticators are backed up before handing device to a repair center.",
      category: "prepare",
    },
    {
      id: "get_written_quote",
      title: "Obtain a diagnostic quote with spare part provenance",
      description: "Request an explicit breakdown between genuine OEM vs. compatible third-party spare parts and labor warranty.",
      category: "action",
    },
    {
      id: "compare_cost_threshold",
      title: "Confirm quote is below 50% replacement value",
      description: "Use the Repair vs. Replace calculator to verify the repair investment retains positive net equity.",
      category: "verify",
    },
  ],
  refurbish: [
    {
      id: "clean_and_test",
      title: "Run diagnostic hardware checks",
      description: "Verify display, port connectivity, speaker, microphone, and wireless module functioning.",
      category: "prepare",
    },
    {
      id: "sign_out_accounts",
      title: "Sign out of Apple ID, Google, and Samsung accounts",
      description: "Disable Find My / FRP (Factory Reset Protection) so a secondary user can activate the device.",
      category: "prepare",
    },
    {
      id: "certified_refurbisher",
      title: "Submit to a certified refurbishment partner",
      description: "Hand over for battery replacement, thermal repasting, or cosmetic shell restoration.",
      category: "action",
    },
  ],
  reuse: [
    {
      id: "secure_wipe",
      title: "Factory reset and erase all user partitions",
      description: "Perform cryptographic wipe so the secondary family member or student begins with clean storage.",
      category: "prepare",
    },
    {
      id: "clean_ports",
      title: "Gently clean charging port and speaker grilles",
      description: "Remove compressed lint or dust to prevent thermal buildup and intermittent charging issues.",
      category: "action",
    },
    {
      id: "setup_new_profile",
      title: "Set up simplified profile or secondary use",
      description: "Configure device for dedicated task (kitchen display, study terminal, e-reader).",
      category: "verify",
    },
  ],
  donate: [
    {
      id: "confirm_acceptance",
      title: "Confirm NGO / school minimum technical requirements",
      description: "Verify recipient organization accepts this OS version, screen size, and power brick requirement.",
      category: "prepare",
    },
    {
      id: "factory_reset",
      title: "Remove MDM / corporate profiles & wipe data",
      description: "Ensure all company device management profiles and personal credentials are fully removed.",
      category: "prepare",
    },
    {
      id: "package_accessories",
      title: "Bundle with functional charging cable & brick",
      description: "Donations are 3x more likely to enter active classroom use when functional power cables are included.",
      category: "action",
    },
  ],
  resell: [
    {
      id: "photograph_condition",
      title: "Capture clear photos of chassis edges & display",
      description: "Document minor scratches honestly to establish buyer trust and avoid dispute on delivery.",
      category: "prepare",
    },
    {
      id: "unlink_cloud",
      title: "Complete cloud unlinking and factory erase",
      description: "Ensure device is unlinked from your phone plan, cloud backup, and hardware warranty dashboard.",
      category: "prepare",
    },
    {
      id: "list_fair_price",
      title: "List at estimated secondary fair market value",
      description: "Reference ReLoop's secondary market estimate to benchmark your asking price on verified platforms.",
      category: "action",
    },
  ],
  recycle: [
    {
      id: "inspect_battery_swelling",
      title: "Inspect for battery swelling or puncture",
      description: "If battery is bloated, isolate in non-flammable container; do not puncture or compress in household bins.",
      category: "prepare",
    },
    {
      id: "locate_authorized_dismantler",
      title: "Identify a CPCB-authorized e-waste collection center",
      description: "Hand device to recyclers compliant with India's E-Waste (Management) Rules for safe hydrometallurgical recovery.",
      category: "action",
    },
    {
      id: "obtain_disposal_acknowledgment",
      title: "Obtain formal e-waste receipt or deposit confirmation",
      description: "Ensure device avoids unorganized acid-leaching and crude informal burning pits.",
      category: "verify",
    },
  ],
};

export function getActionPlanForPathway(pathway: NextLifePath): ActionPlanItem[] {
  return PATHWAY_ACTION_TEMPLATES[pathway] || [];
}
