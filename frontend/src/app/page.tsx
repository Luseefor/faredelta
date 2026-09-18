import { ArrowUpRight, BarChart3, CalendarRange, ShieldCheck } from "lucide-react";

import { FlightSearchForm } from "@/components/flight-search-form";
import { PremiumHero } from "@/components/premium-hero";
import { RecentSearches } from "@/components/recent-searches";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#102a2f]">
      <SiteHeader
        actions={
          <span className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 sm:inline">Private beta</span>
        }
      />
      <section className="relative overflow-hidden bg-[#102f35] text-white">
        <div className="hero-grid absolute inset-0 opacity-25" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <PremiumHero />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-14 max-w-7xl px-4 sm:px-8 lg:-mt-20 lg:px-10">
        <FlightSearchForm />
      </section>

      <RecentSearches />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
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

        <div className="mt-16 flex flex-col gap-5 rounded-3xl bg-[#dce8e5] p-7 shadow-[0_26px_70px_-45px_rgba(16,47,53,.55)] sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <p className="text-sm font-semibold text-[#1b6566]">The next layer of airfare intelligence</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Every search makes your next fare decision more informed.</h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#102f35]">Built into the architecture <ArrowUpRight className="size-4" aria-hidden /></span>
        </div>
      </section>
      <SiteFooter />
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
