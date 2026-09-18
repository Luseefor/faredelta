import { ExploreBrowser } from "@/components/explore-browser";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = {
  title: "Explore cheap fares",
  description: "Cheapest recently observed destinations from any origin airport.",
};

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#102a2f]">
      <SiteHeader />
      <section className="border-b border-[#102f35]/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Where is cheap?</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Explore fares.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#102f35]/55">The cheapest observed destinations from your origin. Pick one to run a full flexible search.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><ExploreBrowser /></section>
      <SiteFooter />
    </main>
  );
}
