import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, Cpu, Battery, Wrench, ShieldCheck, Recycle } from "lucide-react";

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

      {/* Chapter 01: The object interrupts the headline */}
      <section className="relative min-h-screen flex flex-col justify-center items-center pt-20 pb-32 bg-white">
        {/* Background typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0 px-4">
          <h1 className="display text-[clamp(4rem,12vw,14rem)] leading-[0.8] tracking-tighter text-ink/90 text-center uppercase">
            YOUR OLD
            <br />
            TECH ISN&apos;T
            <br />
            WASTE YET.
          </h1>
        </div>

        {/* Intersecting object overlay */}
        <div className="relative z-10 w-[90%] max-w-4xl mt-12 md:mt-24 pointer-events-none">
          <Image
            src="/images/reloop-hero-isolated.jpg"
            alt="Worn industrial laptop"
            width={1200}
            height={800}
            className="w-full h-auto object-contain transform -rotate-2 hover:rotate-0 transition-transform duration-1000 ease-out"
            priority
          />

          {/* Technical annotations overlaid on the image context */}
          <div className="absolute top-[20%] left-[5%] md:-left-[10%] border-t border-vermilion pt-2 w-32 md:w-48 text-vermilion animate-fade-in z-20">
            <span className="label-mono block text-[0.6rem] md:text-xs">OBSERVED.WEAR</span>
            <span className="label-mono block text-[0.6rem] md:text-xs mt-1">SURFACE SCUFFS [CHAS_04]</span>
          </div>

          <div className="absolute bottom-[30%] right-[5%] md:-right-[10%] border-b border-graphite pb-2 w-32 md:w-48 text-graphite text-right animate-fade-up z-20">
            <span className="label-mono block text-[0.6rem] md:text-xs">INTERNAL.STATE</span>
            <span className="label-mono block text-[0.6rem] md:text-xs mt-1">PENDING INSPECTION</span>
          </div>
        </div>

        {/* Scroll prompt */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
          <span className="label-mono text-stone text-[0.65rem] tracking-widest uppercase">Scroll</span>
          <div className="w-[1px] h-12 bg-graphite/30" />
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
      <section className="py-32 px-6 md:px-12 border-t border-graphite/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 md:mb-32 flex flex-col md:flex-row justify-between items-end gap-8">
            <div>
              <span className="label-mono text-vermilion block mb-6 uppercase">03 / The Futures</span>
              <h2 className="display text-[clamp(3rem,7vw,6rem)] leading-[0.85] tracking-tighter uppercase max-w-4xl">
                Compare what comes next.
              </h2>
            </div>
            <p className="max-w-xs text-stone leading-relaxed">
              Every device has a different optimal path. We map six distinct possibilities based on hard evidence.
            </p>
          </div>

          {/* Editorial masonry grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">

            <div className="md:col-span-1 border-t-2 border-ink pt-6 flex flex-col">
              <span className="display text-6xl md:text-8xl text-ink/10 mb-4 leading-none">01</span>
              <h3 className="display text-3xl mb-4 uppercase">Repair</h3>
              <p className="text-stone flex-1">Isolate the failure. Replace only what is broken to restore full functionality.</p>
              <Wrench className="size-8 text-vermilion mt-8" />
            </div>

            <div className="md:col-span-1 border-t-2 border-graphite/20 pt-6 flex flex-col">
              <span className="display text-6xl md:text-8xl text-ink/10 mb-4 leading-none">02</span>
              <h3 className="display text-3xl mb-4 uppercase">Refurbish</h3>
              <p className="text-stone flex-1">Comprehensive overhaul. Upgrade memory, replace batteries, and clean for a second life.</p>
              <Battery className="size-8 text-ink mt-8" />
            </div>

            <div className="md:col-span-1 border-t-2 border-graphite/20 pt-6 flex flex-col">
              <span className="display text-6xl md:text-8xl text-ink/10 mb-4 leading-none">03</span>
              <h3 className="display text-3xl mb-4 uppercase">Reuse</h3>
              <p className="text-stone flex-1">Repurpose the device entirely. Turn an old tablet into a dashboard, or a phone into a camera.</p>
            </div>

            <div className="md:col-span-1 md:col-start-2 border-t-2 border-graphite/20 pt-6 flex flex-col">
              <span className="display text-6xl md:text-8xl text-ink/10 mb-4 leading-none">04</span>
              <h3 className="display text-3xl mb-4 uppercase">Donate</h3>
              <p className="text-stone flex-1">Still usable, just not for you. Wipe data and route to organizations that bridge the digital divide.</p>
              <ShieldCheck className="size-8 text-ink mt-8" />
            </div>

            <div className="md:col-span-1 border-t-2 border-graphite/20 pt-6 flex flex-col">
              <span className="display text-6xl md:text-8xl text-ink/10 mb-4 leading-none">05</span>
              <h3 className="display text-3xl mb-4 uppercase">Resell</h3>
              <p className="text-stone flex-1">Extract residual financial value while keeping the hardware in active circulation.</p>
            </div>

            <div className="md:col-span-1 md:col-start-3 border-t-2 border-vermilion pt-6 flex flex-col bg-vermilion/5 p-6 md:p-8 -mt-6">
              <span className="display text-6xl md:text-8xl text-vermilion/20 mb-4 leading-none">06</span>
              <h3 className="display text-3xl mb-4 text-vermilion uppercase">Recycle</h3>
              <p className="text-stone flex-1">The final resort. Safely extract rare earth metals and materials when the object is truly beyond repair.</p>
              <Recycle className="size-8 text-vermilion mt-8" />
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
