import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NEXT_LIVES = ["Repair", "Refurbish", "Reuse", "Donate", "Resell", "Recycle"];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Restrained ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-lime/10 blur-[140px] animate-pulse-glow"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="label-mono text-bone">
          RE<span className="text-lime">LOOP</span>
        </span>
        <Badge variant="neutral">Waste &amp; Energy</Badge>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="animate-fade-up flex max-w-4xl flex-col items-center">
          <span className="label-mono mb-8 text-lime">
            AI-powered circularity engine
          </span>

          <h1 className="display text-[clamp(2.75rem,8vw,6rem)] text-bone">
            Your old tech isn’t{" "}
            <span className="text-lime">waste</span> yet.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
            ReLoop analyzes your unwanted device and calculates its
            highest-value next life — repair, refurbish, reuse, donate, resell,
            or recycle.
          </p>

          <Link href="/scan" className="mt-12">
            <Button size="lg">
              Scan a device
              <ArrowRight className="size-5" />
            </Button>
          </Link>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {NEXT_LIVES.map((life) => (
              <span
                key={life}
                className="label-mono rounded-full border border-white/10 px-3 py-1.5 text-muted"
              >
                {life}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-8 text-center">
        <p className="label-mono text-muted/60">
          Give every device a next life.
        </p>
      </footer>
    </div>
  );
}
