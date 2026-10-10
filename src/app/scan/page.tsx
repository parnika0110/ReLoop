import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Laptop, Smartphone, Tablet } from "lucide-react";
import { DeviceUploader } from "@/components/scan/device-uploader";
import { SampleButton } from "@/components/scan/sample-button";

const SUPPORTED = [
  { label: "Laptops", icon: Laptop },
  { label: "Smartphones", icon: Smartphone },
  { label: "Tablets", icon: Tablet },
];

export const metadata = {
  title: "Scan a device — ReLoop",
};

export default function ScanPage() {
  return (
    <div className="landing-theme flex min-h-screen flex-col bg-paper text-ink selection:bg-vermilion selection:text-paper">
      <header className="flex items-center justify-between px-6 py-6 md:px-12 border-b border-graphite/20">
        <Link href="/" className="label-mono text-ink">
          RE<span className="text-vermilion">LOOP</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-stone transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          <span className="label-mono">Home</span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-start px-6 pt-8 md:pt-12 pb-16 md:pb-24 max-w-4xl mx-auto w-full">
        <div className="mb-8 max-w-xl animate-fade-up text-center">
          <span className="label-mono text-vermilion font-medium">Step 01 — Capture</span>
          <h1 className="display mt-3 text-[clamp(2.25rem,5.5vw,4.25rem)] text-ink uppercase tracking-tighter leading-none">
            Scan a device
          </h1>
          <p className="mt-3 text-stone text-base md:text-lg max-w-md mx-auto leading-relaxed">
            Upload one clear photo. ReLoop identifies the device, assesses its
            condition, and finds what can still be saved.
          </p>
        </div>

        {/* useSearchParams (inside the uploader) needs a Suspense boundary. */}
        <Suspense
          fallback={
            <div className="w-full max-w-xl min-h-[300px] rounded-none border-2 border-dashed border-graphite/25 bg-white shadow-sm" />
          }
        >
          <DeviceUploader />
        </Suspense>

        <div className="mt-6">
          <SampleButton />
        </div>

        {/* Device Categories */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {SUPPORTED.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="flex items-center gap-2 rounded-full border border-graphite/20 bg-white/90 shadow-2xs px-4 py-2 label-mono text-ink text-xs font-medium tracking-wider"
            >
              <Icon className="size-3.5 text-vermilion" />
              {label}
            </span>
          ))}
        </div>

        {/* Tips */}
        <p className="mt-6 max-w-md text-center text-xs leading-relaxed text-stone px-4">
          Tips: use even lighting, keep the whole device in frame, and avoid
          heavy glare for the most accurate assessment.
        </p>
      </main>
    </div>
  );
}
