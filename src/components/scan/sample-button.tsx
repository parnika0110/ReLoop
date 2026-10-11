"use client";

/**
 * "Try a sample device" — pushes /scan?sample=<fresh token>. The token VALUE
 * is the uploader's effect dependency, so this re-runs the sample even when
 * we are already sitting on /scan?sample=1 with a completed scan.
 *
 * The handler is the single source of truth for the sample flow. Optional
 * `className` / `showIcon` props let the landing page re-skin this exact
 * control (square corners, no icon) WITHOUT reimplementing the fresh-token
 * navigation. The scan page renders <SampleButton /> with no props, so the
 * original styling stays here as the DEFAULT and is merely overridden when a
 * caller passes its own className — the scan page is byte-for-byte unchanged.
 */
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Exact styling the scan page has always rendered. Do not change casually. */
const SCAN_PAGE_CLASSES =
  "bg-white text-ink border-graphite/30 hover:bg-secondary-paper hover:border-ink hover:text-ink shadow-2xs font-medium px-6 py-2.5";

export function SampleButton({
  className,
  showIcon = true,
}: {
  className?: string;
  showIcon?: boolean;
}) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className={cn(SCAN_PAGE_CLASSES, className)}
      onClick={() => router.push(`/scan?sample=${Date.now()}`)}
    >
      {showIcon && <Sparkles className="size-4" />}
      Try a sample device
    </Button>
  );
}
