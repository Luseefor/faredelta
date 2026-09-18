import Link from "next/link";
import { CloudOff } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f6f3ec] text-[#102a2f]">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <Card className="w-full border-white/5 bg-card/85">
          <CardContent className="flex flex-col items-center p-10">
            <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-[#102f35] text-[#f2c94c]">
              <CloudOff className="size-6" aria-hidden />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Off the flight plan</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">This page didn&apos;t take off.</h1>
            <p className="mt-3 text-sm leading-6 text-[#102f35]/55">
              The link may be old, or the page moved. Your tracked routes and alerts are safe — pick up where you left off.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <Button asChild><Link href="/">Search flights</Link></Button>
              <Button asChild variant="secondary"><Link href="/tracked">Watchlist</Link></Button>
              <Button asChild variant="ghost"><Link href="/explore">Explore fares</Link></Button>
            </div>
          </CardContent>
        </Card>
      </section>
      <SiteFooter />
    </main>
  );
}
