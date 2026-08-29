import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

import { FlightResults } from "@/components/flight-results";
import { Button } from "@/components/ui/button";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#102a2f]">
      <header className="bg-[#102f35] text-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-[#f2c94c] text-[#102f35]"><Plane className="size-4 -rotate-12" strokeWidth={2.5} aria-hidden /></span><span className="text-xl font-semibold tracking-[-0.03em]">FareDelta</span></Link>
          <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white"><Link href="/"><ArrowLeft className="size-4" aria-hidden />Modify search</Link></Button>
        </div>
      </header>
      <div className="border-b border-[#102f35]/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Flexible-date search</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Flights worth comparing.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#102f35]/55">Normalized options across your date window, ranked to make the tradeoffs easy to see.</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><FlightResults searchParams={params} /></div>
    </main>
  );
}
