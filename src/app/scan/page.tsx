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
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="label-mono text-bone">
          RE<span className="text-lime">LOOP</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-muted transition-colors hover:text-bone"
        >
          <ArrowLeft className="size-4" />
          <span className="label-mono">Home</span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-20">
        <div className="mb-10 max-w-xl animate-fade-up text-center">
          <span className="label-mono text-lime">Step 01 — Capture</span>
          <h1 className="display mt-4 text-[clamp(2.25rem,6vw,4.5rem)] text-bone">
            Scan a device
          </h1>
          <p className="mt-4 text-muted">
            Upload one clear photo. ReLoop identifies the device, assesses its
            condition, and finds what can still be saved.
          </p>
        </div>

        {/* useSearchParams (inside the uploader) needs a Suspense boundary. */}
        <Suspense
          fallback={
            <div className="w-full max-w-xl min-h-[340px] rounded-3xl border-2 border-dashed border-white/15 bg-charcoal/60" />
          }
        >
          <DeviceUploader />
        </Suspense>

        <div className="mt-6">
          <SampleButton />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {SUPPORTED.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 label-mono text-muted"
            >
              <Icon className="size-3.5 text-mint" />
              {label}
            </span>
          ))}
        </div>

        <p className="mt-5 max-w-md text-center text-xs leading-relaxed text-muted/70">
          Tips: use even lighting, keep the whole device in frame, and avoid
          heavy glare for the most accurate assessment.
        </p>
      </main>
    </div>
  );
}
