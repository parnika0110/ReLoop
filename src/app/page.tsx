import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NEXT_LIVES = [
  { id: "Repair", desc: "Restore to working condition." },
  { id: "Refurbish", desc: "Deep overhaul and update." },
  { id: "Reuse", desc: "Pass to someone who needs it." },
  { id: "Donate", desc: "Give to an organization." },
  { id: "Resell", desc: "Trade in for value." },
  { id: "Recycle", desc: "Extract raw materials safely." },
];

export default function LandingPage() {
  return (
    <div className="landing-theme min-h-screen bg-paper text-ink font-sans selection:bg-vermilion selection:text-paper">

      {/* CHAPTER 01: Hero */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 md:px-12 py-20 overflow-hidden border-b border-graphite/20">
        <header className="absolute top-6 left-6 md:left-12 z-20">
          <span className="label-mono text-ink">RELOOP</span>
        </header>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start pt-12 md:pt-0">
            <h1 className="text-[clamp(3.5rem,8vw,8rem)] leading-[0.85] tracking-tighter font-medium uppercase text-ink text-balance">
              Your old tech isn’t <br/><span className="text-stone">waste</span> yet.
            </h1>
            <p className="mt-8 text-xl md:text-2xl text-stone max-w-md">
              Assess what remains. Compare what comes next.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Link href="/scan">
                <Button size="lg" className="bg-ink text-paper hover:bg-graphite rounded-none h-14 px-8 text-sm tracking-widest uppercase">
                  Find its next life
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="/scan?sample=1">
                <Button variant="outline" size="lg" className="border-graphite text-ink hover:bg-graphite/5 rounded-none h-14 px-8 text-sm tracking-widest uppercase">
                  <Sparkles className="mr-2 size-4" />
                  Try a sample device
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 xl:col-span-5 relative mt-16 lg:mt-0 group">
             {/* Specimen Tag */}
             <div className="absolute -left-4 md:-left-12 top-0 z-20 flex flex-col gap-1 label-mono text-stone">
               <span>ID: SP-048</span>
               <span>COND: UNKNOWN</span>
             </div>

             {/* Hero Image */}
             <div className="relative z-10 bg-secondary-paper p-4 md:p-8 aspect-[4/3] md:aspect-auto">
                <Image
                  src="/images/reloop-hero-laptop.jpg"
                  alt="A used laptop waiting for its next life"
                  width={1024}
                  height={1024}
                  className="w-full h-auto object-cover grayscale contrast-125 transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:translate-x-2"
                />

                {/* Leader line overlay (restrained) */}
                <div className="absolute right-[20%] top-[40%] hidden md:block">
                  <div className="relative">
                    <div className="absolute top-0 right-0 w-32 h-[1px] bg-vermilion origin-right animate-leader-draw" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-none bg-vermilion" />
                    <span className="absolute top-2 right-34 label-mono text-vermilion whitespace-nowrap">OBSERVED.WEAR</span>
                  </div>
                </div>
             </div>

             {/* Pathway Strip */}
             <div className="absolute -bottom-6 -right-2 md:-right-6 z-20 bg-paper border border-graphite/20 p-4 shadow-xl">
                <ol className="flex flex-wrap md:flex-col gap-x-4 gap-y-2 label-mono text-stone">
                  {NEXT_LIVES.map((life, i) => (
                    <li key={life.id} className="flex items-center gap-2">
                      <span className="text-graphite/30" aria-hidden>0{i + 1}</span>
                      <span className="uppercase text-ink">{life.id}</span>
                    </li>
                  ))}
                </ol>
             </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 02: What we can see. What we can't. */}
      <section className="px-6 md:px-12 py-24 border-b border-graphite/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-ink uppercase text-balance">
              What we can see.<br/>What we can&apos;t.
            </h2>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8 text-stone">
            <div>
              <h3 className="label-mono text-ink mb-3">Observed in the photo</h3>
              <p>We analyze the outer silhouette, visible ports, screen condition, and casing wear to determine the device&apos;s physical footprint and exterior state.</p>
            </div>
            <div>
              <h3 className="label-mono text-ink mb-3">Reported by you</h3>
              <p>Your inputs guide the engine. We rely on your assessment of functional issues, battery life, and age to narrow down the potential pathways.</p>
            </div>
            <div className="sm:col-span-2 border-t border-graphite/20 pt-6 mt-2">
              <h3 className="label-mono text-ink mb-3">Needs physical inspection</h3>
              <p className="max-w-2xl">The engine estimates next-life viability, but true internal component health—like motherboard corrosion or thermal degradation—can never be presented as a fact without a hands-on physical inspection. RELOOP provides the map, not the final diagnostic.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 03: Six possible futures (Specimen Plate) */}
      <section className="px-6 md:px-12 py-24 bg-secondary-paper border-b border-graphite/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-ink uppercase mb-16 text-center">
            Six possible futures
          </h2>

          {/* Desktop/Tablet: Specimen Plate with Grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {NEXT_LIVES.map((life, i) => (
              <div key={life.id} className="relative flex flex-col group">
                <div className="absolute -top-3 -left-3 text-6xl font-medium text-graphite/5 transition-colors duration-500 group-hover:text-vermilion/10" aria-hidden>
                  0{i + 1}
                </div>
                <div className="z-10 pt-4 border-t-2 border-graphite transition-colors duration-300 group-hover:border-vermilion">
                  <h3 className="text-xl uppercase font-medium text-ink mb-2">{life.id}</h3>
                  <p className="text-stone">{life.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: Stacked list */}
          <ol className="md:hidden flex flex-col gap-8">
            {NEXT_LIVES.map((life, i) => (
              <li key={life.id} className="flex gap-4 border-l-2 border-graphite pl-4 py-2">
                <div className="text-stone font-mono text-sm pt-1" aria-hidden>0{i + 1}</div>
                <div>
                  <h3 className="text-lg uppercase font-medium text-ink mb-1">{life.id}</h3>
                  <p className="text-stone text-sm">{life.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CHAPTER 04: The decision */}
      <section className="bg-graphite text-paper px-6 md:px-12 py-32 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <p className="label-mono text-stone mb-8 flex gap-4 justify-center">
            <span className="line-through">the drawer:</span>
            <span className="text-vermilion">the decision:</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-md mx-auto">
            <Link href="/scan" className="w-full">
              <Button size="lg" className="w-full bg-vermilion text-ink hover:bg-vermilion/90 rounded-none h-14 text-sm tracking-widest uppercase">
                Find its next life
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/scan?sample=1" className="w-full">
              <Button variant="outline" size="lg" className="w-full border-stone text-paper hover:bg-stone/20 rounded-none h-14 text-sm tracking-widest uppercase">
                <Sparkles className="mr-2 size-4" />
                Try a sample device
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
