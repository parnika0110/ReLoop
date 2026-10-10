import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, Cpu, Battery, Wrench, ShieldCheck, Recycle, RefreshCw, TrendingUp } from "lucide-react";

export const metadata = {
  title: "ReLoop — Your old tech isn't waste yet",
  description: "Assess what remains. Compare what comes next.",
};

export default function LandingPage() {
  return (
    <div className="landing-theme min-h-screen bg-white text-ink selection:bg-vermilion selection:text-paper overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 mix-blend-difference text-white">
        <Link href="/" className="label-mono font-bold tracking-widest uppercase">
          ReLoop
        </Link>
        <Link
          href="/scan"
          className="label-mono flex items-center gap-2 transition-transform hover:translate-x-1 uppercase"
        >
          <span>Begin Scan</span>
          <ArrowRight className="size-4" />
        </Link>
      </header>

      {/* ─── Chapter 01: Hero ─────────────────────────────────────── */}
      {/*
        Art Direction: RELOOP — TECHNOLOGY, RECONSIDERED
        Full-bleed deconstructed hardware canvas:
        - Image fills the background (object-[78%_center] / object-cover).
        - Smooth left directional ivory scrim for pristine typographic legibility.
        - Tighter left margin (px-8 md:px-14 lg:px-20) to eliminate excess dead space on the left.
        - High-contrast, glassmorphic technical callout chips on the right hardware components.
      */}
      <section className="relative pt-[72px] min-h-screen bg-paper text-ink overflow-hidden flex flex-col justify-between">

        {/* ── Main Compositional Stage ─────────────────────────────── */}
        <div className="relative flex-1 min-h-[640px] lg:min-h-[740px] flex items-center">

          {/* Full-bleed background photograph */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
            <div className="relative w-full h-full">
              <Image
                src="/images/reloop-electronics-hero.png"
                alt="Deconstructed circuit boards, heatsink, microprocessors, and memory modules arranged on cream surface"
                fill
                priority
                sizes="100vw"
                className="object-cover object-[80%_center] sm:object-[76%_center] lg:object-[72%_center]"
              />
              {/* Refined gradient scrim: opaque ivory over text area, smoothly fading out across the image */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to right, rgba(239, 235, 227, 0.98) 0%, rgba(239, 235, 227, 0.95) 28%, rgba(239, 235, 227, 0.75) 42%, rgba(239, 235, 227, 0.25) 58%, rgba(239, 235, 227, 0) 72%)",
                }}
              />
              {/* Subtle top & bottom blending */}
              <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-paper/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-paper/80 to-transparent" />
            </div>
          </div>

          {/* ── High-Contrast, Legible Technical Callouts on Hardware Components ── */}
          <div className="hidden lg:block absolute inset-0 z-20 pointer-events-none">
            {/* Callout 1: Aluminum Heatsink / Thermal Unit */}
            <div
              className="absolute"
              style={{ top: "24%", right: "31%" }}
            >
              <div className="inline-flex flex-col items-start px-3 py-1.5 bg-paper/90 backdrop-blur-md border border-graphite/30 shadow-sm">
                <span className="label-mono text-[0.62rem] text-ink font-bold tracking-wider">
                  SPECIMEN / THERMAL CORE
                </span>
                <span className="label-mono text-[0.56rem] text-graphite/80 tracking-wide mt-0.5">
                  EXTRUDED AL-FIN HEATSINK
                </span>
              </div>
            </div>

            {/* Callout 2: High-Density Silicon / Logic Board */}
            <div
              className="absolute"
              style={{ top: "54%", right: "9%" }}
            >
              <div className="inline-flex flex-col items-start px-3 py-1.5 bg-paper/95 backdrop-blur-md border border-vermilion shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-vermilion" />
                  <span className="label-mono text-[0.64rem] text-vermilion font-bold tracking-wider">
                    LOGIC BOARD ASSEMBLY
                  </span>
                </div>
                <span className="label-mono text-[0.56rem] text-ink font-medium tracking-wide mt-0.5">
                  SUBSTRATE &amp; RECOVERABLE TRACES
                </span>
              </div>
            </div>

            {/* Callout 3: Memory Modules */}
            <div
              className="absolute"
              style={{ bottom: "21%", right: "43%" }}
            >
              <div className="inline-flex flex-col items-start px-3 py-1.5 bg-paper/90 backdrop-blur-md border border-graphite/30 shadow-sm">
                <span className="label-mono text-[0.62rem] text-ink font-bold tracking-wider">
                  DRAM MODULES
                </span>
                <span className="label-mono text-[0.56rem] text-graphite/80 tracking-wide mt-0.5">
                  DISCRETE MEMORY PACKAGES
                </span>
              </div>
            </div>
          </div>

          {/* ── Left Editorial Content Stage ── */}
          <div className="relative z-10 w-full pl-6 md:pl-12 lg:pl-16 pr-6 py-12 md:py-20">
            <div className="max-w-2xl">

              {/* Sub-label badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-graphite/5 border border-graphite/15 mb-6 md:mb-8">
                <span className="w-1.5 h-1.5 bg-vermilion rounded-full" />
                <span className="label-mono text-[0.64rem] text-graphite tracking-widest uppercase font-medium">
                  CIRCULAR HARDWARE INTELLIGENCE
                </span>
              </div>

              {/* Oversized Headline matching the screenshot */}
              <h1
                className="display uppercase text-ink leading-[0.84] tracking-tighter mb-8"
                style={{ fontSize: "clamp(3.8rem, 7.8vw, 7.8rem)" }}
              >
                <span className="block">YOUR OLD</span>
                <span className="block">TECH ISN&apos;T</span>
                <span className="block">WASTE YET.</span>
              </h1>

              {/* Manifesto Copy */}
              <p className="text-graphite/90 text-base md:text-lg leading-relaxed mb-10 max-w-lg font-light">
                Every decommissioned device represents material investment and engineering craft.
                We evaluate observable condition, salvage avenues, and circular next steps before anything is written off.
              </p>

              {/* Primary & Secondary Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/scan"
                  className="bg-vermilion text-paper px-8 py-4 label-mono text-xs uppercase tracking-widest hover:bg-ink transition-colors flex items-center gap-3 shadow-sm hover:shadow-md"
                >
                  <span>Assess Your Device</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/scan?sample=1"
                  className="border border-graphite/30 bg-paper/60 backdrop-blur-xs text-ink px-8 py-4 label-mono text-xs uppercase tracking-widest hover:border-ink hover:bg-paper transition-colors"
                >
                  Try a sample scan
                </Link>
              </div>

            </div>
          </div>

        </div>

      </section>

      {/* Chapter 02: Waste is not the end */}
      <section className="relative py-32 px-6 md:px-12 bg-ink text-paper selection:bg-vermilion selection:text-ink">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 border-l border-paper/20 pl-6 md:pl-12">
            <span className="label-mono text-vermilion block mb-6 uppercase">02 / Analysis</span>
            <h2 className="display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.9] tracking-tighter uppercase">
              Assess what remains.
            </h2>
            <p className="mt-8 text-paper/70 max-w-sm text-lg leading-relaxed">
              We look past the surface. By analyzing visible condition through computer vision, we identify usable potential and separate it from true waste.
            </p>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <div className="grid grid-cols-2 gap-4 md:gap-8">
              <div className="border border-paper/10 p-6 md:p-8 flex flex-col justify-between aspect-square">
                <Camera className="size-6 text-paper/50" />
                <div>
                  <div className="display text-4xl mb-2">1.</div>
                  <span className="label-mono text-paper/70 uppercase">Visual Evidence</span>
                </div>
              </div>
              <div className="border border-paper/10 p-6 md:p-8 flex flex-col justify-between aspect-square bg-white text-ink">
                <Cpu className="size-6 text-vermilion" />
                <div>
                  <div className="display text-4xl mb-2">2.</div>
                  <span className="label-mono text-stone uppercase">Engine Inference</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 03: Six futures */}
      <section className="py-20 md:py-24 px-6 md:px-12 border-t border-graphite/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 md:mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8">
            <div>
              <span className="label-mono text-vermilion block mb-4 uppercase">03 / The Futures</span>
              <h2 className="display text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.88] tracking-tighter uppercase max-w-3xl">
                Compare what comes next.
              </h2>
            </div>
            <p className="max-w-sm text-stone text-base leading-relaxed">
              Every device has a different optimal path. We map six distinct possibilities based on hard evidence.
            </p>
          </div>

          {/* Consistent 3-column × 2-row grid (1-col mobile, 2-col tablet, 3-col desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">

            {/* 01: Repair */}
            <div className="border-t-2 border-ink pt-5 pb-6 px-4 md:px-5 flex flex-col justify-between min-h-[220px] bg-paper/40 transition-colors hover:bg-paper/80">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="display text-4xl md:text-5xl text-ink/20 leading-none">01</span>
                  <Wrench className="size-6 text-vermilion" />
                </div>
                <h3 className="display text-2xl md:text-3xl mb-2.5 uppercase text-ink">Repair</h3>
                <p className="text-stone text-sm md:text-base leading-relaxed">
                  Isolate the failure. Replace only what is broken to restore full functionality.
                </p>
              </div>
            </div>

            {/* 02: Refurbish */}
            <div className="border-t-2 border-graphite/30 pt-5 pb-6 px-4 md:px-5 flex flex-col justify-between min-h-[220px] bg-paper/40 transition-colors hover:bg-paper/80">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="display text-4xl md:text-5xl text-ink/20 leading-none">02</span>
                  <Battery className="size-6 text-ink" />
                </div>
                <h3 className="display text-2xl md:text-3xl mb-2.5 uppercase text-ink">Refurbish</h3>
                <p className="text-stone text-sm md:text-base leading-relaxed">
                  Comprehensive overhaul. Upgrade memory, replace batteries, and clean for a second life.
                </p>
              </div>
            </div>

            {/* 03: Reuse */}
            <div className="border-t-2 border-graphite/30 pt-5 pb-6 px-4 md:px-5 flex flex-col justify-between min-h-[220px] bg-paper/40 transition-colors hover:bg-paper/80">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="display text-4xl md:text-5xl text-ink/20 leading-none">03</span>
                  <RefreshCw className="size-6 text-ink" />
                </div>
                <h3 className="display text-2xl md:text-3xl mb-2.5 uppercase text-ink">Reuse</h3>
                <p className="text-stone text-sm md:text-base leading-relaxed">
                  Repurpose the device entirely. Turn an old tablet into a dashboard, or a phone into a camera.
                </p>
              </div>
            </div>

            {/* 04: Donate */}
            <div className="border-t-2 border-graphite/30 pt-5 pb-6 px-4 md:px-5 flex flex-col justify-between min-h-[220px] bg-paper/40 transition-colors hover:bg-paper/80">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="display text-4xl md:text-5xl text-ink/20 leading-none">04</span>
                  <ShieldCheck className="size-6 text-ink" />
                </div>
                <h3 className="display text-2xl md:text-3xl mb-2.5 uppercase text-ink">Donate</h3>
                <p className="text-stone text-sm md:text-base leading-relaxed">
                  Still usable, just not for you. Wipe data and route to organizations that bridge the digital divide.
                </p>
              </div>
            </div>

            {/* 05: Resell */}
            <div className="border-t-2 border-graphite/30 pt-5 pb-6 px-4 md:px-5 flex flex-col justify-between min-h-[220px] bg-paper/40 transition-colors hover:bg-paper/80">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="display text-4xl md:text-5xl text-ink/20 leading-none">05</span>
                  <TrendingUp className="size-6 text-ink" />
                </div>
                <h3 className="display text-2xl md:text-3xl mb-2.5 uppercase text-ink">Resell</h3>
                <p className="text-stone text-sm md:text-base leading-relaxed">
                  Extract residual financial value while keeping the hardware in active circulation.
                </p>
              </div>
            </div>

            {/* 06: Recycle */}
            <div className="border-t-2 border-vermilion pt-5 pb-6 px-4 md:px-5 flex flex-col justify-between min-h-[220px] bg-vermilion/[0.04] border-b sm:border-b-0 border-vermilion/20 transition-colors hover:bg-vermilion/[0.08]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="display text-4xl md:text-5xl text-vermilion/30 leading-none">06</span>
                  <Recycle className="size-6 text-vermilion" />
                </div>
                <h3 className="display text-2xl md:text-3xl mb-2.5 uppercase text-vermilion">Recycle</h3>
                <p className="text-stone text-sm md:text-base leading-relaxed">
                  The final resort. Safely extract rare earth metals and materials when the object is truly beyond repair.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Chapter 04: The decision */}
      <section className="py-32 px-6 md:px-12 bg-graphite text-paper overflow-hidden relative">
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
          <span className="label-mono text-vermilion block mb-8 uppercase">04 / The Decision</span>
          <h2 className="display text-[clamp(3.5rem,8vw,8rem)] leading-[0.8] tracking-tighter uppercase mb-12 mix-blend-difference">
            FIND THE
            <br />
            NEXT LIFE.
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6 mt-8">
            <Link
              href="/scan"
              className="bg-vermilion text-paper px-8 py-4 label-mono uppercase tracking-widest hover:bg-white hover:text-ink transition-colors"
            >
              Scan a Device
            </Link>
            <Link
              href="/scan?sample=1"
              className="border border-paper/30 text-paper px-8 py-4 label-mono uppercase tracking-widest hover:border-paper transition-colors"
            >
              Try a Sample
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 md:px-12 border-t border-graphite/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-stone label-mono text-xs uppercase">
        <div>&copy; 2026 ReLoop</div>
        <div className="flex items-center gap-6">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Engine Docs</span>
        </div>
      </footer>
    </div>
  );
}
