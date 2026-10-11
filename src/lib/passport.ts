/**
 * Local device library & circularity passport storage helper.
 * Extends existing assessment persistence using browser LocalStorage.
 * Does not require external auth or new AWS tables.
 */
import type { ScanResult } from "@/types/scan";
import type { NextLifePath } from "@/types/score";

export interface PassportEvent {
  id: string;
  timestamp: string;
  type: "scanned" | "pathway_selected" | "action_completed" | "outcome_confirmed";
  label: string;
  details?: string;
}

export interface StoredDevicePassport {
  scanId: string;
  createdAt: string;
  deviceType: string;
  brand: string | null;
  overallScore: number;
  recommendedPathway: NextLifePath;
  selectedPathway?: NextLifePath;
  confirmedOutcome?: NextLifePath;
  confirmedDate?: string;
  completedActionIds: string[];
  timeline: PassportEvent[];
}

const STORAGE_KEY = "reloop_device_library_v1";

export function loadDeviceLibrary(): StoredDevicePassport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeviceToLibrary(scan: ScanResult, selectedPath?: NextLifePath): StoredDevicePassport {
  if (typeof window === "undefined") {
    return {
      scanId: scan.scanId,
      createdAt: scan.createdAt,
      deviceType: scan.analysis?.deviceType || "device",
      brand: scan.analysis?.brand || null,
      overallScore: scan.score?.overall || 0,
      recommendedPathway: scan.recommendation?.path || "recycle",
      completedActionIds: [],
      timeline: [],
    };
  }

  const library = loadDeviceLibrary();
  let existing = library.find((item) => item.scanId === scan.scanId);

  if (!existing) {
    existing = {
      scanId: scan.scanId,
      createdAt: scan.createdAt,
      deviceType: scan.analysis?.deviceType || "device",
      brand: scan.analysis?.brand || null,
      overallScore: scan.score?.overall || 0,
      recommendedPathway: scan.recommendation?.path || "recycle",
      selectedPathway: selectedPath || scan.recommendation?.path,
      completedActionIds: [],
      timeline: [
        {
          id: `evt_scanned_${Date.now()}`,
          timestamp: scan.createdAt,
          type: "scanned",
          label: "Initial AI Analysis Completed",
          details: `Next Life Score ${scan.score?.overall}/100. Recommended: ${scan.recommendation?.headline}.`,
        },
      ],
    };
    library.unshift(existing);
  } else if (selectedPath && existing.selectedPathway !== selectedPath) {
    existing.selectedPathway = selectedPath;
    existing.timeline.push({
      id: `evt_path_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "pathway_selected",
      label: `Pathway Chosen: ${selectedPath.toUpperCase()}`,
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library.slice(0, 50)));
  } catch (e) {
    console.warn("[passport] storage error:", e);
  }

  return existing;
}

export function togglePassportAction(scanId: string, actionId: string): StoredDevicePassport | null {
  if (typeof window === "undefined") return null;
  const library = loadDeviceLibrary();
  const device = library.find((d) => d.scanId === scanId);
  if (!device) return null;

  const idx = device.completedActionIds.indexOf(actionId);
  if (idx >= 0) {
    device.completedActionIds.splice(idx, 1);
  } else {
    device.completedActionIds.push(actionId);
    device.timeline.push({
      id: `evt_act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "action_completed",
      label: `Action Completed: ${actionId.replace(/_/g, " ")}`,
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (e) {
    console.warn("[passport] update error:", e);
  }

  return device;
}

export function confirmDeviceOutcome(scanId: string, outcome: NextLifePath): StoredDevicePassport | null {
  if (typeof window === "undefined") return null;
  const library = loadDeviceLibrary();
  const device = library.find((d) => d.scanId === scanId);
  if (!device) return null;

  device.confirmedOutcome = outcome;
  device.confirmedDate = new Date().toISOString();
  device.timeline.push({
    id: `evt_outcome_${Date.now()}`,
    timestamp: device.confirmedDate,
    type: "outcome_confirmed",
    label: `Confirmed Outcome: ${outcome.toUpperCase()}`,
    details: "User verified final circular pathway transition.",
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (e) {
    console.warn("[passport] outcome error:", e);
  }

  return device;
}
