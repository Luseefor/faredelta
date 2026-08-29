import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

import { TrackedRoutesDashboard } from "@/components/tracked-routes-dashboard";
import { Button } from "@/components/ui/button";

export default function TrackedRoutesPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#102a2f]">
      <header className="bg-[#102f35] text-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-[#f2c94c] text-[#102f35]"><Plane className="size-4 -rotate-12" /></span><span className="text-xl font-semibold">FareDelta</span></Link>
          <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white"><Link href="/"><ArrowLeft />New search</Link></Button>
        </div>
      </header>
      <section className="border-b border-[#102f35]/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Your watchlist</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Tracked routes.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#102f35]/55">Save flexible searches in this browser and revisit their latest fares and growing price history.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><TrackedRoutesDashboard /></section>
    </main>
  );
}
