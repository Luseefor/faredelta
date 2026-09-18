import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TrackedRouteDetail } from "@/components/tracked-route-detail";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";

export default async function TrackedRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#102a2f]">
      <SiteHeader
        actions={
          <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white"><Link href="/tracked"><ArrowLeft />Watchlist</Link></Button>
        }
      />
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><TrackedRouteDetail id={id} /></section>
      <SiteFooter />
    </main>
  );
}
