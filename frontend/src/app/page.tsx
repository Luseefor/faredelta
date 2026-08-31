import Link from "next/link";
import { ArrowUpRight, BarChart3, Bell, CalendarRange, Plane, ShieldCheck } from "lucide-react";

import { FlightSearchForm } from "@/components/flight-search-form";
import { InView } from "@/components/motion-primitives/in-view";
import { PremiumHero } from "@/components/premium-hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#102a2f]">
      <section className="relative overflow-hidden bg-[#102f35] text-white">
        <div className="hero-grid absolute inset-0 opacity-25" aria-hidden />
        <div className="absolute -right-36 top-32 size-[34rem] rounded-full border border-white/10" aria-hidden />
        <div className="absolute -right-16 top-52 size-80 rounded-full border border-white/10" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <header className="flex h-20 items-center justify-between border-b border-white/10">
            <Link href="/" className="flex items-center gap-3" aria-label="FareDelta home">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#f2c94c] text-[#102f35]">
                <Plane className="size-4 -rotate-12" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="text-xl font-semibold tracking-[-0.03em]">FareDelta</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/tracked" className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white"><Bell className="size-4" />Tracked routes</Link>
              <span className="hidden text-sm text-white/60 sm:inline">Built for flexible travelers</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">Private beta</span>
            </div>
          </header>

          <PremiumHero />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 max-w-7xl px-5 sm:px-8 lg:-mt-28 lg:px-10">
        <FlightSearchForm />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <InView
          once
          variants={{ hidden: { opacity: 0, y: 34 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          as="div"
        >
        <div className="grid gap-8 border-y border-[#102f35]/10 py-10 lg:grid-cols-[1.1fr_2fr] lg:gap-16 lg:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Why FareDelta</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">A better foundation for finding flights.</h2>
          </div>
          <div className="grid gap-7 sm:grid-cols-3">
            <Feature icon={CalendarRange} number="01" title="Flexible first">Explore departure and return windows from the start.</Feature>
            <Feature icon={BarChart3} number="02" title="History aware">Every fare becomes useful context for future decisions.</Feature>
            <Feature icon={ShieldCheck} number="03" title="No lock-in">One normalized model across airlines and providers.</Feature>
          </div>
        </div>
        </InView>

        <InView
          once
          variants={{ hidden: { opacity: 0, scale: 0.975 }, visible: { opacity: 1, scale: 1 } }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          as="div"
        >
        <div className="mt-16 flex flex-col gap-5 rounded-3xl bg-[#dce8e5] p-7 shadow-[0_26px_70px_-45px_rgba(16,47,53,.55)] sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <p className="text-sm font-semibold text-[#1b6566]">The next layer of airfare intelligence</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Price matrices, tracking, and BUY or WAIT signals are on the way.</h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#102f35]">Built into the architecture <ArrowUpRight className="size-4" aria-hidden /></span>
        </div>
        </InView>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, number, title, children }: { icon: typeof CalendarRange; number: string; title: string; children: React.ReactNode }) {
  return (
    <article>
      <div className="flex items-center justify-between border-b border-[#102f35]/10 pb-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-[#dce8e5] text-[#1b6566]"><Icon className="size-4" aria-hidden /></span>
        <span className="font-mono text-xs text-[#102f35]/35">{number}</span>
      </div>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#102f35]/60">{children}</p>
    </article>
  );
}
