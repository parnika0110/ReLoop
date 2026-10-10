"use client";

/**
 * "Try a sample device" — pushes /scan?sample=<fresh token>. The token VALUE
 * is the uploader's effect dependency, so this re-runs the sample even when
 * we are already sitting on /scan?sample=1 with a completed scan.
 */
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SampleButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="bg-white text-ink border-graphite/30 hover:bg-secondary-paper hover:border-ink hover:text-ink shadow-2xs font-medium px-6 py-2.5"
      onClick={() => router.push(`/scan?sample=${Date.now()}`)}
    >
      <Sparkles className="size-4 text-vermilion" />
      Try a sample device
    </Button>
  );
}
